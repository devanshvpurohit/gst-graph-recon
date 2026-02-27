"""
GST Reconciliation Engine — Graph Traversal Validation

All reconciliation logic uses Cypher graph traversal queries.
NO SQL joins. This is the core design principle.
"""

from app.database import get_session


def validate_itc_chain(buyer_gstin: str, period: str) -> list[dict]:
    """
    Multi-hop ITC validation via graph traversal:
    
    Path 1: Supplier → GSTR1 → Invoice → IRN
    Path 2: Invoice → GSTR2B → Buyer  
    Path 3: Buyer → GSTR3B → LedgerEntry
    
    Returns structured reconciliation results for each invoice.
    """
    results = []
    
    with get_session() as session:
        # Find all invoices reflected in buyer's GSTR-2B for this period
        query = """
        MATCH (buyer:Taxpayer {gstin: $buyerGstin})-[:FILES]->(gstr2b:Return {type: 'GSTR2B', period: $period})
        MATCH (inv:Invoice)-[:REFLECTED_IN]->(gstr2b)
        
        // Traverse to supplier's GSTR-1
        OPTIONAL MATCH (supplier:Taxpayer {gstin: inv.supplierGstin})-[:FILES]->(gstr1:Return {type: 'GSTR1', period: $period})-[:DECLARES]->(gstr1_inv:Invoice {invoiceNo: inv.invoiceNo})
        
        // Check for IRN
        OPTIONAL MATCH (inv)-[:HAS_IRN]->(irn:IRN)
        
        // Check buyer's GSTR-3B claim
        OPTIONAL MATCH (buyer)-[:CLAIMED_ITC]->(gstr3b:Return {type: 'GSTR3B', period: $period})
        OPTIONAL MATCH (gstr3b)-[:OFFSET_BY]->(ledger:LedgerEntry)
        
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.buyerGstin AS buyerGstin,
               inv.taxableValue AS taxableValue,
               inv.gstAmount AS gstAmount,
               supplier.name AS supplierName,
               gstr1.status AS gstr1Status,
               gstr1_inv.taxableValue AS gstr1TaxableValue,
               gstr1_inv.gstAmount AS gstr1GstAmount,
               irn.irnHash AS irnHash,
               irn.status AS irnStatus,
               gstr3b.status AS gstr3bStatus,
               ledger.amount AS ledgerAmount,
               ledger.mode AS ledgerMode
        """
        
        records = session.run(query, buyerGstin=buyer_gstin, period=period)
        
        for record in records:
            result = _evaluate_invoice(record)
            results.append(result)
    
    # Also find invoices in purchase register NOT in GSTR-2B
    additional = _find_unreflected_invoices(buyer_gstin, period)
    results.extend(additional)
    
    return results


def _evaluate_invoice(record) -> dict:
    """Evaluate a single invoice against the full ITC chain."""
    root_causes = []
    risk_level = "LOW"
    status = "VALID"
    details = []
    
    invoice_no = record["invoiceNo"]
    supplier_gstin = record["supplierGstin"]
    buyer_gstin = record["buyerGstin"]
    
    # Check 1: GSTR-1 filing by supplier
    if record["gstr1Status"] is None:
        root_causes.append("Supplier has not filed GSTR-1 for this period")
        details.append({
            "field": "gstr1_filing",
            "expected": "FILED",
            "actual": "NOT_FOUND",
            "description": "No GSTR-1 return found for supplier in this period",
        })
        risk_level = "HIGH"
        status = "MISMATCH"
    elif record["gstr1Status"] == "LATE":
        root_causes.append("Supplier filed GSTR-1 late")
        details.append({
            "field": "gstr1_filing",
            "expected": "FILED",
            "actual": "LATE",
            "description": "Supplier's GSTR-1 was filed after the due date",
        })
        if risk_level != "HIGH":
            risk_level = "MEDIUM"
    
    # Check 2: Invoice value match between GSTR-1 and GSTR-2B
    if record["gstr1TaxableValue"] is not None:
        gstr1_val = record["gstr1TaxableValue"]
        gstr2b_val = record["taxableValue"]
        if abs(gstr1_val - gstr2b_val) > 1.0:  # ₹1 tolerance
            root_causes.append(
                f"Taxable value mismatch: GSTR-1={gstr1_val}, GSTR-2B={gstr2b_val}"
            )
            details.append({
                "field": "taxableValue",
                "expected": str(gstr1_val),
                "actual": str(gstr2b_val),
                "description": "Taxable value differs between GSTR-1 and GSTR-2B",
            })
            status = "MISMATCH"
            if risk_level == "LOW":
                risk_level = "MEDIUM"
        
        # GST amount match
        if record["gstr1GstAmount"] is not None:
            gstr1_gst = record["gstr1GstAmount"]
            gstr2b_gst = record["gstAmount"]
            if abs(gstr1_gst - gstr2b_gst) > 1.0:
                root_causes.append(
                    f"GST amount mismatch: GSTR-1={gstr1_gst}, GSTR-2B={gstr2b_gst}"
                )
                details.append({
                    "field": "gstAmount",
                    "expected": str(gstr1_gst),
                    "actual": str(gstr2b_gst),
                    "description": "GST amount differs between GSTR-1 and GSTR-2B",
                })
                status = "MISMATCH"
                risk_level = "HIGH"
    
    # Check 3: IRN existence and status
    if record["irnHash"] is None:
        root_causes.append("No IRN generated for this invoice")
        details.append({
            "field": "irn",
            "expected": "ACTIVE",
            "actual": "NOT_FOUND",
            "description": "Invoice does not have an associated IRN",
        })
        status = "MISMATCH"
        if risk_level == "LOW":
            risk_level = "MEDIUM"
    elif record["irnStatus"] == "CANCELLED":
        root_causes.append("IRN has been cancelled")
        details.append({
            "field": "irn_status",
            "expected": "ACTIVE",
            "actual": "CANCELLED",
            "description": "The IRN associated with this invoice is cancelled",
        })
        status = "MISMATCH"
        risk_level = "HIGH"
    
    # Check 4: GSTR-3B filing
    if record["gstr3bStatus"] is None:
        root_causes.append("Buyer has not filed GSTR-3B for this period")
        details.append({
            "field": "gstr3b_filing",
            "expected": "FILED",
            "actual": "NOT_FOUND",
            "description": "No GSTR-3B return found for buyer in this period",
        })
        if risk_level != "HIGH":
            risk_level = "MEDIUM"
    
    return {
        "invoiceNo": invoice_no,
        "supplierGSTIN": supplier_gstin,
        "buyerGSTIN": buyer_gstin,
        "status": status,
        "riskLevel": risk_level,
        "rootCause": root_causes,
        "details": details,
    }


def _find_unreflected_invoices(buyer_gstin: str, period: str) -> list[dict]:
    """Find invoices that exist in supplier GSTR-1 but NOT reflected in buyer's GSTR-2B."""
    results = []
    
    with get_session() as session:
        query = """
        MATCH (inv:Invoice {buyerGstin: $buyerGstin})
        WHERE NOT EXISTS {
            MATCH (inv)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B', period: $period})
        }
        AND EXISTS {
            MATCH (:Return {type: 'GSTR1', period: $period})-[:DECLARES]->(inv)
        }
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.buyerGstin AS buyerGstin,
               inv.taxableValue AS taxableValue,
               inv.gstAmount AS gstAmount
        """
        records = session.run(query, buyerGstin=buyer_gstin, period=period)
        
        for record in records:
            results.append({
                "invoiceNo": record["invoiceNo"],
                "supplierGSTIN": record["supplierGstin"],
                "buyerGSTIN": record["buyerGstin"],
                "status": "MISMATCH",
                "riskLevel": "MEDIUM",
                "rootCause": [
                    "Invoice declared in supplier GSTR-1 but not reflected in GSTR-2B"
                ],
                "details": [{
                    "field": "gstr2b_reflection",
                    "expected": "REFLECTED",
                    "actual": "NOT_FOUND",
                    "description": "Invoice exists in GSTR-1 but missing from GSTR-2B",
                }],
            })
    
    return results


def detect_missing_gstr1() -> list[dict]:
    """Find all invoices in GSTR-2B that have no corresponding GSTR-1 declaration."""
    with get_session() as session:
        query = """
        MATCH (inv:Invoice)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
        WHERE NOT EXISTS {
            MATCH (:Return {type: 'GSTR1'})-[:DECLARES]->(inv)
        }
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.buyerGstin AS buyerGstin,
               inv.taxableValue AS taxableValue,
               inv.gstAmount AS gstAmount
        """
        records = session.run(query)
        return [
            {
                "invoiceNo": r["invoiceNo"],
                "supplierGSTIN": r["supplierGstin"],
                "buyerGSTIN": r["buyerGstin"],
                "issue": "MISSING_GSTR1",
                "taxableValue": r["taxableValue"],
                "gstAmount": r["gstAmount"],
            }
            for r in records
        ]


def detect_irn_mismatch() -> list[dict]:
    """Find invoices without valid IRN or with cancelled IRN."""
    with get_session() as session:
        query = """
        MATCH (inv:Invoice)
        OPTIONAL MATCH (inv)-[:HAS_IRN]->(irn:IRN)
        WHERE irn IS NULL OR irn.status <> 'ACTIVE'
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.buyerGstin AS buyerGstin,
               irn.status AS irnStatus,
               irn.irnHash AS irnHash
        """
        records = session.run(query)
        return [
            {
                "invoiceNo": r["invoiceNo"],
                "supplierGSTIN": r["supplierGstin"],
                "issue": "IRN_" + ("MISSING" if r["irnStatus"] is None else r["irnStatus"]),
                "irnHash": r["irnHash"],
            }
            for r in records
        ]


def detect_value_mismatch() -> list[dict]:
    """Find invoices where values differ between GSTR-1 and GSTR-2B declarations."""
    with get_session() as session:
        query = """
        MATCH (gstr1:Return {type: 'GSTR1'})-[:DECLARES]->(inv:Invoice)
        MATCH (inv)-[:REFLECTED_IN]->(gstr2b:Return {type: 'GSTR2B'})
        WITH inv, gstr1, gstr2b
        
        // Get GSTR-1 declared values
        MATCH (gstr1)-[:DECLARES]->(gstr1_inv:Invoice {invoiceNo: inv.invoiceNo})
        
        WHERE abs(inv.taxableValue - gstr1_inv.taxableValue) > 1.0
           OR abs(inv.gstAmount - gstr1_inv.gstAmount) > 1.0
        
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.taxableValue AS gstr2bValue,
               gstr1_inv.taxableValue AS gstr1Value,
               inv.gstAmount AS gstr2bGst,
               gstr1_inv.gstAmount AS gstr1Gst
        """
        records = session.run(query)
        return [
            {
                "invoiceNo": r["invoiceNo"],
                "supplierGSTIN": r["supplierGstin"],
                "issue": "VALUE_MISMATCH",
                "gstr1Value": r["gstr1Value"],
                "gstr2bValue": r["gstr2bValue"],
                "gstr1Gst": r["gstr1Gst"],
                "gstr2bGst": r["gstr2bGst"],
            }
            for r in records
        ]


def classify_risk(invoice_no: str) -> dict:
    """Classify risk for a single invoice by traversing its full graph path."""
    with get_session() as session:
        query = """
        MATCH (inv:Invoice {invoiceNo: $invoiceNo})
        
        OPTIONAL MATCH (:Return {type: 'GSTR1'})-[:DECLARES]->(inv)
        WITH inv, count(*) > 0 AS hasGstr1
        
        OPTIONAL MATCH (inv)-[:HAS_IRN]->(irn:IRN)
        WITH inv, hasGstr1, irn
        
        OPTIONAL MATCH (inv)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
        WITH inv, hasGstr1, irn, count(*) > 0 AS inGstr2b
        
        RETURN inv.invoiceNo AS invoiceNo,
               inv.supplierGstin AS supplierGstin,
               inv.gstAmount AS gstAmount,
               hasGstr1,
               irn.status AS irnStatus,
               inGstr2b
        """
        record = session.run(query, invoiceNo=invoice_no).single()
        
        if record is None:
            return {"invoiceNo": invoice_no, "error": "Invoice not found"}
        
        risk_score = 0
        factors = []
        
        if not record["hasGstr1"]:
            risk_score += 40
            factors.append("Missing GSTR-1 declaration")
        
        if record["irnStatus"] is None:
            risk_score += 25
            factors.append("No IRN generated")
        elif record["irnStatus"] == "CANCELLED":
            risk_score += 35
            factors.append("IRN cancelled")
        
        if not record["inGstr2b"]:
            risk_score += 20
            factors.append("Not reflected in GSTR-2B")
        
        if risk_score >= 50:
            level = "HIGH"
        elif risk_score >= 25:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return {
            "invoiceNo": record["invoiceNo"],
            "supplierGSTIN": record["supplierGstin"],
            "riskScore": risk_score,
            "riskLevel": level,
            "factors": factors,
            "gstAmount": record["gstAmount"],
        }


def get_dashboard_summary() -> dict:
    """Aggregate reconciliation data for the dashboard."""
    with get_session() as session:
        # Total ITC
        result = session.run("""
            MATCH (inv:Invoice)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
            RETURN sum(inv.gstAmount) AS totalITC, count(inv) AS totalInvoices
        """).single()
        total_itc = result["totalITC"] or 0
        total_invoices = result["totalInvoices"] or 0
        
        # Eligible ITC (has GSTR-1 + IRN)
        result = session.run("""
            MATCH (inv:Invoice)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
            WHERE EXISTS { MATCH (:Return {type: 'GSTR1'})-[:DECLARES]->(inv) }
            AND EXISTS { MATCH (inv)-[:HAS_IRN]->(:IRN {status: 'ACTIVE'}) }
            RETURN sum(inv.gstAmount) AS eligibleITC, count(inv) AS matchedCount
        """).single()
        eligible_itc = result["eligibleITC"] or 0
        matched = result["matchedCount"] or 0
        
        # High risk ITC
        result = session.run("""
            MATCH (inv:Invoice)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
            WHERE NOT EXISTS { MATCH (:Return {type: 'GSTR1'})-[:DECLARES]->(inv) }
            OR NOT EXISTS { MATCH (inv)-[:HAS_IRN]->(:IRN {status: 'ACTIVE'}) }
            RETURN sum(inv.gstAmount) AS highRiskITC
        """).single()
        high_risk_itc = result["highRiskITC"] or 0
        
        # Risk distribution
        result = session.run("""
            MATCH (t:Taxpayer)
            WHERE t.riskScore IS NOT NULL
            RETURN 
                count(CASE WHEN t.riskScore < 0.3 THEN 1 END) AS low,
                count(CASE WHEN t.riskScore >= 0.3 AND t.riskScore < 0.7 THEN 1 END) AS medium,
                count(CASE WHEN t.riskScore >= 0.7 THEN 1 END) AS high
        """).single()
        
        # Top risky vendors
        risky_vendors = session.run("""
            MATCH (t:Taxpayer)
            WHERE t.riskScore > 0
            RETURN t.gstin AS gstin, t.name AS name, t.riskScore AS riskScore
            ORDER BY t.riskScore DESC
            LIMIT 10
        """)
        
        # Mismatch categories
        missing_gstr1 = session.run("""
            MATCH (inv:Invoice)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'})
            WHERE NOT EXISTS { MATCH (:Return {type: 'GSTR1'})-[:DECLARES]->(inv) }
            RETURN count(inv) AS count
        """).single()["count"]
        
        irn_issues = session.run("""
            MATCH (inv:Invoice)
            WHERE NOT EXISTS { MATCH (inv)-[:HAS_IRN]->(:IRN {status: 'ACTIVE'}) }
            RETURN count(inv) AS count
        """).single()["count"]
        
        return {
            "totalITC": total_itc,
            "eligibleITC": eligible_itc,
            "highRiskITC": high_risk_itc,
            "totalInvoices": total_invoices,
            "matchedInvoices": matched,
            "mismatchedInvoices": total_invoices - matched,
            "riskDistribution": {
                "low": result["low"] or 0,
                "medium": result["medium"] or 0,
                "high": result["high"] or 0,
            },
            "topRiskyVendors": [
                {"gstin": r["gstin"], "name": r["name"], "riskScore": r["riskScore"]}
                for r in risky_vendors
            ],
            "mismatchCategories": {
                "missingGSTR1": missing_gstr1,
                "irnIssues": irn_issues,
                "valueMismatch": 0,  # computed separately
            },
        }
