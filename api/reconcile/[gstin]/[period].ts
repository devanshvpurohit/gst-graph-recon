import { VercelRequest, VercelResponse } from '@vercel/node';
import { validateITCChain } from '../../../backend/src/reconciliation/engine';
import { withCors, withErrorHandler } from '../../middleware';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { gstin, period } = req.query;

    if (!gstin || !period) {
        return res.status(400).json({ error: 'Missing gstin or period' });
    }

    try {
        const result = await validateITCChain(gstin as string, period as string);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export default withCors(withErrorHandler(handler));
