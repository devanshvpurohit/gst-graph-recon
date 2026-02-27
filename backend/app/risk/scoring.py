"""
Vendor Risk Scoring Engine

Computes vendor risk using:
- Filing delay frequency
- Invoice mismatch ratio
- IRN absence ratio
- Tax payment default rate
- Graph centrality score (network risk)

Formula:
Risk Score = 0.30*FilingDelay + 0.25*MismatchRatio + 0.20*IRNMissing + 0.15*TaxDefault + 0.10*NetworkRisk

Also includes XGBoost predictive model for historical pattern matching.
"""

import numpy as np
import networkx as nx
from app.database import get_session


def compute_vendor_risk(gstin: str) -> dict:
    """Compute comprehensive risk score for a vendor using graph traversal."""
    with get_session() as session:
        # Component 1: Filing delay frequency
        filing_result = session.run("""
            MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(r:Return)
            RETURN count(r) AS totalReturns,
                   count(CASE WHEN r.status = 'LATE' THEN 1 END) AS lateReturns,
                   count(CASE WHEN r.status = 'NOT_FILED' THEN 1 END) AS unfiledReturns
        """, gstin=gstin).single()
        
        total_returns = filing_result["totalReturns"] or 1
        late = filing_result["lateReturns"] or 0
        unfiled = filing_result["unfiledReturns"] or 0
        filing_delay = (late + unfiled * 2) / total_returns
        filing_delay = min(filing_delay, 1.0)
        
        # Component 2: Invoice mismatch ratio
        mismatch_result = session.run("""
            MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(:Return {type: 'GSTR1'})-[:DECLARES]->(inv:Invoice)
            WITH count(inv) AS totalDeclared
            
            MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(:Return {type: 'GSTR1'})-[:DECLARES]->(inv:Invoice)
            WHERE NOT EXISTS { MATCH (inv)-[:REFLECTED_IN]->(:Return {type: 'GSTR2B'}) }
            WITH totalDeclared, count(inv) AS notReflected
            
            RETURN totalDeclared, notReflected
        """, gstin=gstin).single()
        
        total_declared = mismatch_result["totalDeclared"] or 1
        not_reflected = mismatch_result["notReflected"] or 0
        mismatch_ratio = not_reflected / total_declared
        
        # Component 3: IRN absence ratio
        irn_result = session.run("""
            MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(:Return {type: 'GSTR1'})-[:DECLARES]->(inv:Invoice)
            WITH count(inv) AS totalInvoices
            
            MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(:Return {type: 'GSTR1'})-[:DECLARES]->(inv:Invoice)
            WHERE NOT EXISTS { MATCH (inv)-[:HAS_IRN]->(:IRN {status: 'ACTIVE'}) }
            WITH totalInvoices, count(inv) AS missingIrn
            
            RETURN totalInvoices, missingIrn
        """, gstin=gstin).single()
        
        total_invoices = irn_result["totalInvoices"] or 1
        missing_irn = irn_result["missingIrn"] or 0
        irn_missing_ratio = missing_irn / total_invoices
        
        # Component 4: Tax payment default (based on ledger offsets)
        tax_result = session.run("""
            MATCH (t:Taxpayer {gstin: $gstin})-[:CLAIMED_ITC]->(gstr3b:Return {type: 'GSTR3B'})
            OPTIONAL MATCH (gstr3b)-[:OFFSET_BY]->(l:LedgerEntry)
            RETURN count(gstr3b) AS totalFiled,
                   count(l) AS withLedger
        """, gstin=gstin).single()
        
        total_filed = tax_result["totalFiled"] or 1
        with_ledger = tax_result["withLedger"] or 0
        tax_default = 1.0 - (with_ledger / total_filed) if total_filed > 0 else 0.0
        
        # Component 5: Network risk (degree centrality approximation)
        network_risk = _compute_network_risk(gstin, session)
        
        # Weighted formula
        risk_score = (
            0.30 * filing_delay
            + 0.25 * mismatch_ratio
            + 0.20 * irn_missing_ratio
            + 0.15 * tax_default
            + 0.10 * network_risk
        )
        risk_score = round(min(risk_score, 1.0), 4)
        
        # Persist risk score
        session.run(
            "MATCH (t:Taxpayer {gstin: $gstin}) SET t.riskScore = $score",
            gstin=gstin,
            score=risk_score,
        )
        
        # Classify
        if risk_score >= 0.7:
            level = "HIGH"
            recommendation = "Flag for audit. Suspend ITC claims pending verification."
        elif risk_score >= 0.3:
            level = "MEDIUM"
            recommendation = "Monitor closely. Verify top mismatched invoices."
        else:
            level = "LOW"
            recommendation = "Standard compliance. No immediate action required."
        
        return {
            "gstin": gstin,
            "riskScore": risk_score,
            "riskLevel": level,
            "components": {
                "filingDelay": round(filing_delay, 4),
                "mismatchRatio": round(mismatch_ratio, 4),
                "irnMissingRatio": round(irn_missing_ratio, 4),
                "taxDefault": round(tax_default, 4),
                "networkRisk": round(network_risk, 4),
            },
            "recommendation": recommendation,
        }


def _compute_network_risk(gstin: str, session) -> float:
    """
    Compute network risk using graph centrality.
    High-risk suppliers connected to many risky buyers = higher network risk.
    """
    result = session.run("""
        MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(:Return)-[:DECLARES]->(inv:Invoice)
        MATCH (buyer:Taxpayer {gstin: inv.buyerGstin})
        WHERE buyer.riskScore IS NOT NULL
        RETURN avg(buyer.riskScore) AS avgBuyerRisk,
               count(DISTINCT buyer) AS connectedBuyers
    """, gstin=gstin).single()
    
    avg_risk = result["avgBuyerRisk"] or 0.0
    connected = result["connectedBuyers"] or 0
    
    # Normalize: more connections to risky entities = higher network risk
    if connected == 0:
        return 0.0
    
    return min(avg_risk * min(connected / 10.0, 1.0), 1.0)


def compute_all_vendor_risks() -> list[dict]:
    """Compute risk scores for all taxpayers in the graph."""
    results = []
    with get_session() as session:
        taxpayers = session.run("MATCH (t:Taxpayer) RETURN t.gstin AS gstin")
        gstins = [r["gstin"] for r in taxpayers]
    
    for gstin in gstins:
        try:
            result = compute_vendor_risk(gstin)
            results.append(result)
        except Exception as e:
            results.append({"gstin": gstin, "error": str(e)})
    
    return results
