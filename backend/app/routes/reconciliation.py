"""Reconciliation API routes."""

from fastapi import APIRouter, HTTPException
from app.reconciliation.engine import validate_itc_chain

router = APIRouter(tags=["Reconciliation"])


@router.get("/reconcile/{buyer_gstin}/{period}")
async def reconcile(buyer_gstin: str, period: str):
    """
    Run ITC reconciliation for a buyer's GSTIN and period.
    
    Performs multi-hop graph traversal:
    Supplier → GSTR1 → Invoice → IRN → GSTR2B → GSTR3B → Ledger
    """
    try:
        results = validate_itc_chain(buyer_gstin, period)
        
        valid_count = sum(1 for r in results if r["status"] == "VALID")
        mismatch_count = sum(1 for r in results if r["status"] == "MISMATCH")
        
        return {
            "buyerGSTIN": buyer_gstin,
            "period": period,
            "totalInvoices": len(results),
            "validCount": valid_count,
            "mismatchCount": mismatch_count,
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
