import { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../backend/src/database';

export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        const session = db.getSession();
        await session.run('RETURN 1');
        await session.close();
        res.status(200).json({ api: 'vercel_healthy', neo4j: 'connected' });
    } catch (err) {
        res.status(500).json({ api: 'vercel_healthy', neo4j: 'disconnected', error: err });
    }
};
