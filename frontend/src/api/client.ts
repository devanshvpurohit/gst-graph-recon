import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// ─── Types ──────────────────────────────────────────────────────────

export interface DashboardSummary {
    totalItcReconciled: number;
    totalMismatches: number;
    invoicesProcessed: number;
    taxpayers: number;

    // Optional mappings to preserve UI rendering patterns
    totalITC?: number;
    eligibleITC?: number;
    highRiskITC?: number;
    totalInvoices?: number;
    matchedInvoices?: number;
    mismatchedInvoices?: number;
    riskDistribution?: { low: number; medium: number; high: number };
    topRiskyVendors?: { gstin: string; name: string; riskScore: number }[];
    mismatchCategories?: { missingGSTR1: number; irnIssues: number; valueMismatch: number };
}

export interface ReconciliationResult {
    invoiceNo: string;
    supplierGSTIN: string;
    buyerGSTIN: string;
    status: 'VALID' | 'MISMATCH';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    rootCause: string[];
    details: { field: string; expected: string; actual: string; description: string }[];
}

export interface ReconciliationResponse {
    buyerGSTIN: string;
    period: string;
    totalInvoices: number;
    validCount: number;
    mismatchCount: number;
    results: ReconciliationResult[];
}

export interface VendorRisk {
    gstin: string;
    name: string;
    state: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    components: {
        filingDelay: number;
        mismatchRatio: number;
        irnMissingRatio: number;
        taxDefault: number;
        networkRisk: number;
    };
    recommendation: string;
}

export interface AuditTrail {
    invoiceNo: string;
    supplierGSTIN: string;
    buyerGSTIN: string;
    structuredReasoning: { step: number; check: string; status: string; detail: string }[];
    plainEnglish: string;
    recommendedActions: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface NetworkRisk {
    pageRank: { gstin: string; name: string; pageRank: number; riskScore: number }[];
    communities: { communityId: number; size: number; avgRiskScore: number; isSuspicious: boolean; members: any[] }[];
    degreeCentrality: { gstin: string; name: string; inDegreeCentrality: number; outDegreeCentrality: number; totalCentrality: number; role: string }[];
    riskySummary: { totalNodes: number; suspiciousClusters: number; highInfluenceVendors: number; avgNetworkRisk: number };
}

// ─── API Functions ──────────────────────────────────────────────────

export const fetchDashboardSummary = () =>
    api.get<DashboardSummary>('/dashboard/summary').then(r => r.data);

export const fetchReconciliation = (buyerGstin: string, period: string) =>
    api.get<ReconciliationResponse>(`/reconcile/${buyerGstin}/${period}`).then(r => r.data);

export const fetchVendorRisk = (gstin: string) =>
    api.get<VendorRisk>(`/risk/${gstin}`).then(r => r.data);

export const fetchAllVendorRisks = () =>
    api.get<{ vendors: VendorRisk[]; total: number }>('/risk').then(r => r.data);

export const fetchAuditTrail = (invoiceNo: string) =>
    api.get<AuditTrail>(`/audit/${invoiceNo}`).then(r => r.data);

export const fetchNetworkRisk = () =>
    api.get<NetworkRisk>('/analytics').then(r => r.data);

export const ingestGSTR1 = (data: any) =>
    api.post('/ingest/gstr1', data).then(r => r.data);

export const ingestGSTR2B = (data: any) =>
    api.post('/ingest/gstr2b', data).then(r => r.data);

export const ingestEInvoice = (data: any) =>
    api.post('/ingest/einvoice', data).then(r => r.data);

export const fetchAIVendorAnalysis = (vendorData: VendorRisk) =>
    api.post<{ analysis: string }>('/ai/analyze/vendor', { vendorData }).then(r => r.data);

export const fetchAIInvoiceAnalysis = (auditTrail: AuditTrail) =>
    api.post<{ analysis: string }>('/ai/analyze/invoice', { auditTrail }).then(r => r.data);

export default api;
