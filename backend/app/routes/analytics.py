"""Analytics API routes."""

from fastapi import APIRouter, HTTPException
from app.analytics.network import get_network_risk_summary

router = APIRouter(tags=["Analytics"])


@router.get("/analytics/network-risk")
async def network_risk():
    """Get comprehensive network risk analysis including PageRank, communities, and centrality."""
    try:
        summary = get_network_risk_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
