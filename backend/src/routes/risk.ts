import { Router } from 'express';
import { calculateVendorRisk } from '../risk/scoring';
import db from '../database';

const router = Router();

router.get('/:gstin', async (req, res) => {
    try {
        const result = await calculateVendorRisk(req.params.gstin);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    // Get all taxpayers and calculate their risk
    const session = db.getSession();
    try {
        const query = await session.run(`MATCH (t:Taxpayer {type: 'SUPPLIER'}) RETURN t.gstin AS gstin`);
        const gstins = query.records.map(r => r.get('gstin'));

        const vendors = [];
        for (const gstin of gstins) {
            vendors.push(await calculateVendorRisk(gstin));
        }

        // Sort by riskScore descending
        vendors.sort((a, b) => b.riskScore - a.riskScore);

        res.json({ total: vendors.length, vendors });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

export default router;
