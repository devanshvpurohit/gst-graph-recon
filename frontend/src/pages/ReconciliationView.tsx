import React, { useState } from 'react';
import MismatchTable from '../components/MismatchTable';
import { fetchReconciliation, fetchAuditTrail, ReconciliationResult, AuditTrail } from '../api/client';

const BUYERS = [
    { gstin: '29BUYER001KA1Z5', name: 'Bangalore Retail Corp' },
    { gstin: '27BUYER002MH1Z3', name: 'Mumbai Trading House' },
    { gstin: '33BUYER003TN1Z1', name: 'Chennai Distributors' },
    { gstin: '07BUYER004DL1Z9', name: 'Delhi Wholesale Market' },
    { gstin: '24BUYER005GJ1Z7', name: 'Ahmedabad Import Export' },
];

export default function ReconciliationView() {
    const [selectedBuyer, setSelectedBuyer] = useState(BUYERS[0].gstin);
    const [period, setPeriod] = useState('042025');
    const [results, setResults] = useState<ReconciliationResult[]>([]);
    const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
    const [loading, setLoading] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReconcile = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchReconciliation(selectedBuyer, period);
            setResults(data.results);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch reconciliation results');
        } finally {
            setLoading(false);
        }
    };

    const handleAuditClick = async (invoiceNo: string) => {
        setAuditLoading(true);
        try {
            const trail = await fetchAuditTrail(invoiceNo);
            setAuditTrail(trail);
        } catch (err: any) {
            alert('Failed to generate audit trail: ' + (err.message || 'Check backend'));
        } finally {
            setAuditLoading(false);
        }
    };

    const validCount = results.filter(r => r.status === 'VALID').length;
    const mismatchCount = results.filter(r => r.status === 'MISMATCH').length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">ITC Reconciliation</h1>
                <p className="text-sm text-slate-400 mt-1">Graph traversal-based ITC chain validation</p>
            </div>

            {/* Controls */}
            <div className="glass-card p-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Buyer GSTIN</label>
                        <select
                            value={selectedBuyer}
                            onChange={e => setSelectedBuyer(e.target.value)}
                            className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                        >
                            {BUYERS.map(b => (
                                <option key={b.gstin} value={b.gstin}>{b.name} ({b.gstin})</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Period</label>
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                        >
                            <option value="042025">April 2025</option>
                            <option value="032025">March 2025</option>
                            <option value="022025">February 2025</option>
                        </select>
                    </div>

                    <button
                        onClick={handleReconcile}
                        disabled={loading}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="spinner w-4 h-4 border-2"></div>
                                Reconciling…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Run Reconciliation
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-2xl font-bold text-white">{results.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Total Invoices</p>
                </div>
                <div className="glass-card p-4 text-center border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-400">{validCount}</p>
                    <p className="text-xs text-slate-400 mt-1">Valid</p>
                </div>
                <div className="glass-card p-4 text-center border-red-500/20">
                    <p className="text-2xl font-bold text-red-400">{mismatchCount}</p>
                    <p className="text-xs text-slate-400 mt-1">Mismatches</p>
                </div>
            </div>

            {/* Results Table */}
            <MismatchTable results={results} onInvoiceClick={handleAuditClick} />

            {/* Audit Trail Modal */}
            {auditTrail && (
                <div className="glass-card p-6 animate-slide-up border-primary-500/20">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">Audit Trail — {auditTrail.invoiceNo}</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Supplier: {auditTrail.supplierGSTIN} → Buyer: {auditTrail.buyerGSTIN}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`risk-badge risk-badge-${auditTrail.riskLevel.toLowerCase()} text-sm`}>
                                {auditTrail.riskLevel} RISK
                            </span>
                            <button
                                onClick={() => setAuditTrail(null)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Validation Steps */}
                    <div className="space-y-3 mb-6">
                        {auditTrail.structuredReasoning.map((step) => (
                            <div key={step.step} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold ${step.status === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' :
                                    step.status === 'WARNING' ? 'bg-amber-500/15 text-amber-400' :
                                        'bg-red-500/15 text-red-400'
                                    }`}>
                                    {step.status === 'PASS' ? '✓' : step.status === 'WARNING' ? '⚠' : '✗'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{step.check}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{step.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Plain English */}
                    <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10 mb-4">
                        <h4 className="text-xs font-semibold text-primary-300 uppercase tracking-wider mb-2">Summary</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{auditTrail.plainEnglish}</p>
                    </div>

                    {/* Recommended Actions */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                            {auditTrail.recommendedActions.map((action, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="text-primary-400 mt-0.5">→</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
