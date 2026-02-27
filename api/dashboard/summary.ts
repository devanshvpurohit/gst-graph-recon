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
            MATCH (i:Invoice)
            WITH COUNT(i) as totalInvoices
            MATCH (t:Taxpayer)
            WITH totalInvoices, COUNT(t) as taxpayers
            MATCH (r:Return)
            WITH totalInvoices, taxpayers, COUNT(r) as returns
            RETURN {
                totalInvoices: totalInvoices,
                taxpayers: taxpayers,
                returns: returns,
                totalItcReconciled: totalInvoices,
                totalMismatches: 0,
                invoicesProcessed: totalInvoices
            } as summary
        `);

        const summary = result.records[0]?.get('summary') || {
            totalInvoices: 0,
            taxpayers: 0,
            returns: 0,
            totalItcReconciled: 0,
            totalMismatches: 0,
            invoicesProcessed: 0,
        };

        res.status(200).json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
};

export default withCors(withErrorHandler(handler));
