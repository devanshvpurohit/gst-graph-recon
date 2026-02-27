import { useState } from 'react';
import axios from 'axios';

type UploadType = 'gstr1' | 'gstr2b' | 'einvoice' | 'purchase-register';

interface UploadStatus {
    type: UploadType | null;
    loading: boolean;
    success: boolean;
    error: string | null;
    message: string | null;
}

export default function Upload() {
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
        type: null,
        loading: false,
        success: false,
        error: null,
        message: null,
    });

    const uploadTypes: { id: UploadType; label: string; description: string }[] = [
        { id: 'gstr1', label: 'GSTR-1 (Supplier)', description: 'Upload supplier GSTR-1 returns' },
        { id: 'gstr2b', label: 'GSTR-2B (Buyer)', description: 'Upload buyer GSTR-2B returns' },
        { id: 'einvoice', label: 'E-Invoice', description: 'Upload e-invoice IRN data' },
        { id: 'purchase-register', label: 'Purchase Register', description: 'Upload purchase register & ledger' },
    ];

    const handleFileUpload = async (type: UploadType, file: File) => {
        setUploadStatus({ type, loading: true, success: false, error: null, message: null });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${apiUrl}/ingest/upload/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setUploadStatus({
                type,
                loading: false,
                success: true,
                error: null,
                message: `✓ ${response.data.fileName} uploaded successfully. Processed ${response.data.invoicesProcessed || 0} records.`,
            });
        } catch (error: any) {
            setUploadStatus({
                type,
                loading: false,
                success: false,
                error: error.response?.data?.error || error.message,
                message: null,
            });
        }
    };

    const handleDrop = (e: React.DragEvent, type: UploadType) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(type, file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: UploadType) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(type, file);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Upload Bills & Returns</h1>
                <p className="text-slate-400">Import GST returns, invoices, and purchase registers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uploadTypes.map((uploadType) => (
                    <div
                        key={uploadType.id}
                        className="bg-surface-900/50 border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
                    >
                        <h3 className="text-lg font-semibold text-white mb-1">{uploadType.label}</h3>
                        <p className="text-sm text-slate-400 mb-4">{uploadType.description}</p>

                        <label
                            onDrop={(e) => handleDrop(e, uploadType.id)}
                            onDragOver={(e) => e.preventDefault()}
                            className="block"
                        >
                            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors">
                                <svg
                                    className="w-8 h-8 mx-auto mb-2 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                <p className="text-sm text-slate-300">
                                    {uploadStatus.type === uploadType.id && uploadStatus.loading
                                        ? 'Uploading...'
                                        : 'Drag & drop or click to upload'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">JSON, CSV, or Excel</p>
                            </div>
                            <input
                                type="file"
                                accept=".json,.csv,.xlsx,.xls"
                                onChange={(e) => handleChange(e, uploadType.id)}
                                className="hidden"
                                disabled={uploadStatus.loading}
                            />
                        </label>

                        {uploadStatus.type === uploadType.id && (
                            <div className="mt-4">
                                {uploadStatus.loading && (
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <div className="animate-spin rounded-full h-4 w-4 border border-blue-400 border-t-transparent"></div>
                                        <span className="text-sm">Processing...</span>
                                    </div>
                                )}
                                {uploadStatus.success && (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-sm">
                                        {uploadStatus.message}
                                    </div>
                                )}
                                {uploadStatus.error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                                        {uploadStatus.error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-surface-900/50 border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">File Format Guide</h3>
                <div className="space-y-3 text-sm text-slate-300">
                    <div>
                        <p className="font-medium text-white mb-1">GSTR-1 & GSTR-2B</p>
                        <p className="text-slate-400">JSON format with supplier/buyer info and invoice details</p>
                    </div>
                    <div>
                        <p className="font-medium text-white mb-1">E-Invoice</p>
                        <p className="text-slate-400">JSON with IRN (Invoice Reference Number) and invoice data</p>
                    </div>
                    <div>
                        <p className="font-medium text-white mb-1">Purchase Register</p>
                        <p className="text-slate-400">JSON with purchase transactions and ledger entries</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
