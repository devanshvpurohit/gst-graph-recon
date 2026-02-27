"""E-Invoice loader — IRN node ingestion into the knowledge graph."""

from app.database import get_session


def ingest_einvoice(data: dict) -> dict:
    """
    Parse e-invoice JSON payload and create/update:
    - IRN nodes
    - HAS_IRN edges from Invoice -> IRN
    """
    irn_entries = data["irn_entries"]
    stats = {"irn_merged": 0}
    
    with get_session() as session:
        for entry in irn_entries:
            # MERGE IRN node
            session.run(
                """
                MERGE (irn:IRN {irnHash: $irnHash})
                ON CREATE SET irn.status = $status, irn.invoiceNo = $invoiceNo,
                              irn.generatedDate = $generatedDate
                ON MATCH SET irn.status = $status
                """,
                irnHash=entry["irnHash"],
                status=entry["status"],
                invoiceNo=entry["invoiceNo"],
                generatedDate=entry.get("generatedDate"),
            )
            
            # HAS_IRN relationship: Invoice -> IRN
            session.run(
                """
                MATCH (i:Invoice {invoiceNo: $invoiceNo})
                MATCH (irn:IRN {irnHash: $irnHash})
                MERGE (i)-[:HAS_IRN]->(irn)
                """,
                invoiceNo=entry["invoiceNo"],
                irnHash=entry["irnHash"],
            )
            stats["irn_merged"] += 1
    
    return {
        "status": "success",
        "message": f"E-invoice data ingested: {stats['irn_merged']} IRNs",
        "stats": stats,
    }
