"""GSTR-1 data loader — supplier filing ingestion into the knowledge graph."""

from app.database import get_session


def ingest_gstr1(data: dict) -> dict:
    """
    Parse GSTR-1 JSON payload and create/update graph nodes:
    - Taxpayer (supplier)
    - Return (GSTR1)
    - Invoice nodes
    - Relationships: (Taxpayer)-[:FILES]->(Return)-[:DECLARES]->(Invoice)
    
    Uses MERGE to avoid duplication.
    """
    supplier = data["supplier"]
    returns_info = data["returns_info"]
    invoices = data["invoices"]
    
    stats = {"taxpayers_merged": 0, "returns_merged": 0, "invoices_merged": 0}
    
    with get_session() as session:
        # MERGE supplier taxpayer node
        session.run(
            """
            MERGE (t:Taxpayer {gstin: $gstin})
            ON CREATE SET t.pan = $pan, t.name = $name, t.state = $state, t.riskScore = 0.0
            ON MATCH SET t.pan = $pan, t.name = $name, t.state = $state
            """,
            gstin=supplier["gstin"],
            pan=supplier["pan"],
            name=supplier["name"],
            state=supplier["state"],
        )
        stats["taxpayers_merged"] = 1
        
        # MERGE GSTR1 return node
        return_id = f"{supplier['gstin']}_GSTR1_{returns_info['period']}"
        session.run(
            """
            MERGE (r:Return {id: $id})
            ON CREATE SET r.type = 'GSTR1', r.period = $period,
                          r.status = $status, r.filingDate = $filingDate, r.gstin = $gstin
            ON MATCH SET r.status = $status, r.filingDate = $filingDate
            """,
            id=return_id,
            period=returns_info["period"],
            status=returns_info["status"],
            filingDate=returns_info.get("filingDate"),
            gstin=supplier["gstin"],
        )
        stats["returns_merged"] = 1
        
        # Create FILES relationship
        session.run(
            """
            MATCH (t:Taxpayer {gstin: $gstin})
            MATCH (r:Return {id: $return_id})
            MERGE (t)-[:FILES]->(r)
            """,
            gstin=supplier["gstin"],
            return_id=return_id,
        )
        
        # Batch insert invoices
        for inv in invoices:
            session.run(
                """
                MERGE (i:Invoice {invoiceNo: $invoiceNo})
                ON CREATE SET i.date = $date, i.taxableValue = $taxableValue,
                              i.cgst = $cgst, i.sgst = $sgst, i.igst = $igst,
                              i.gstAmount = $gstAmount, i.supplierGstin = $supplierGstin,
                              i.buyerGstin = $buyerGstin, i.hsn = $hsn
                ON MATCH SET i.taxableValue = $taxableValue, i.gstAmount = $gstAmount
                """,
                invoiceNo=inv["invoiceNo"],
                date=inv["date"],
                taxableValue=inv["taxableValue"],
                cgst=inv.get("cgst", 0.0),
                sgst=inv.get("sgst", 0.0),
                igst=inv.get("igst", 0.0),
                gstAmount=inv["gstAmount"],
                supplierGstin=inv["supplierGstin"],
                buyerGstin=inv["buyerGstin"],
                hsn=inv.get("hsn"),
            )
            
            # DECLARES relationship: Return -> Invoice
            session.run(
                """
                MATCH (r:Return {id: $return_id})
                MATCH (i:Invoice {invoiceNo: $invoiceNo})
                MERGE (r)-[:DECLARES]->(i)
                """,
                return_id=return_id,
                invoiceNo=inv["invoiceNo"],
            )
            
            # MERGE buyer taxpayer node (minimal — will be enriched on their own filing)
            session.run(
                """
                MERGE (t:Taxpayer {gstin: $gstin})
                ON CREATE SET t.name = 'Unknown', t.state = '', t.pan = '', t.riskScore = 0.0
                """,
                gstin=inv["buyerGstin"],
            )
            
            stats["invoices_merged"] += 1
    
    return {
        "status": "success",
        "message": f"GSTR-1 ingested for {supplier['gstin']} period {returns_info['period']}",
        "stats": stats,
    }
