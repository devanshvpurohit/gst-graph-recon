"""
Explainable Audit Engine

Generates natural-language explanations for invoice reconciliation results.
Produces:
- Structured JSON reasoning
- Plain English explanation
- Recommended actions
"""

from app.database import get_session


def generate_audit_trail(invoice_no: str) -> dict:
    """
    Generate a comprehensive audit trail for an invoice by traversing 
    its full graph path and generating explanations.
    """
    with get_session() as session:
        # Traverse the complete graph path for this invoice
        query = """
        MATCH (inv:Invoice {invoiceNo: $invoiceNo})
        
        // Supplier path
        OPTIONAL MATCH (supplier:Taxpayer {gstin: inv.supplierGstin})
        OPTIONAL MATCH (supplier)-[:FILES]->(gstr1:Return {type: 'GSTR1'})-[:DECLARES]->(inv)
        
        // IRN path
        OPTIONAL MATCH (inv)-[:HAS_IRN]->(irn:IRN)
        
        // Buyer path
        OPTIONAL MATCH (buyer:Taxpayer {gstin: inv.buyerGstin})
        OPTIONAL MATCH (inv)-[:REFLECTED_IN]->(gstr2b:Return {type: 'GSTR2B'})
        
        // GSTR-3B and ledger path
        OPTIONAL MATCH (buyer)-[:CLAIMED_ITC]->(gstr3b:Return {type: 'GSTR3B'})
        OPTIONAL MATCH (gstr3b)-[:OFFSET_BY]->(ledger:LedgerEntry)
        
        RETURN inv, supplier, gstr1, irn, buyer, gstr2b, gstr3b, ledger
        """
        
        record = session.run(query, invoiceNo=invoice_no).single()
        
        if record is None:
            return {
                "invoiceNo": invoice_no,
                "error": "Invoice not found in the knowledge graph",
            }
        
        inv = record["inv"]
        supplier = record["supplier"]
        gstr1 = record["gstr1"]
        irn = record["irn"]
        buyer = record["buyer"]
        gstr2b = record["gstr2b"]
        gstr3b = record["gstr3b"]
        ledger = record["ledger"]
        
        # Build structured reasoning
        reasoning = []
        issues = []
        actions = []
        
        # Step 1: Supplier verification
        if supplier:
            reasoning.append({
                "step": 1,
                "check": "Supplier Identity",
                "status": "PASS",
                "detail": f"Supplier {supplier['name']} (GSTIN: {supplier['gstin']}) is registered",
            })
        else:
            reasoning.append({
                "step": 1,
                "check": "Supplier Identity",
                "status": "FAIL",
                "detail": f"Supplier GSTIN {inv['supplierGstin']} not found in registry",
            })
            issues.append("unregistered_supplier")
            actions.append("Verify supplier GSTIN with GST portal")
        
        # Step 2: GSTR-1 filing
        if gstr1:
            status = gstr1.get("status", "UNKNOWN")
            reasoning.append({
                "step": 2,
                "check": "GSTR-1 Filing",
                "status": "PASS" if status == "FILED" else "WARNING",
                "detail": f"Supplier's GSTR-1 status: {status}",
            })
            if status == "LATE":
                issues.append("late_gstr1")
                actions.append("Note late filing for compliance tracking")
        else:
            reasoning.append({
                "step": 2,
                "check": "GSTR-1 Filing",
                "status": "FAIL",
                "detail": "Supplier has not filed GSTR-1 for this period",
            })
            issues.append("missing_gstr1")
            actions.append("Contact supplier to file GSTR-1")
            actions.append("Consider ITC reversal if not filed within due date")
        
        # Step 3: IRN verification
        if irn:
            irn_status = irn.get("status", "UNKNOWN")
            if irn_status == "ACTIVE":
                reasoning.append({
                    "step": 3,
                    "check": "IRN Verification",
                    "status": "PASS",
                    "detail": f"Valid IRN found: {irn['irnHash'][:20]}...",
                })
            else:
                reasoning.append({
                    "step": 3,
                    "check": "IRN Verification",
                    "status": "FAIL",
                    "detail": f"IRN status is {irn_status}",
                })
                issues.append("irn_cancelled")
                actions.append("Investigate IRN cancellation reason")
        else:
            reasoning.append({
                "step": 3,
                "check": "IRN Verification",
                "status": "FAIL",
                "detail": "No IRN generated for this invoice",
            })
            issues.append("missing_irn")
            actions.append("Request supplier to generate IRN via e-invoice portal")
        
        # Step 4: GSTR-2B reflection
        if gstr2b:
            reasoning.append({
                "step": 4,
                "check": "GSTR-2B Reflection",
                "status": "PASS",
                "detail": "Invoice is reflected in buyer's GSTR-2B",
            })
        else:
            reasoning.append({
                "step": 4,
                "check": "GSTR-2B Reflection",
                "status": "FAIL",
                "detail": "Invoice not found in buyer's GSTR-2B",
            })
            issues.append("not_in_gstr2b")
            actions.append("Wait for next GSTR-2B cycle or contact GSTN helpdesk")
        
        # Step 5: GSTR-3B claim
        if gstr3b:
            reasoning.append({
                "step": 5,
                "check": "GSTR-3B ITC Claim",
                "status": "PASS",
                "detail": "Buyer has filed GSTR-3B for this period",
            })
        else:
            reasoning.append({
                "step": 5,
                "check": "GSTR-3B ITC Claim",
                "status": "WARNING",
                "detail": "GSTR-3B not yet filed for this period",
            })
        
        # Step 6: Ledger offset
        if ledger:
            reasoning.append({
                "step": 6,
                "check": "Ledger Offset",
                "status": "PASS",
                "detail": f"Tax offset via {ledger.get('mode', 'UNKNOWN')} ledger: ₹{ledger.get('amount', 0):,.2f}",
            })
        else:
            if gstr3b:
                reasoning.append({
                    "step": 6,
                    "check": "Ledger Offset",
                    "status": "WARNING",
                    "detail": "No ledger entry found for tax offset",
                })
        
        # Determine overall risk level
        if "missing_gstr1" in issues or "irn_cancelled" in issues:
            risk_level = "HIGH"
        elif "missing_irn" in issues or "late_gstr1" in issues or "not_in_gstr2b" in issues:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # Generate plain English explanation
        plain_english = _generate_explanation(
            inv, supplier, gstr1, irn, gstr2b, gstr3b, issues, risk_level
        )
        
        return {
            "invoiceNo": invoice_no,
            "supplierGSTIN": inv["supplierGstin"],
            "buyerGSTIN": inv["buyerGstin"],
            "structuredReasoning": reasoning,
            "plainEnglish": plain_english,
            "recommendedActions": actions if actions else ["No action required. All checks passed."],
            "riskLevel": risk_level,
        }


def _generate_explanation(inv, supplier, gstr1, irn, gstr2b, gstr3b, issues, risk_level) -> str:
    """Generate a natural language explanation of the audit findings."""
    supplier_name = supplier["name"] if supplier else "Unknown Supplier"
    supplier_gstin = inv["supplierGstin"]
    buyer_gstin = inv["buyerGstin"]
    invoice_no = inv["invoiceNo"]
    gst_amount = inv.get("gstAmount", 0)
    
    parts = [
        f"Invoice {invoice_no} from {supplier_name} (GSTIN {supplier_gstin}) "
        f"for ₹{gst_amount:,.2f} GST was reviewed."
    ]
    
    if not issues:
        parts.append(
            "All validation checks passed. The ITC chain is complete: "
            "GSTR-1 filed, IRN active, reflected in GSTR-2B, and GSTR-3B filed."
        )
    else:
        issue_descriptions = {
            "missing_gstr1": f"The supplier has NOT filed GSTR-1, making ITC ineligible.",
            "late_gstr1": "The supplier filed GSTR-1 late.",
            "missing_irn": "No IRN (Invoice Registration Number) exists for this invoice.",
            "irn_cancelled": "The IRN for this invoice has been CANCELLED.",
            "not_in_gstr2b": "The invoice is not reflected in the buyer's GSTR-2B.",
            "unregistered_supplier": "The supplier GSTIN is not found in the registry.",
        }
        
        for issue in issues:
            if issue in issue_descriptions:
                parts.append(issue_descriptions[issue])
    
    parts.append(f"Risk classified as {risk_level}.")
    
    return " ".join(parts)
