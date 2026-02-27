from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────

class ReturnType(str, Enum):
    GSTR1 = "GSTR1"
    GSTR2B = "GSTR2B"
    GSTR3B = "GSTR3B"


class ReturnStatus(str, Enum):
    FILED = "FILED"
    NOT_FILED = "NOT_FILED"
    LATE = "LATE"


class IRNStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    NOT_GENERATED = "NOT_GENERATED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ReconciliationStatus(str, Enum):
    VALID = "VALID"
    MISMATCH = "MISMATCH"


class LedgerMode(str, Enum):
    CASH = "CASH"
    CREDIT = "CREDIT"


# ─── Node Models ─────────────────────────────────────────────────────

class Taxpayer(BaseModel):
    gstin: str
    pan: str
    name: str
    state: str
    riskScore: float = 0.0


class Return(BaseModel):
    id: str
    type: ReturnType
    period: str  # e.g. "042025" for April 2025
    status: ReturnStatus
    filingDate: Optional[str] = None
    gstin: str


class Invoice(BaseModel):
    invoiceNo: str
    date: str
    taxableValue: float
    cgst: float = 0.0
    sgst: float = 0.0
    igst: float = 0.0
    gstAmount: float
    supplierGstin: str
    buyerGstin: str
    hsn: Optional[str] = None


class IRNNode(BaseModel):
    irnHash: str
    status: IRNStatus
    invoiceNo: str
    generatedDate: Optional[str] = None


class ITCClaim(BaseModel):
    id: str
    amount: float
    period: str
    gstin: str


class LedgerEntry(BaseModel):
    id: str
    mode: LedgerMode
    amount: float
    period: str
    gstin: str


# ─── Request Models ──────────────────────────────────────────────────

class GSTR1Payload(BaseModel):
    supplier: Taxpayer
    returns_info: Return
    invoices: list[Invoice]


class GSTR2BPayload(BaseModel):
    buyer: Taxpayer
    returns_info: Return
    invoices: list[Invoice]


class EInvoicePayload(BaseModel):
    irn_entries: list[IRNNode]


class PurchaseRegisterPayload(BaseModel):
    buyer: Taxpayer
    gstr3b: Return
    itc_claims: list[ITCClaim]
    ledger_entries: list[LedgerEntry]


# ─── Response Models ─────────────────────────────────────────────────

class MismatchDetail(BaseModel):
    field: str
    expected: Optional[str] = None
    actual: Optional[str] = None
    description: str


class ReconciliationResult(BaseModel):
    invoiceNo: str
    supplierGSTIN: str
    buyerGSTIN: str
    status: ReconciliationStatus
    riskLevel: RiskLevel
    rootCause: list[str] = []
    details: list[MismatchDetail] = []


class ReconciliationResponse(BaseModel):
    buyerGSTIN: str
    period: str
    totalInvoices: int
    validCount: int
    mismatchCount: int
    results: list[ReconciliationResult]


class VendorRiskResponse(BaseModel):
    gstin: str
    name: str
    state: str
    riskScore: float
    riskLevel: RiskLevel
    components: dict
    recommendation: str


class DashboardSummary(BaseModel):
    totalITC: float
    eligibleITC: float
    highRiskITC: float
    totalInvoices: int
    matchedInvoices: int
    mismatchedInvoices: int
    riskDistribution: dict
    topRiskyVendors: list[dict]
    mismatchCategories: dict


class AuditTrail(BaseModel):
    invoiceNo: str
    supplierGSTIN: str
    buyerGSTIN: str
    structuredReasoning: list[dict]
    plainEnglish: str
    recommendedActions: list[str]
    riskLevel: RiskLevel


class NetworkRiskResponse(BaseModel):
    pageRank: list[dict]
    communities: list[dict]
    degreeCentrality: list[dict]
    riskySummary: dict
