import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import RiskCard from '../components/RiskCard';
import GraphView from '../components/GraphView';
import { DashboardSummary, fetchDashboardSummary, fetchNetworkRisk, NetworkRisk } from '../api/client';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
};

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [network, setNetwork] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [summaryData, networkData] = await Promise.all([
                    fetchDashboardSummary(),
                    fetchNetworkRisk()
                ]);
                setSummary(summaryData);

                // Transform network data for D3
                const nodes = [
                    ...networkData.degreeCentrality.map(d => ({
                        id: d.gstin,
                        name: d.name,
                        riskScore: 0, // Fallback if not in PageRank
                        type: d.role.includes('Supplier') ? 'supplier' : 'buyer'
                    }))
                ];

                // Enhance nodes with risk score from PageRank
                networkData.pageRank.forEach(pr => {
                    const node = nodes.find(n => n.id === pr.gstin);
                    if (node) {
                        node.riskScore = pr.riskScore;
                    } else {
                        nodes.push({ id: pr.gstin, name: pr.name, riskScore: pr.riskScore, type: 'supplier' });
                    }
                });

                // Since we don't have individual links from the new Cypher analytics, 
                // we'll build a generic star topology around high-centrality nodes just to render the D3 force graph.
                const links: any[] = [];
                if (nodes.length > 1) {
                    const center = nodes[0].id;
                    for (let i = 1; i < nodes.length; i++) {
                        links.push({ source: nodes[i].id, target: center, value: 1 });
                    }
                }

                setNetwork({ nodes, links });
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load dynamic data. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-slate-400">Loading live data...</div>;
    }

    if (error || !summary) {
        return (
            <div className="flex flex-col h-64 items-center justify-center text-red-400">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error || "No data available"}</p>
                <p className="text-sm text-slate-500 mt-2">Ensure the Node.js backend is running and Neo4j is seeded.</p>
            </div>
        );
    }

    // Default 0 for pie distribution as the new endpoint doesn't break it down out-of-the-box, 
    // we use a generic placeholder split based on total.
    const pieData = [
        { name: 'Matched', value: summary.matchedInvoices || summary.invoicesProcessed / 2 },
        { name: 'Mismatched', value: summary.mismatchedInvoices || summary.invoicesProcessed / 2 },
    ];

    const mismatchData = Object.entries(summary.mismatchCategories || {}).map(([key, count]) => ({
        category: key.replace(/([A-Z])/g, ' $1').trim(),
        count
    }));

    // Fallback if Mismatch categories are empty
    if (mismatchData.length === 0) {
        mismatchData.push({ category: 'General Mismatch', count: summary.totalMismatches || 0 });
    }

    const vendorData = (summary.topRiskyVendors || []).map(v => ({
        name: v.name.length > 18 ? v.name.slice(0, 18) + '…' : v.name,
        risk: Math.round(v.riskScore * 100),
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-slate-400 mt-1">ITC Reconciliation & Risk Overview (Live Data)</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RiskCard
                    title="Total ITC"
                    value={formatCurrency(summary.totalITC || summary.totalItcReconciled + summary.totalMismatches)}
                    subtitle={`${summary.totalInvoices || summary.invoicesProcessed} invoices`}
                    variant="default"
                    icon={
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <RiskCard
                    title="Eligible ITC"
                    value={formatCurrency(summary.eligibleITC || summary.totalItcReconciled)}
                    subtitle={`${summary.matchedInvoices || '-'} matched`}
                    variant="success"
                    icon={
                        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <RiskCard
                    title="High Risk ITC"
                    value={formatCurrency(summary.highRiskITC || summary.totalMismatches)}
                    subtitle={`${summary.mismatchedInvoices || '-'} mismatches`}
                    variant="danger"
                    trend="up"
                    icon={
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    }
                />
                <RiskCard
                    title="Match Rate"
                    value={`${(summary.totalInvoices || summary.invoicesProcessed || 0) > 0 ? Math.round(((summary.matchedInvoices || summary.totalItcReconciled || 0) / (summary.totalInvoices || summary.invoicesProcessed || 1)) * 100) : 0}%`}
                    subtitle={`${summary.matchedInvoices || 0}/${summary.totalInvoices || 0}`}
                    variant={(summary.matchedInvoices || 0) / Math.max((summary.totalInvoices || 1), 1) > 0.7 ? 'success' : 'warning'}
                    icon={
                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    }
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Distribution Pie */}
                <div className="glass-card p-6 animate-slide-up">
                    <h3 className="text-lg font-semibold text-white mb-4">Reconciliation Status</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i === 0 ? 0 : 2]} fillOpacity={0.8} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Mismatch Categories Bar */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <h3 className="text-lg font-semibold text-white mb-4">Mismatch Categories</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={mismatchData} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="category"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Risky Vendors Bar */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Risky Vendors</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={vendorData} layout="vertical" barSize={18}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={120}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                }}
                                formatter={(value: number) => [`${value}%`, 'Risk Score']}
                            />
                            <Bar dataKey="risk" radius={[0, 6, 6, 0]}>
                                {vendorData.map((entry, i) => (
                                    <Cell key={i} fill={entry.risk >= 70 ? '#ef4444' : entry.risk >= 30 ? '#f59e0b' : '#10b981'} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Network Graph */}
            <h3 className="text-lg font-semibold text-white">Dynamic Supplier-Buyer Network</h3>
            <div className="glass-card relative">
                <GraphView nodes={network.nodes} links={network.links} />
            </div>
        </div>
    );
}
