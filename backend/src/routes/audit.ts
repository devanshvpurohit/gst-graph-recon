import { Router } from 'express';
import { generateAuditTrail } from '../audit/explainer';

const router = Router();

router.get('/:invoiceNo', async (req, res) => {
    try {
        const result = await generateAuditTrail(req.params.invoiceNo);
        res.json(result);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

export default router;
