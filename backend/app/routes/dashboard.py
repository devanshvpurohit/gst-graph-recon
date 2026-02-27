"""Dashboard API routes."""

from fastapi import APIRouter, HTTPException
from app.reconciliation.engine import get_dashboard_summary

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/summary")
async def dashboard_summary():
    """Get aggregated dashboard summary data."""
    try:
        summary = get_dashboard_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
