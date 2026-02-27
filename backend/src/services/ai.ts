import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'gemma:3b'; // Using Gemma 3:1B model

interface AIAnalysisRequest {
    type: 'risk_analysis' | 'audit_explanation' | 'recommendation';
    data: any;
}

interface AIAnalysisResponse {
    analysis: string;
    confidence: number;
}

/**
 * Generate AI-powered risk analysis using Gemma 3:1B
 */
export async function analyzeRiskWithAI(invoices: any[]): Promise<string> {
    try {
        const prompt = `You are a GST compliance expert. Analyze these ${invoices.length} invoices for risk:

${invoices.map((inv, i) => `
Invoice ${i + 1}:
- Invoice No: ${inv.invoiceNo}
- Date: ${inv.date}
- Supplier GSTIN: ${inv.supplierGstin}
- Buyer GSTIN: ${inv.buyerGstin}
- Taxable Value: ₹${inv.taxableValue}
- GST Amount: ₹${inv.gstAmount}
`).join('\n')}

Provide a brief risk assessment (2-3 sentences) highlighting:
1. Overall compliance status
2. Any red flags or concerns
3. Recommended actions

Be concise and professional.`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt,
            stream: false,
            temperature: 0.3,
        });

        return response.data.response || 'Unable to generate analysis';
    } catch (error: any) {
        console.error('AI Analysis Error:', error.message);
        throw new Error(`Failed to generate AI analysis: ${error.message}`);
    }
}

/**
 * Generate audit trail explanation using Gemma 3:1B
 */
export async function generateAuditExplanation(auditData: any): Promise<string> {
    try {
        const prompt = `You are a GST auditor. Explain this audit finding in simple terms:

Invoice: ${auditData.invoiceNo}
Supplier: ${auditData.supplierGSTIN}
Buyer: ${auditData.buyerGSTIN}
Risk Level: ${auditData.riskLevel}
Status: ${auditData.status}

Issues Found:
${auditData.rootCause?.map((cause: string) => `- ${cause}`).join('\n') || 'None'}

Provide:
1. Why this invoice is flagged (if applicable)
2. Compliance implications for ITC claim
3. Immediate next steps

Keep it brief and actionable.`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt,
            stream: false,
            temperature: 0.3,
        });

        return response.data.response || 'Unable to generate explanation';
    } catch (error: any) {
        console.error('Audit Explanation Error:', error.message);
        throw new Error(`Failed to generate audit explanation: ${error.message}`);
    }
}

/**
 * Generate recommendations using Gemma 3:1B
 */
export async function generateRecommendations(riskData: any): Promise<string[]> {
    try {
        const prompt = `You are a GST compliance advisor. Based on this risk analysis, provide 3-5 specific recommendations:

Risk Score: ${riskData.riskScore}
Risk Level: ${riskData.riskLevel}
Issues: ${riskData.reasoning?.join(', ') || 'None identified'}

Provide recommendations as a numbered list. Each recommendation should be:
- Specific and actionable
- Focused on reducing risk
- Realistic to implement

Format: 
1. [Recommendation]
2. [Recommendation]
etc.`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt,
            stream: false,
            temperature: 0.4,
        });

        // Parse recommendations from response
        const text = response.data.response || '';
        const recommendations = text
            .split('\n')
            .filter((line: string) => /^\d+\./.test(line.trim()))
            .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
            .filter((line: string) => line.length > 0);

        return recommendations.length > 0 ? recommendations : ['Review compliance documentation', 'Verify GSTIN details', 'Check invoice dates'];
    } catch (error: any) {
        console.error('Recommendations Error:', error.message);
        return ['Review compliance documentation', 'Verify GSTIN details', 'Check invoice dates'];
    }
}

/**
 * Generate dashboard insights using Gemma 3:1B
 */
export async function generateDashboardInsights(summary: any): Promise<string> {
    try {
        const prompt = `You are a GST analytics expert. Provide a brief executive summary (2-3 sentences) of this GST reconciliation data:

Total Invoices: ${summary.totalInvoices}
Matched: ${summary.matchedInvoices}
Mismatched: ${summary.mismatchedInvoices}
Total ITC: ₹${summary.totalITC}
Eligible ITC: ₹${summary.eligibleITC}
High Risk ITC: ₹${summary.highRiskITC}

Focus on:
1. Overall compliance status
2. Key risks or opportunities
3. Priority actions

Be concise and actionable.`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt,
            stream: false,
            temperature: 0.3,
        });

        return response.data.response || 'Dashboard analysis unavailable';
    } catch (error: any) {
        console.error('Dashboard Insights Error:', error.message);
        return 'Dashboard analysis unavailable';
    }
}

/**
 * Check if Ollama is running and Gemma model is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        const models = response.data.models || [];
        const hasGemma = models.some((m: any) => m.name.includes('gemma'));
        return hasGemma;
    } catch (error) {
        console.warn('Ollama not available:', error instanceof Error ? error.message : 'Unknown error');
        return false;
    }
}
