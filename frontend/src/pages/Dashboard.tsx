import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import RiskCard from '../components/RiskCard';
import GraphView from '../components/GraphView';
import { DashboardSummary, fetchDashboardSummary, fetchNetworkRisk, NetworkRisk } from '../api/client';

// Fallback mock data for when backend is unavailable
const MOCK_SUMMARY: DashboardSummary = {
    totalITC: 1285600,
    eligibleITC: 892400,
    highRiskITC: 393200,
    totalInvoices: 50,
    matchedInvoices: 23,
    mismatchedInvoices: 27,
    riskDistribution: { low: 6, medium: 5, high: 4 },
    topRiskyVendors: [
        { gstin: '06AABCX1234K1Z5', name: 'Haryana Chemicals Ltd', riskScore: 0.85 },
        { gstin: '36AADCA3456N1Z9', name: 'Telangana IT Services', riskScore: 0.62 },
        { gstin: '27AABCT5678G1Z3', name: 'Tech Solutions MH', riskScore: 0.54 },
        { gstin: '09AABCY5678L1Z3', name: 'UP Pharma Industries', riskScore: 0.31 },
        { gstin: '32AABCZ9012M1Z1', name: 'Kerala Spice Traders', riskScore: 0.18 },
    ],
    mismatchCategories: { missingGSTR1: 12, irnIssues: 27, valueMismatch: 3 },
};

const MOCK_NETWORK_NODES = [
    { id: '29AABCS', name: 'Steel Corp India', riskScore: 0.15, type: 'supplier' as const },
    { id: '27AABCT', name: 'Tech Solutions MH', riskScore: 0.54, type: 'supplier' as const },
    { id: '33AABCU', name: 'Tamil Auto Parts', riskScore: 0.22, type: 'supplier' as const },
    { id: '07AABCV', name: 'Delhi Electronics', riskScore: 0.28, type: 'supplier' as const },
    { id: '24AABCW', name: 'Gujarat Textiles', riskScore: 0.12, type: 'supplier' as const },
    { id: '06AABCX', name: 'Haryana Chemicals', riskScore: 0.85, type: 'supplier' as const },
    { id: '09AABCY', name: 'UP Pharma', riskScore: 0.31, type: 'supplier' as const },
    { id: '32AABCZ', name: 'Kerala Spice', riskScore: 0.18, type: 'supplier' as const },
    { id: '36AADCA', name: 'Telangana IT', riskScore: 0.62, type: 'supplier' as const },
    { id: '19AADCB', name: 'Bengal Mfg Co', riskScore: 0.20, type: 'supplier' as const },
    { id: '29BUYER', name: 'Bangalore Retail', riskScore: 0.10, type: 'buyer' as const },
    { id: '27BUYER', name: 'Mumbai Trading', riskScore: 0.08, type: 'buyer' as const },
    { id: '33BUYER', name: 'Chennai Dist', riskScore: 0.12, type: 'buyer' as const },
    { id: '07BUYER', name: 'Delhi Wholesale', riskScore: 0.15, type: 'buyer' as const },
    { id: '24BUYER', name: 'Ahmedabad IE', riskScore: 0.09, type: 'buyer' as const },
];

const MOCK_NETWORK_LINKS = [
    { source: '29AABCS', target: '29BUYER', value: 3 },
    { source: '29AABCS', target: '27BUYER', value: 1 },
    { source: '29AABCS', target: '33BUYER', value: 1 },
    { source: '27AABCT', target: '27BUYER', value: 3 },
    { source: '27AABCT', target: '07BUYER', value: 1 },
    { source: '27AABCT', target: '24BUYER', value: 1 },
    { source: '33AABCU', target: '33BUYER', value: 3 },
    { source: '33AABCU', target: '29BUYER', value: 1 },
    { source: '33AABCU', target: '07BUYER', value: 1 },
    { source: '07AABCV', target: '07BUYER', value: 2 },
    { source: '07AABCV', target: '29BUYER', value: 1 },
    { source: '07AABCV', target: '27BUYER', value: 1 },
    { source: '07AABCV', target: '24BUYER', value: 1 },
    { source: '06AABCX', target: '27BUYER', value: 1 },
    { source: '06AABCX', target: '29BUYER', value: 1 },
    { source: '06AABCX', target: '33BUYER', value: 1 },
    { source: '06AABCX', target: '07BUYER', value: 1 },
    { source: '06AABCX', target: '24BUYER', value: 1 },
    { source: '09AABCY', target: '07BUYER', value: 1 },
    { source: '09AABCY', target: '27BUYER', value: 1 },
    { source: '32AABCZ', target: '29BUYER', value: 1 },
    { source: '32AABCZ', target: '07BUYER', value: 1 },
    { source: '36AADCA', target: '27BUYER', value: 1 },
    { source: '36AADCA', target: '29BUYER', value: 1 },
    { source: '19AADCB', target: '29BUYER', value: 1 },
    { source: '19AADCB', target: '07BUYER', value: 1 },
    { source: '19AADCB', target: '27BUYER', value: 1 },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
};

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummary>(MOCK_SUMMARY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardSummary()
            .then(data => setSummary(data))
            .catch(() => setSummary(MOCK_SUMMARY))
            .finally(() => setLoading(false));
    }, []);

    const pieData = [
        { name: 'Low Risk', value: summary.riskDistribution.low },
        { name: 'Medium Risk', value: summary.riskDistribution.medium },
        { name: 'High Risk', value: summary.riskDistribution.high },
    ];

    const mismatchData = [
        { category: 'Missing GSTR-1', count: summary.mismatchCategories.missingGSTR1 },
        { category: 'IRN Issues', count: summary.mismatchCategories.irnIssues },
        { category: 'Value Mismatch', count: summary.mismatchCategories.valueMismatch },
    ];

    const vendorData = summary.topRiskyVendors.map(v => ({
        name: v.name.length > 18 ? v.name.slice(0, 18) + '…' : v.name,
        risk: Math.round(v.riskScore * 100),
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-slate-400 mt-1">ITC Reconciliation & Risk Overview • April 2025</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RiskCard
                    title="Total ITC"
                    value={formatCurrency(summary.totalITC)}
                    subtitle={`${summary.totalInvoices} invoices`}
                    variant="default"
                    icon={
                        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <RiskCard
                    title="Eligible ITC"
                    value={formatCurrency(summary.eligibleITC)}
                    subtitle={`${summary.matchedInvoices} matched`}
                    variant="success"
                    icon={
                        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <RiskCard
                    title="High Risk ITC"
                    value={formatCurrency(summary.highRiskITC)}
                    subtitle={`${summary.mismatchedInvoices} mismatches`}
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
                    value={`${summary.totalInvoices > 0 ? Math.round((summary.matchedInvoices / summary.totalInvoices) * 100) : 0}%`}
                    subtitle={`${summary.matchedInvoices}/${summary.totalInvoices}`}
                    variant={summary.matchedInvoices / Math.max(summary.totalInvoices, 1) > 0.7 ? 'success' : 'warning'}
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
                    <h3 className="text-lg font-semibold text-white mb-4">Vendor Risk Distribution</h3>
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
                                    <Cell key={i} fill={COLORS[i]} fillOpacity={0.8} />
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
                            <Legend
                                wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                            />
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
                                    <Cell
                                        key={i}
                                        fill={entry.risk >= 70 ? '#ef4444' : entry.risk >= 30 ? '#f59e0b' : '#10b981'}
                                        fillOpacity={0.8}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Network Graph */}
            <GraphView nodes={MOCK_NETWORK_NODES} links={MOCK_NETWORK_LINKS} />
        </div>
    );
}
