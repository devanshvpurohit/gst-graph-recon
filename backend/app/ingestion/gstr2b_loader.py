"""GSTR-2B data loader — buyer auto-populated return ingestion."""

from app.database import get_session


def ingest_gstr2b(data: dict) -> dict:
    """
    Parse GSTR-2B JSON payload and create/update:
    - Taxpayer (buyer)
    - Return (GSTR2B)
    - REFLECTED_IN edges from Invoice -> GSTR2B Return
    """
    buyer = data["buyer"]
    returns_info = data["returns_info"]
    invoices = data["invoices"]
    
    stats = {"taxpayers_merged": 0, "returns_merged": 0, "invoices_linked": 0}
    
    with get_session() as session:
        # MERGE buyer taxpayer
        session.run(
            """
            MERGE (t:Taxpayer {gstin: $gstin})
            ON CREATE SET t.pan = $pan, t.name = $name, t.state = $state, t.riskScore = 0.0
            ON MATCH SET t.pan = $pan, t.name = $name, t.state = $state
            """,
            gstin=buyer["gstin"],
            pan=buyer["pan"],
            name=buyer["name"],
            state=buyer["state"],
        )
        stats["taxpayers_merged"] = 1
        
        # MERGE GSTR2B return
        return_id = f"{buyer['gstin']}_GSTR2B_{returns_info['period']}"
        session.run(
            """
            MERGE (r:Return {id: $id})
            ON CREATE SET r.type = 'GSTR2B', r.period = $period,
                          r.status = $status, r.filingDate = $filingDate, r.gstin = $gstin
            ON MATCH SET r.status = $status, r.filingDate = $filingDate
            """,
            id=return_id,
            period=returns_info["period"],
            status=returns_info["status"],
            filingDate=returns_info.get("filingDate"),
            gstin=buyer["gstin"],
        )
        stats["returns_merged"] = 1
        
        # FILES relationship
        session.run(
            """
            MATCH (t:Taxpayer {gstin: $gstin})
            MATCH (r:Return {id: $return_id})
            MERGE (t)-[:FILES]->(r)
            """,
            gstin=buyer["gstin"],
            return_id=return_id,
        )
        
        # Link invoices with REFLECTED_IN
        for inv in invoices:
            # MERGE invoice (may already exist from GSTR-1)
            session.run(
                """
                MERGE (i:Invoice {invoiceNo: $invoiceNo})
                ON CREATE SET i.date = $date, i.taxableValue = $taxableValue,
                              i.gstAmount = $gstAmount, i.supplierGstin = $supplierGstin,
                              i.buyerGstin = $buyerGstin
                """,
                invoiceNo=inv["invoiceNo"],
                date=inv["date"],
                taxableValue=inv["taxableValue"],
                gstAmount=inv["gstAmount"],
                supplierGstin=inv["supplierGstin"],
                buyerGstin=inv["buyerGstin"],
            )
            
            # REFLECTED_IN relationship: Invoice -> GSTR2B
            session.run(
                """
                MATCH (i:Invoice {invoiceNo: $invoiceNo})
                MATCH (r:Return {id: $return_id})
                MERGE (i)-[:REFLECTED_IN]->(r)
                """,
                invoiceNo=inv["invoiceNo"],
                return_id=return_id,
            )
            stats["invoices_linked"] += 1
    
    return {
        "status": "success",
        "message": f"GSTR-2B ingested for {buyer['gstin']} period {returns_info['period']}",
        "stats": stats,
    }
