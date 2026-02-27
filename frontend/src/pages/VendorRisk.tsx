import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchAllVendorRisks, VendorRisk as VendorRiskType } from '../api/client';

const riskColor = (score: number) => {
    if (score >= 0.7) return '#ef4444';
    if (score >= 0.3) return '#f59e0b';
    return '#10b981';
};

const riskGradient = (level: string) => {
    switch (level) {
        case 'HIGH': return 'from-red-500/20 to-red-900/5 border-red-500/30';
        case 'MEDIUM': return 'from-amber-500/20 to-amber-900/5 border-amber-500/30';
        default: return 'from-emerald-500/20 to-emerald-900/5 border-emerald-500/30';
    }
};

export default function VendorRisk() {
    const [vendors, setVendors] = useState<VendorRiskType[]>([]);
    const [selected, setSelected] = useState<VendorRiskType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAllVendorRisks()
            .then(data => setVendors(data.vendors.sort((a: any, b: any) => b.riskScore - a.riskScore)))
            .catch(err => setError(err.message || 'Failed to connect to backend'))
            .finally(() => setLoading(false));
    }, []);

    const componentLabels: Record<string, string> = {
        filingDelay: 'Filing Delay',
        mismatchRatio: 'Mismatch Ratio',
        irnMissingRatio: 'IRN Missing',
        taxDefault: 'Tax Default',
        networkRisk: 'Network Risk',
    };

    if (loading) return <div className="text-slate-400">Loading risk profiles from Neo4j...</div>;
    if (error) return <div className="text-red-400">{error}</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">Vendor Risk Analysis</h1>
                <p className="text-sm text-slate-400 mt-1">Compliance risk scoring across all suppliers (Live Data)</p>
            </div>

            {/* Heatmap Bar */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Vendor Risk Heatmap</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vendors.map(v => ({ name: v.name.length > 16 ? v.name.slice(0, 16) + '…' : v.name, score: Math.round(v.riskScore * 100), gstin: v.gstin }))} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-25} textAnchor="end" height={80} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '13px' }} formatter={(val: number) => [`${val}%`, 'Risk Score']} />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]} onClick={(data: any) => {
                            const vendor = vendors.find(v => v.gstin === data.gstin);
                            if (vendor) setSelected(vendor);
                        }} cursor="pointer">
                            {vendors.map((v, i) => (
                                <Cell key={i} fill={riskColor(v.riskScore)} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Vendor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map((vendor, i) => (
                    <div
                        key={vendor.gstin}
                        className={`glass-card p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br ${riskGradient(vendor.riskLevel)} ${selected?.gstin === vendor.gstin ? 'ring-2 ring-primary-400' : ''}`}
                        onClick={() => setSelected(vendor)}
                        style={{ animationDelay: `${i * 0.05}s` }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-semibold text-white text-sm">{vendor.name}</h4>
                                <p className="font-mono text-xs text-slate-400 mt-0.5">{vendor.gstin}</p>
                            </div>
                            <span className={`risk-badge risk-badge-${vendor.riskLevel.toLowerCase()}`}>
                                {vendor.riskLevel}
                            </span>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="flex-1 mr-4">
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${Math.round(vendor.riskScore * 100)}%`,
                                            background: riskColor(vendor.riskScore),
                                        }}
                                    />
                                </div>
                            </div>
                            <span className="text-lg font-bold font-mono" style={{ color: riskColor(vendor.riskScore) }}>
                                {Math.round(vendor.riskScore * 100)}
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">{vendor.state}</p>
                    </div>
                ))}
            </div>

            {/* Detail Panel */}
            {selected && (
                <div className="glass-card p-6 animate-slide-up">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                            <p className="font-mono text-sm text-slate-400 mt-1">{selected.gstin} • {selected.state}</p>
                        </div>
                        <button
                            onClick={() => setSelected(null)}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Risk Components */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Risk Components</h4>
                            <div className="space-y-3">
                                {Object.entries(selected.components).map(([key, value]) => (
                                    <div key={key}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">{componentLabels[key] || key}</span>
                                            <span className="font-mono text-white">{Math.round(value * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${Math.round(value * 100)}%`,
                                                    background: riskColor(value),
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Recommendation</h4>
                            <div className={`p-4 rounded-xl border ${selected.riskLevel === 'HIGH' ? 'bg-red-500/5 border-red-500/20' :
                                selected.riskLevel === 'MEDIUM' ? 'bg-amber-500/5 border-amber-500/20' :
                                    'bg-emerald-500/5 border-emerald-500/20'
                                }`}>
                                <p className="text-sm text-slate-300">{selected.recommendation}</p>
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-3xl font-bold font-mono" style={{ color: riskColor(selected.riskScore) }}>
                                        {Math.round(selected.riskScore * 100)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Overall Score</p>
                                </div>
                                <div className="flex-1 h-px bg-white/5"></div>
                                <span className={`risk-badge risk-badge-${selected.riskLevel.toLowerCase()} text-base px-4 py-2`}>
                                    {selected.riskLevel} RISK
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
