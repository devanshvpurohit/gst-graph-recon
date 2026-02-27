"""Ingestion API routes."""

from fastapi import APIRouter, HTTPException
from app.ingestion.gstr1_loader import ingest_gstr1
from app.ingestion.gstr2b_loader import ingest_gstr2b
from app.ingestion.einvoice_loader import ingest_einvoice
from app.ingestion.purchase_register_loader import ingest_purchase_register

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])


@router.post("/gstr1")
async def ingest_gstr1_route(payload: dict):
    """Ingest GSTR-1 data into the knowledge graph."""
    try:
        result = ingest_gstr1(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gstr2b")
async def ingest_gstr2b_route(payload: dict):
    """Ingest GSTR-2B data into the knowledge graph."""
    try:
        result = ingest_gstr2b(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/einvoice")
async def ingest_einvoice_route(payload: dict):
    """Ingest e-invoice (IRN) data into the knowledge graph."""
    try:
        result = ingest_einvoice(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/purchase-register")
async def ingest_purchase_register_route(payload: dict):
    """Ingest purchase register (GSTR-3B, ITC claims, ledger entries)."""
    try:
        result = ingest_purchase_register(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
