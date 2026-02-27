import React from 'react';
import { ReconciliationResult } from '../api/client';

interface MismatchTableProps {
    results: ReconciliationResult[];
    onInvoiceClick?: (invoiceNo: string) => void;
}

export default function MismatchTable({ results, onInvoiceClick }: MismatchTableProps) {
    return (
        <div className="glass-card overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-white">Invoice Reconciliation Results</h3>
                <p className="text-sm text-slate-400 mt-1">
                    {results.length} invoices • {results.filter(r => r.status === 'MISMATCH').length} mismatches
                </p>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Invoice No</th>
                            <th>Supplier GSTIN</th>
                            <th>Status</th>
                            <th>Risk Level</th>
                            <th>Root Cause</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-500">
                                    No reconciliation data available. Run reconciliation first.
                                </td>
                            </tr>
                        ) : (
                            results.map((r, i) => (
                                <tr key={`${r.invoiceNo}-${i}`} className="group">
                                    <td>
                                        <span className="font-mono text-sm text-primary-300 font-medium">
                                            {r.invoiceNo}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="font-mono text-xs text-slate-400">
                                            {r.supplierGSTIN}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`risk-badge ${r.status === 'VALID' ? 'status-valid' : 'status-mismatch'}`}>
                                            {r.status === 'VALID' ? '✓' : '✗'} {r.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`risk-badge risk-badge-${r.riskLevel.toLowerCase()}`}>
                                            {r.riskLevel}
                                        </span>
                                    </td>
                                    <td className="max-w-xs">
                                        {r.rootCause.length > 0 ? (
                                            <ul className="text-xs text-slate-400 space-y-1">
                                                {r.rootCause.slice(0, 2).map((cause, ci) => (
                                                    <li key={ci} className="flex items-start gap-1">
                                                        <span className="text-amber-400 mt-0.5">•</span>
                                                        <span>{cause}</span>
                                                    </li>
                                                ))}
                                                {r.rootCause.length > 2 && (
                                                    <li className="text-slate-500">+{r.rootCause.length - 2} more</li>
                                                )}
                                            </ul>
                                        ) : (
                                            <span className="text-emerald-400/60 text-xs">All checks passed</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => onInvoiceClick?.(r.invoiceNo)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-primary-500/10 text-primary-300 px-3 py-1.5 rounded-lg hover:bg-primary-500/20"
                                        >
                                            Audit Trail
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
