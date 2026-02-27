import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { withCors, withErrorHandler } from '../../api/middleware';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'gemma:3b';

interface AnalysisRequest {
    type: 'risk' | 'audit' | 'recommendation' | 'insights';
    data: any;
}

async function callGemma(prompt: string, temperature: number = 0.3): Promise<string> {
    try {
        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: MODEL,
                prompt,
                stream: false,
                temperature,
            },
            { timeout: 30000 }
        );

        return response.data.response || 'No response generated';
    } catch (error: any) {
        console.error('Gemma API Error:', error.message);
        throw new Error(`Gemma analysis failed: ${error.message}`);
    }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { type, data } = req.body as AnalysisRequest;

        if (!type || !data) {
            return res.status(400).json({ error: 'Missing type or data' });
        }

        let analysis = '';

        switch (type) {
            case 'risk': {
                const invoices = data.invoices || [];
                const prompt = `You are a GST compliance expert. Analyze these ${invoices.length} invoices for risk:

${invoices
    .slice(0, 5)
    .map(
        (inv: any, i: number) => `
Invoice ${i + 1}:
- Invoice No: ${inv.invoiceNo}
- Date: ${inv.date}
- Supplier GSTIN: ${inv.supplierGstin}
- Buyer GSTIN: ${inv.buyerGstin}
- Taxable Value: ₹${inv.taxableValue}
- GST Amount: ₹${inv.gstAmount}
`
    )
    .join('\n')}

Provide a brief risk assessment (2-3 sentences) highlighting:
1. Overall compliance status
2. Any red flags or concerns
3. Recommended actions

Be concise and professional.`;

                analysis = await callGemma(prompt, 0.3);
                break;
            }

            case 'audit': {
                const prompt = `You are a GST auditor. Explain this audit finding in simple terms:

Invoice: ${data.invoiceNo}
Supplier: ${data.supplierGSTIN}
Buyer: ${data.buyerGSTIN}
Risk Level: ${data.riskLevel}
Status: ${data.status}

Issues Found:
${data.rootCause?.map((cause: string) => `- ${cause}`).join('\n') || 'None'}

Provide:
1. Why this invoice is flagged (if applicable)
2. Compliance implications for ITC claim
3. Immediate next steps

Keep it brief and actionable.`;

                analysis = await callGemma(prompt, 0.3);
                break;
            }

            case 'recommendation': {
                const prompt = `You are a GST compliance advisor. Based on this risk analysis, provide 3-5 specific recommendations:

Risk Score: ${data.riskScore}
Risk Level: ${data.riskLevel}
Issues: ${data.reasoning?.join(', ') || 'None identified'}

Provide recommendations as a numbered list. Each recommendation should be:
- Specific and actionable
- Focused on reducing risk
- Realistic to implement

Format: 
1. [Recommendation]
2. [Recommendation]
etc.`;

                analysis = await callGemma(prompt, 0.4);
                break;
            }

            case 'insights': {
                const prompt = `You are a GST analytics expert. Provide a brief executive summary (2-3 sentences) of this GST reconciliation data:

Total Invoices: ${data.totalInvoices}
Matched: ${data.matchedInvoices}
Mismatched: ${data.mismatchedInvoices}
Total ITC: ₹${data.totalITC}
Eligible ITC: ₹${data.eligibleITC}
High Risk ITC: ₹${data.highRiskITC}

Focus on:
1. Overall compliance status
2. Key risks or opportunities
3. Priority actions

Be concise and actionable.`;

                analysis = await callGemma(prompt, 0.3);
                break;
            }

            default:
                return res.status(400).json({ error: 'Invalid analysis type' });
        }

        res.status(200).json({ analysis, type });
    } catch (error: any) {
        console.error('Analysis Error:', error);
        res.status(500).json({
            error: error.message || 'Analysis failed',
            hint: 'Ensure Ollama is running with Gemma model: ollama run gemma:3b',
        });
    }
};

export default withCors(withErrorHandler(handler));
