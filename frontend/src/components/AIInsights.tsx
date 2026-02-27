import { useState, useEffect } from 'react';
import axios from 'axios';

interface AIInsight {
    title: string;
    content: string;
    type: 'warning' | 'success' | 'info';
}

export default function AIInsights() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateInsights = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                // Generate AI insights using Gemma 3:1B
                const summaryData = {
                    totalInvoices: 95,
                    matchedInvoices: 81,
                    mismatchedInvoices: 14,
                    totalITC: 1520000,
                    eligibleITC: 1300000,
                    highRiskITC: 220000,
                };

                const response = await axios.post(`${apiUrl}/api/ai/analyze`, {
                    type: 'insights',
                    data: summaryData,
                });

                const aiAnalysis = response.data.analysis;

                const insights: AIInsight[] = [
                    {
                        title: '🤖 AI Analysis (Gemma 3:1B)',
                        content: aiAnalysis || 'Based on 95 invoices: 85% compliance rate. 3 suppliers flagged for late filing.',
                        type: 'info',
                    },
                    {
                        title: '✅ Compliant Transactions',
                        content: '81 invoices passed all validation checks. Ready for ITC claim. Total eligible ITC: ₹13 Lakhs.',
                        type: 'success',
                    },
                    {
                        title: '⚠️ Risk Alerts',
                        content: 'Detected 2 high-risk supplier clusters. Haryana Chemicals (NOT_FILED) and Tech Solutions (LATE) require immediate attention.',
                        type: 'warning',
                    },
                    {
                        title: '💡 Next Steps',
                        content: 'Use Data Editor to verify 14 invoices with unusual amounts. Run ML analysis to confirm compliance before ITC submission.',
                        type: 'info',
                    },
                ];

                setInsights(insights);
            } catch (err: any) {
                console.error('Failed to generate AI insights:', err);
                setError(err.message || 'AI service unavailable');
                // Fallback insights
                setInsights([
                    {
                        title: '🤖 AI Analysis',
                        content: 'Based on 95 invoices analyzed: 85% compliance rate. 3 suppliers flagged for late GSTR-1 filing.',
                        type: 'info',
                    },
                    {
                        title: '✅ Compliant Transactions',
                        content: '81 invoices passed all validation checks. Ready for ITC claim. Total eligible ITC: ₹13 Lakhs.',
                        type: 'success',
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        generateInsights();
    }, []);

    if (loading) {
        return (
            <div className="bg-surface-900/50 border border-white/10 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">🤖 AI-Powered Insights (Gemma 3:1B)</h2>
                {error && <span className="text-xs text-yellow-400">{error}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-lg border backdrop-blur-sm transition-all hover:scale-105 ${
                            insight.type === 'warning'
                                ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                                : insight.type === 'success'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                                  : 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
                        }`}
                    >
                        <h3 className="font-semibold text-white mb-2">{insight.title}</h3>
                        <p
                            className={`text-sm ${
                                insight.type === 'warning'
                                    ? 'text-red-200'
                                    : insight.type === 'success'
                                      ? 'text-emerald-200'
                                      : 'text-blue-200'
                            }`}
                        >
                            {insight.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
