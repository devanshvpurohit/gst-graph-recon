"""Purchase register loader — GSTR-3B, ITC claims, and ledger entries."""

from app.database import get_session


def ingest_purchase_register(data: dict) -> dict:
    """
    Parse purchase register payload and create/update:
    - Taxpayer (buyer)
    - Return (GSTR3B)
    - ITCClaim nodes with CLAIMED_ITC edges
    - LedgerEntry nodes with OFFSET_BY edges
    """
    buyer = data["buyer"]
    gstr3b = data["gstr3b"]
    itc_claims = data["itc_claims"]
    ledger_entries = data["ledger_entries"]
    
    stats = {"returns_merged": 0, "itc_claims": 0, "ledger_entries": 0}
    
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
        
        # MERGE GSTR3B return
        return_id = f"{buyer['gstin']}_GSTR3B_{gstr3b['period']}"
        session.run(
            """
            MERGE (r:Return {id: $id})
            ON CREATE SET r.type = 'GSTR3B', r.period = $period,
                          r.status = $status, r.filingDate = $filingDate, r.gstin = $gstin
            ON MATCH SET r.status = $status, r.filingDate = $filingDate
            """,
            id=return_id,
            period=gstr3b["period"],
            status=gstr3b["status"],
            filingDate=gstr3b.get("filingDate"),
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
        
        # CLAIMED_ITC: Buyer -> GSTR3B
        for claim in itc_claims:
            claim_id = f"{buyer['gstin']}_ITC_{claim['period']}_{claim['id']}"
            session.run(
                """
                MERGE (c:ITCClaim {id: $id})
                ON CREATE SET c.amount = $amount, c.period = $period, c.gstin = $gstin
                ON MATCH SET c.amount = $amount
                """,
                id=claim_id,
                amount=claim["amount"],
                period=claim["period"],
                gstin=buyer["gstin"],
            )
            
            # Buyer CLAIMED_ITC -> GSTR3B
            session.run(
                """
                MATCH (t:Taxpayer {gstin: $gstin})
                MATCH (r:Return {id: $return_id})
                MERGE (t)-[:CLAIMED_ITC]->(r)
                """,
                gstin=buyer["gstin"],
                return_id=return_id,
            )
            stats["itc_claims"] += 1
        
        # OFFSET_BY: GSTR3B -> LedgerEntry
        for entry in ledger_entries:
            entry_id = f"{buyer['gstin']}_LEDGER_{entry['period']}_{entry['id']}"
            session.run(
                """
                MERGE (l:LedgerEntry {id: $id})
                ON CREATE SET l.mode = $mode, l.amount = $amount, l.period = $period, l.gstin = $gstin
                ON MATCH SET l.amount = $amount
                """,
                id=entry_id,
                mode=entry["mode"],
                amount=entry["amount"],
                period=entry["period"],
                gstin=entry["gstin"],
            )
            
            # OFFSET_BY relationship
            session.run(
                """
                MATCH (r:Return {id: $return_id})
                MATCH (l:LedgerEntry {id: $entry_id})
                MERGE (r)-[:OFFSET_BY]->(l)
                """,
                return_id=return_id,
                entry_id=entry_id,
            )
            stats["ledger_entries"] += 1
    
    return {
        "status": "success",
        "message": f"Purchase register ingested for {buyer['gstin']} period {gstr3b['period']}",
        "stats": stats,
    }
