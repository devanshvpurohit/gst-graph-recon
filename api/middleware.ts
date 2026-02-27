import { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';

const corsMiddleware = cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

export const withCors = (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
        return new Promise((resolve) => {
            corsMiddleware(req as any, res as any, async () => {
                if (req.method === 'OPTIONS') {
                    res.status(200).end();
                    resolve(undefined);
                } else {
                    await handler(req, res);
                    resolve(undefined);
                }
            });
        });
    };
};

export const withErrorHandler = (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
        try {
            await handler(req, res);
        } catch (error: any) {
            console.error('API Error:', error);
            res.status(500).json({
                error: error.message || 'Internal server error',
                timestamp: new Date().toISOString(),
            });
        }
    };
};

export const withMethodCheck = (method: string, handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
        if (req.method !== method) {
            return res.status(405).json({ error: `Method ${req.method} not allowed` });
        }
        await handler(req, res);
    };
};
