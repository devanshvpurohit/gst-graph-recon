import express from 'express';
import cors from 'cors';
import db from './database';

import ingestRoutes from './routes/ingest';
import reconciliationRoutes from './routes/reconciliation';
import riskRoutes from './routes/risk';
import auditRoutes from './routes/audit';
import analyticsRoutes from './routes/analytics';
import dashboardRoutes from './routes/dashboard';
import aiRoutes from './routes/ai';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', async (req, res) => {
    try {
        const session = db.getSession();
        await session.run('RETURN 1');
        await session.close();
        res.json({ api: 'node_healthy', neo4j: 'connected' });
    } catch (err) {
        res.status(500).json({ api: 'node_healthy', neo4j: 'disconnected' });
    }
});

// API Routes
app.use('/ingest', ingestRoutes);
app.use('/reconcile', reconciliationRoutes);
app.use('/risk', riskRoutes);
app.use('/audit', auditRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ai', aiRoutes);

app.listen(port, async () => {
    console.log(`🚀 GST Engine Node.js Server running on port ${port}`);
    await db.initConstraints();
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await db.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await db.close();
    process.exit(0);
});
