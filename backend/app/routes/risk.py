"""Vendor risk API routes."""

from fastapi import APIRouter, HTTPException
from app.risk.scoring import compute_vendor_risk, compute_all_vendor_risks
from app.risk.scoring_model import predict_risk
from app.database import get_session

router = APIRouter(tags=["Risk Scoring"])


@router.get("/vendor-risk/{gstin}")
async def get_vendor_risk(gstin: str):
    """Compute and return risk score for a specific vendor."""
    try:
        # Get taxpayer info
        with get_session() as session:
            result = session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.name AS name, t.state AS state",
                gstin=gstin,
            ).single()
        
        if result is None:
            raise HTTPException(status_code=404, detail=f"Taxpayer {gstin} not found")
        
        risk_data = compute_vendor_risk(gstin)
        
        # Also get XGBoost prediction
        xgb_prediction = predict_risk({
            "filing_delay_ratio": risk_data["components"]["filingDelay"],
            "mismatch_ratio": risk_data["components"]["mismatchRatio"],
            "irn_missing_ratio": risk_data["components"]["irnMissingRatio"],
            "tax_default_rate": risk_data["components"]["taxDefault"],
            "network_risk": risk_data["components"]["networkRisk"],
            "invoice_volume": 0.5,
            "avg_invoice_value": 0.5,
        })
        
        return {
            "gstin": gstin,
            "name": result["name"],
            "state": result["state"],
            "riskScore": risk_data["riskScore"],
            "riskLevel": risk_data["riskLevel"],
            "components": risk_data["components"],
            "recommendation": risk_data["recommendation"],
            "mlPrediction": xgb_prediction,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendor-risk")
async def get_all_vendor_risks():
    """Compute risk scores for all vendors."""
    try:
        results = compute_all_vendor_risks()
        return {"vendors": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
