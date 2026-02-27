import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAuditTrail } from '../../backend/src/audit/explainer';
import { withCors, withErrorHandler } from '../middleware';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { invoiceNo } = req.query;

    if (!invoiceNo) {
        return res.status(400).json({ error: 'Missing invoiceNo' });
    }

    try {
        const result = await generateAuditTrail(invoiceNo as string);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export default withCors(withErrorHandler(handler));
