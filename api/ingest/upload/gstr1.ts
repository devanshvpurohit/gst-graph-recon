import { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { loadGSTR1 } from '../../../backend/src/ingestion/gstr1_loader';
import { withCors, withErrorHandler } from '../../middleware';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = new IncomingForm();
        const [fields, files] = await form.parse(req);

        const fileArray = files.file;
        if (!fileArray || fileArray.length === 0) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = fileArray[0];
        const fileContent = fs.readFileSync(file.filepath, 'utf-8');
        const data = JSON.parse(fileContent);

        const result = await loadGSTR1(data);

        // Clean up
        fs.unlinkSync(file.filepath);

        res.status(200).json({ ...result, fileName: file.originalFilename });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export default withCors(withErrorHandler(handler));
