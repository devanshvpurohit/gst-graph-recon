import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { loadGSTR1 } from '../ingestion/gstr1_loader';
import { loadGSTR2B } from '../ingestion/gstr2b_loader';
import { loadEInvoice } from '../ingestion/einvoice_loader';
import { loadPurchaseRegister } from '../ingestion/purchase_register_loader';

const router = Router();

// Setup multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/json', 'text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const allowedExts = ['.json', '.csv', '.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JSON, CSV, and Excel files are allowed.'));
        }
    }
});

// JSON body endpoints (existing)
router.post('/gstr1', async (req, res) => {
    try {
        const result = await loadGSTR1(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/gstr2b', async (req, res) => {
    try {
        const result = await loadGSTR2B(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/einvoice', async (req, res) => {
    try {
        const result = await loadEInvoice(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/purchase-register', async (req, res) => {
    try {
        const result = await loadPurchaseRegister(req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// File upload endpoints
router.post('/upload/gstr1', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(fileContent);
        
        const result = await loadGSTR1(data);
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ ...result, fileName: req.file.originalname });
    } catch (error: any) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.post('/upload/gstr2b', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(fileContent);
        
        const result = await loadGSTR2B(data);
        
        fs.unlinkSync(req.file.path);
        res.json({ ...result, fileName: req.file.originalname });
    } catch (error: any) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.post('/upload/einvoice', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(fileContent);
        
        const result = await loadEInvoice(data);
        
        fs.unlinkSync(req.file.path);
        res.json({ ...result, fileName: req.file.originalname });
    } catch (error: any) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

router.post('/upload/purchase-register', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(fileContent);
        
        const result = await loadPurchaseRegister(data);
        
        fs.unlinkSync(req.file.path);
        res.json({ ...result, fileName: req.file.originalname });
    } catch (error: any) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

export default router;
