import { Router } from 'express';
import db from '../database';

const router = Router();

router.get('/summary', async (req, res) => {
    const session = db.getSession();
    try {
        // Basic aggregation
        const q1 = await session.run(`MATCH (t:Taxpayer) RETURN count(t) AS count`);
        const taxpayers = q1.records[0]?.get('count').toNumber() || 0;

        const q2 = await session.run(`MATCH (i:Invoice) RETURN count(i) AS count`);
        const invoicesProcessed = q2.records[0]?.get('count').toNumber() || 0;

        // Approximating ITC Reconciled (Normally calculated via full engine run)
        const q3 = await session.run(`
      MATCH (i:Invoice)-[:REFLECTED_IN]->(:Return)
      RETURN sum(i.taxableValue * 0.18) AS totalItc
    `);
        const totalItcReconciled = q3.records[0]?.get('totalItc') || 0;

        const q4 = await session.run(`
      MATCH (i:Invoice)
      WHERE NOT (i)-[:HAS_IRN]->(:IRN {status: 'ACTIVE'}) OR NOT EXISTS((:Return)-[:DECLARES]->(i))
      RETURN sum(i.taxableValue * 0.18) AS mismatchItc
    `);
        const totalMismatches = q4.records[0]?.get('mismatchItc') || 0;

        res.json({
            totalItcReconciled,
            totalMismatches,
            invoicesProcessed,
            taxpayers
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

export default router;
