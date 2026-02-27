import { useState, useEffect } from 'react';
import axios from 'axios';
import GraphView from '../components/GraphView';

interface Invoice {
    invoiceNo: string;
    date: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    gstAmount: number;
    supplierGstin: string;
    buyerGstin: string;
    hsn: string;
}

interface RiskAnalysis {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reasoning: string[];
    successFactors: string[];
    recommendations: string[];
}

export default function DataEditor() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [graphData, setGraphData] = useState<any>(null);

    // Load initial data
    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.get(`${apiUrl}/api/dashboard/summary`);
            // For now, use mock data - in production, fetch from API
            setInvoices(mockInvoices);
            setGraphData(generateGraphData(mockInvoices));
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        }
    };

    const generateGraphData = (invoices: Invoice[]) => {
        const nodes: any[] = [];
        const links: any[] = [];
        const suppliers = new Set<string>();
        const buyers = new Set<string>();

        invoices.forEach((inv) => {
            suppliers.add(inv.supplierGstin);
            buyers.add(inv.buyerGstin);
            links.push({
                source: inv.supplierGstin,
                target: inv.buyerGstin,
                value: inv.gstAmount,
            });
        });

        suppliers.forEach((gstin) => {
            nodes.push({
                id: gstin,
                name: `Supplier ${gstin.slice(-5)}`,
                riskScore: Math.random() * 0.5,
                type: 'supplier',
            });
        });

        buyers.forEach((gstin) => {
            nodes.push({
                id: gstin,
                name: `Buyer ${gstin.slice(-5)}`,
                riskScore: Math.random() * 0.3,
                type: 'buyer',
            });
        });

        return { nodes, links };
    };

    const handleEditInvoice = (invoice: Invoice) => {
        setSelectedInvoice({ ...invoice });
        setIsEditing(true);
    };

    const handleSaveInvoice = () => {
        if (selectedInvoice) {
            setInvoices(
                invoices.map((inv) =>
                    inv.invoiceNo === selectedInvoice.invoiceNo ? selectedInvoice : inv
                )
            );
            setGraphData(generateGraphData(invoices));
            setIsEditing(false);
            setSelectedInvoice(null);
        }
    };

    const handleAnalyzeRisk = async () => {
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${apiUrl}/api/analyze/risk`, {
                invoices,
            });
            setRiskAnalysis(response.data);
        } catch (error) {
            console.error('Failed to analyze risk:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoice = (invoiceNo: string) => {
        setInvoices(invoices.filter((inv) => inv.invoiceNo !== invoiceNo));
        setGraphData(generateGraphData(invoices.filter((inv) => inv.invoiceNo !== invoiceNo)));
    };

    const handleAddInvoice = () => {
        const newInvoice: Invoice = {
            invoiceNo: `INV${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            taxableValue: 100000,
            cgst: 9000,
            sgst: 9000,
            igst: 0,
            gstAmount: 18000,
            supplierGstin: '29AABCS1234F1Z5',
            buyerGstin: '29BUYER001KA1Z5',
            hsn: '7208',
        };
        setInvoices([...invoices, newInvoice]);
        setSelectedInvoice(newInvoice);
        setIsEditing(true);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Data Editor & Risk Analyzer</h1>
                <p className="text-slate-400">Edit transactions, visualize relationships, and analyze risk</p>
            </div>

            {/* Graph Visualization */}
            {graphData && (
                <div className="bg-surface-900/50 border border-white/10 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Transaction Network</h2>
                    <GraphView nodes={graphData.nodes} links={graphData.links} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoices List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Invoices ({invoices.length})</h2>
                        <button
                            onClick={handleAddInvoice}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add Invoice
                        </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {invoices.map((invoice) => (
                            <div
                                key={invoice.invoiceNo}
                                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                                    selectedInvoice?.invoiceNo === invoice.invoiceNo
                                        ? 'bg-blue-500/20 border-blue-500/50'
                                        : 'bg-surface-800/50 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => handleEditInvoice(invoice)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-white">{invoice.invoiceNo}</p>
                                        <p className="text-sm text-slate-400">{invoice.date}</p>
                                        <p className="text-sm text-slate-500">₹{invoice.taxableValue.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-emerald-400">GST: ₹{invoice.gstAmount.toLocaleString()}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteInvoice(invoice.invoiceNo);
                                            }}
                                            className="text-xs text-red-400 hover:text-red-300 mt-2"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Panel */}
                <div className="bg-surface-900/50 border border-white/10 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {isEditing ? 'Edit Invoice' : 'Select Invoice'}
                    </h2>

                    {isEditing && selectedInvoice ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Invoice No</label>
                                <input
                                    type="text"
                                    value={selectedInvoice.invoiceNo}
                                    disabled
                                    className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={selectedInvoice.date}
                                    onChange={(e) =>
                                        setSelectedInvoice({ ...selectedInvoice, date: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Taxable Value</label>
                                <input
                                    type="number"
                                    value={selectedInvoice.taxableValue}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        const gstAmount = value * 0.18;
                                        setSelectedInvoice({
                                            ...selectedInvoice,
                                            taxableValue: value,
                                            gstAmount,
                                            cgst: gstAmount / 2,
                                            sgst: gstAmount / 2,
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Supplier GSTIN</label>
                                <input
                                    type="text"
                                    value={selectedInvoice.supplierGstin}
                                    onChange={(e) =>
                                        setSelectedInvoice({ ...selectedInvoice, supplierGstin: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Buyer GSTIN</label>
                                <input
                                    type="text"
                                    value={selectedInvoice.buyerGstin}
                                    onChange={(e) =>
                                        setSelectedInvoice({ ...selectedInvoice, buyerGstin: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded text-white text-sm"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={handleSaveInvoice}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">Select an invoice to edit</p>
                    )}
                </div>
            </div>

            {/* Analyze Button */}
            <button
                onClick={handleAnalyzeRisk}
                disabled={loading || invoices.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
                {loading ? 'Analyzing Risk...' : 'Analyze Risk with ML Model'}
            </button>

            {/* Risk Analysis Results */}
            {riskAnalysis && (
                <div className="bg-surface-900/50 border border-white/10 rounded-lg p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Risk Analysis Results</h2>

                        {/* Risk Score */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-300">Risk Score</span>
                                <span
                                    className={`text-2xl font-bold ${
                                        riskAnalysis.riskLevel === 'LOW'
                                            ? 'text-emerald-400'
                                            : riskAnalysis.riskLevel === 'MEDIUM'
                                              ? 'text-yellow-400'
                                              : 'text-red-400'
                                    }`}
                                >
                                    {(riskAnalysis.riskScore * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-surface-800 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${
                                        riskAnalysis.riskLevel === 'LOW'
                                            ? 'bg-emerald-500'
                                            : riskAnalysis.riskLevel === 'MEDIUM'
                                              ? 'bg-yellow-500'
                                              : 'bg-red-500'
                                    }`}
                                    style={{ width: `${riskAnalysis.riskScore * 100}%` }}
                                />
                            </div>
                            <p className="text-sm text-slate-400 mt-2">
                                Risk Level: <span className="font-medium text-white">{riskAnalysis.riskLevel}</span>
                            </p>
                        </div>

                        {/* Risk Reasoning */}
                        {riskAnalysis.reasoning.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-red-400 mb-3">⚠️ Risk Factors</h3>
                                <ul className="space-y-2">
                                    {riskAnalysis.reasoning.map((reason, idx) => (
                                        <li key={idx} className="flex gap-2 text-slate-300">
                                            <span className="text-red-400 mt-1">•</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Success Factors */}
                        {riskAnalysis.successFactors.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-emerald-400 mb-3">✓ Success Factors</h3>
                                <ul className="space-y-2">
                                    {riskAnalysis.successFactors.map((factor, idx) => (
                                        <li key={idx} className="flex gap-2 text-slate-300">
                                            <span className="text-emerald-400 mt-1">•</span>
                                            <span>{factor}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {riskAnalysis.recommendations.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-blue-400 mb-3">💡 Recommendations</h3>
                                <ul className="space-y-2">
                                    {riskAnalysis.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex gap-2 text-slate-300">
                                            <span className="text-blue-400 mt-1">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Mock data for demonstration
const mockInvoices: Invoice[] = [
    {
        invoiceNo: 'INV001',
        date: '2025-04-05',
        taxableValue: 100000,
        cgst: 9000,
        sgst: 9000,
        igst: 0,
        gstAmount: 18000,
        supplierGstin: '29AABCS1234F1Z5',
        buyerGstin: '29BUYER001KA1Z5',
        hsn: '7208',
    },
    {
        invoiceNo: 'INV002',
        date: '2025-04-08',
        taxableValue: 250000,
        cgst: 0,
        sgst: 0,
        igst: 45000,
        gstAmount: 45000,
        supplierGstin: '29AABCS1234F1Z5',
        buyerGstin: '27BUYER002MH1Z3',
        hsn: '7210',
    },
];
