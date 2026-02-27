from neo4j import GraphDatabase
from app.config import settings

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _driver


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def get_session():
    return get_driver().session()


def init_constraints():
    """Create uniqueness constraints and indexes for performance."""
    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Taxpayer) REQUIRE t.gstin IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (i:Invoice) REQUIRE i.invoiceNo IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (irn:IRN) REQUIRE irn.irnHash IS UNIQUE",
        "CREATE INDEX IF NOT EXISTS FOR (r:Return) ON (r.type, r.period)",
        "CREATE INDEX IF NOT EXISTS FOR (i:Invoice) ON (i.date)",
        "CREATE INDEX IF NOT EXISTS FOR (t:Taxpayer) ON (t.riskScore)",
    ]
    with get_session() as session:
        for stmt in constraints:
            session.run(stmt)
