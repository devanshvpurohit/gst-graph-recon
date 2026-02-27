import { Router } from 'express';
import { calculateNetworkRisk } from '../analytics/network';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await calculateNetworkRisk();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
