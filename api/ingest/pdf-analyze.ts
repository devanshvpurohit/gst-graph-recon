import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import { withCors, withErrorHandler } from '../../api/middleware';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma:3b';

interface PDFAnalysisResult {
    extractedText: string;
    invoiceData: {
        invoiceNo?: string;
        date?: string;
        supplierGstin?: string;
        buyerGstin?: string;
        taxableValue?: number;
        gstAmount?: number;
        hsn?: string;
    };
    aiAnalysis: string;
    confidence: number;
    warnings: string[];
}

async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error: any) {
        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
}

async function parseInvoiceWithAI(pdfText: string): Promise<PDFAnalysisResult> {
    try {
        const prompt = `You are an expert invoice parser. Extract invoice details from the following PDF text and return ONLY valid JSON (no markdown, no code blocks).

PDF Text:
${pdfText.substring(0, 2000)}

Return a JSON object with these fields (use null for missing values):
{
  "invoiceNo": "invoice number",
  "date": "YYYY-MM-DD format",
  "supplierGstin": "15 digit GSTIN",
  "buyerGstin": "15 digit GSTIN",
  "taxableValue": number,
  "gstAmount": number,
  "hsn": "HSN code",
  "analysis": "brief analysis of invoice validity",
  "confidence": 0.0 to 1.0,
  "warnings": ["list of any issues found"]
}

IMPORTANT: Return ONLY the JSON object, no other text.`;

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: MODEL,
                prompt,
                stream: false,
                temperature: 0.2,
            },
            { timeout: 30000 }
        );

        const responseText = response.data.response.trim();
        let jsonStr = responseText;

        if (responseText.includes('```json')) {
            jsonStr = responseText.split('```json')[1].split('```')[0].trim();
        } else if (responseText.includes('```')) {
            jsonStr = responseText.split('```')[1].split('```')[0].trim();
        }

        const parsed = JSON.parse(jsonStr);

        return {
            extractedText: pdfText.substring(0, 1000),
            invoiceData: {
                invoiceNo: parsed.invoiceNo,
                date: parsed.date,
                supplierGstin: parsed.supplierGstin,
                buyerGstin: parsed.buyerGstin,
                taxableValue: parsed.taxableValue,
                gstAmount: parsed.gstAmount,
                hsn: parsed.hsn,
            },
            aiAnalysis: parsed.analysis || 'Invoice parsed successfully',
            confidence: parsed.confidence || 0.7,
            warnings: parsed.warnings || [],
        };
    } catch (error: any) {
        console.error('AI parsing error:', error.message);
        throw new Error(`Failed to parse invoice with AI: ${error.message}`);
    }
}

async function validateInvoiceData(invoiceData: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (invoiceData.supplierGstin && !/^\d{15}$/.test(invoiceData.supplierGstin)) {
        errors.push('Invalid supplier GSTIN format (must be 15 digits)');
    }
    if (invoiceData.buyerGstin && !/^\d{15}$/.test(invoiceData.buyerGstin)) {
        errors.push('Invalid buyer GSTIN format (must be 15 digits)');
    }

    if (invoiceData.date && !/^\d{4}-\d{2}-\d{2}$/.test(invoiceData.date)) {
        warnings.push('Date format may be incorrect (expected YYYY-MM-DD)');
    }

    if (invoiceData.taxableValue && invoiceData.taxableValue < 0) {
        errors.push('Taxable value cannot be negative');
    }
    if (invoiceData.gstAmount && invoiceData.gstAmount < 0) {
        errors.push('GST amount cannot be negative');
    }

    if (invoiceData.taxableValue && invoiceData.gstAmount) {
        const expectedGst = invoiceData.taxableValue * 0.18;
        const difference = Math.abs(invoiceData.gstAmount - expectedGst);
        if (difference > invoiceData.taxableValue * 0.05) {
            warnings.push('GST amount does not match expected 18% calculation');
        }
    }

    if (!invoiceData.invoiceNo) {
        warnings.push('Invoice number not found');
    }
    if (!invoiceData.supplierGstin) {
        warnings.push('Supplier GSTIN not found');
    }
    if (!invoiceData.buyerGstin) {
        warnings.push('Buyer GSTIN not found');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

async function generateComplianceReport(invoiceData: any, extractedText: string): Promise<string> {
    try {
        const prompt = `You are a GST compliance expert. Review this extracted invoice data and provide a brief compliance assessment (2-3 sentences).

Invoice Data:
- Invoice No: ${invoiceData.invoiceNo || 'Not found'}
- Date: ${invoiceData.date || 'Not found'}
- Supplier GSTIN: ${invoiceData.supplierGstin || 'Not found'}
- Buyer GSTIN: ${invoiceData.buyerGstin || 'Not found'}
- Taxable Value: ₹${invoiceData.taxableValue || 'Not found'}
- GST Amount: ₹${invoiceData.gstAmount || 'Not found'}

Extracted Text (first 500 chars):
${extractedText.substring(0, 500)}

Provide:
1. Overall compliance status
2. Any red flags or concerns
3. Recommended next steps

Be concise and professional.`;

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: MODEL,
                prompt,
                stream: false,
                temperature: 0.3,
            },
            { timeout: 30000 }
        );

        return response.data.response || 'Compliance assessment unavailable';
    } catch (error: any) {
        console.error('Compliance report error:', error.message);
        return 'Unable to generate compliance report';
    }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get PDF buffer from request body (base64 encoded)
        const { pdfBase64 } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: 'PDF data is required' });
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Step 1: Extract text from PDF
        console.log('Extracting text from PDF...');
        const extractedText = await extractPDFText(pdfBuffer);

        // Step 2: Parse invoice data with AI
        console.log('Parsing invoice data with AI...');
        const analysisResult = await parseInvoiceWithAI(extractedText);

        // Step 3: Validate extracted data
        console.log('Validating invoice data...');
        const validation = await validateInvoiceData(analysisResult.invoiceData);

        // Step 4: Generate compliance report
        console.log('Generating compliance report...');
        const complianceReport = await generateComplianceReport(
            analysisResult.invoiceData,
            extractedText
        );

        res.status(200).json({
            success: true,
            data: analysisResult,
            validation,
            complianceReport,
        });
    } catch (error: any) {
        console.error('PDF analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'PDF analysis failed',
            hint: 'Ensure Ollama is running with Gemma model: ollama run gemma:3b',
        });
    }
};

export default withCors(withErrorHandler(handler));
