import fs from 'fs';
import path from 'path';
import { loadGSTR1 } from './ingestion/gstr1_loader';
import { loadGSTR2B } from './ingestion/gstr2b_loader';
import { loadEInvoice } from './ingestion/einvoice_loader';
import { loadPurchaseRegister } from './ingestion/purchase_register_loader';
import db from './database';

async function seedDatabase() {
    console.log('🌱 Starting database seeding process...');

    try {
        await db.initConstraints();

        const dataPath = path.join(__dirname, '../data/mock_dataset.json');
        if (!fs.existsSync(dataPath)) {
            console.warn('⚠️ No mock_dataset.json found. Skipping seeding.');
            return;
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const dataset = JSON.parse(rawData);

        console.log('Loading GSTR-1 Data...');
        if (dataset.gstr1_filings && Array.isArray(dataset.gstr1_filings)) {
            for (const data of dataset.gstr1_filings) {
                await loadGSTR1(data);
            }
        }

        console.log('Loading e-Invoice Data...');
        if (dataset.einvoice_data && Array.isArray(dataset.einvoice_data)) {
            for (const data of dataset.einvoice_data) {
                await loadEInvoice(data);
            }
        }

        console.log('Loading Purchase Register Data...');
        if (dataset.purchase_register_data && Array.isArray(dataset.purchase_register_data)) {
            for (const data of dataset.purchase_register_data) {
                await loadPurchaseRegister(data);
            }
        }

        console.log('Loading GSTR-2B Data...');
        if (dataset.gstr2b_data && Array.isArray(dataset.gstr2b_data)) {
            for (const data of dataset.gstr2b_data) {
                await loadGSTR2B(data);
            }
        }

        console.log('✅ Database seeding complete. Application is dynamic and ready!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await db.close();
    }
}

seedDatabase();
