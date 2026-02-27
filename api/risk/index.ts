import { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../../backend/src/database';
import { withCors, withErrorHandler } from '../middleware';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = db.getSession();
    try {
        const result = await session.run(`
            MATCH (t:Taxpayer {type: 'SUPPLIER'})
            RETURN {
                gstin: t.gstin,
                name: t.name,
                riskScore: t.riskScore,
                riskLevel: CASE 
                    WHEN t.riskScore < 0.3 THEN 'LOW'
                    WHEN t.riskScore < 0.7 THEN 'MEDIUM'
                    ELSE 'HIGH'
                END
            } as vendor
            LIMIT 100
        `);

        const vendors = result.records.map(r => r.get('vendor'));
        res.status(200).json({ vendors, total: vendors.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
};

export default withCors(withErrorHandler(handler));
