import { Router } from 'express';
import { validateITCChain } from '../reconciliation/engine';

const router = Router();

router.get('/:buyerGstin/:period', async (req, res) => {
    try {
        const { buyerGstin, period } = req.params;
        const results = await validateITCChain(buyerGstin, period);

        const validCount = results.filter(r => r.status === 'VALID').length;
        const mismatchCount = results.length - validCount;

        res.json({
            buyerGSTIN: buyerGstin,
            period,
            totalInvoices: results.length,
            validCount,
            mismatchCount,
            results
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
