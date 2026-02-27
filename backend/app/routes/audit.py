"""Audit API routes."""

from fastapi import APIRouter, HTTPException
from app.audit.explainer import generate_audit_trail

router = APIRouter(tags=["Audit"])


@router.get("/audit/{invoice_no}")
async def get_audit_trail(invoice_no: str):
    """Generate explainable audit trail for an invoice."""
    try:
        trail = generate_audit_trail(invoice_no)
        if "error" in trail:
            raise HTTPException(status_code=404, detail=trail["error"])
        return trail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
