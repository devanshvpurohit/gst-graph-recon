import { VercelRequest, VercelResponse } from '@vercel/node';
import { loadGSTR1 } from '../../backend/src/ingestion/gstr1_loader';

export default async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const result = await loadGSTR1(req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
