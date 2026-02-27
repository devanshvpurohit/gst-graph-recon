import { Router } from 'express';
import axios from 'axios';

const router = Router();
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma:3b';

router.post('/analyze/vendor', async (req, res) => {
    try {
        const { vendorData } = req.body;

        if (!vendorData) {
            return res.status(400).json({ error: 'Vendor data is required' });
        }

        const prompt = `
You are an expert GST (Goods and Services Tax) Compliance Analyst and Risk Assessor.
Analyze the following vendor risk profile and provide a concise, professional summary 
of the risks and actionable recommendations for the buyer.

Vendor Information:
- Name: ${vendorData.name}
- GSTIN: ${vendorData.gstin}
- Risk Score: ${Math.round(vendorData.riskScore * 100)}/100
- Risk Level: ${vendorData.riskLevel}

Risk Components:
- Filing Delay: ${Math.round(vendorData.components.filingDelay * 100)}%
- Mismatch Ratio: ${Math.round(vendorData.components.mismatchRatio * 100)}%
- IRN Missing Ratio: ${Math.round(vendorData.components.irnMissingRatio * 100)}%
- Tax Default Indicator: ${Math.round(vendorData.components.taxDefault * 100)}%
- Network Risk: ${Math.round(vendorData.components.networkRisk * 100)}%

System Recommendation: ${vendorData.recommendation}

Provide your analysis in 3 short paragraphs:
1. Overall Risk Assessment
2. Key Problem Areas (based on the components)
3. Actionable Next Steps for the Buyer
`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt: prompt,
            stream: false,
            temperature: 0.3
        });

        res.json({ analysis: response.data.response });
    } catch (error: any) {
        console.error("Ollama API Error:", error.message);
        res.status(502).json({ error: 'Failed to communicate with Ollama AI Agent: ' + error.message });
    }
});

router.post('/analyze/invoice', async (req, res) => {
    try {
        const { auditTrail } = req.body;

        if (!auditTrail) {
            return res.status(400).json({ error: 'Audit trail data is required' });
        }

        const prompt = `
You are an expert GST (Goods and Services Tax) Auditor.
Review the following invoice reconciliation audit trail and provide a brief 
compliance assessment and specific next steps.

Invoice: ${auditTrail.invoiceNo}
Supplier GSTIN: ${auditTrail.supplierGSTIN}
Buyer GSTIN: ${auditTrail.buyerGSTIN}

System Risk Level: ${auditTrail.riskLevel}
System Summary: ${auditTrail.plainEnglish}

Detailed Checks:
${auditTrail.structuredReasoning.map((s: any) => `- Step ${s.step}: ${s.check} -> [${s.status}] ${s.detail}`).join('\n')}

System Recommended Actions:
${auditTrail.recommendedActions.map((a: string) => `- ${a}`).join('\n')}

Based on this audit trail, provide:
1. A brief explanation of why this invoice was flagged (or why it passed).
2. What the compliance implications are for the buyer claiming Input Tax Credit (ITC).
3. The immediate legal or operational next step the buyer should take.
Keep it strictly factual and professional.
`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL,
            prompt: prompt,
            stream: false,
            temperature: 0.3
        });

        res.json({ analysis: response.data.response });
    } catch (error: any) {
        console.error("Ollama API Error:", error.message);
        res.status(502).json({ error: 'Failed to communicate with Ollama AI Agent: ' + error.message });
    }
});

export default router;
