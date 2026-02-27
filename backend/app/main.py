"""
GST Graph Reconciliation Engine — FastAPI Application

Knowledge Graph-based GST Reconciliation for India's GST ecosystem.
All reconciliation uses graph traversal — zero SQL joins.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_constraints, close_driver
from app.routes import ingest, reconciliation, risk, dashboard, audit, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Neo4j constraints on startup, close driver on shutdown."""
    try:
        init_constraints()
        print("✅ Neo4j constraints and indexes initialized")
    except Exception as e:
        print(f"⚠️  Neo4j initialization skipped: {e}")
    yield
    close_driver()
    print("🔌 Neo4j driver closed")


app = FastAPI(
    title="GST Graph Reconciliation Engine",
    description=(
        "Production-grade Knowledge Graph–based GST Reconciliation Engine. "
        "Models GST data as a graph and performs multi-hop ITC validation, "
        "mismatch classification, vendor risk scoring, and explainable audit trails."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ingest.router)
app.include_router(reconciliation.router)
app.include_router(risk.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(analytics.router)


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "service": "GST Graph Reconciliation Engine",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    from app.database import get_driver
    try:
        driver = get_driver()
        driver.verify_connectivity()
        neo4j_status = "connected"
    except Exception as e:
        neo4j_status = f"error: {str(e)}"
    
    return {
        "api": "healthy",
        "neo4j": neo4j_status,
    }
