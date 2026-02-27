import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateNetworkRisk } from '../../backend/src/analytics/network';
import { withCors, withErrorHandler } from '../middleware';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const result = await calculateNetworkRisk();
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export default withCors(withErrorHandler(handler));
