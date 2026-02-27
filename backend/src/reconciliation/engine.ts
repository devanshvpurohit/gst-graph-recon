import db from '../database';

export interface ReconciliationResult {
    invoiceNo: string;
    supplierGSTIN: string;
    buyerGSTIN: string;
    status: 'VALID' | 'MISMATCH';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    rootCause: string[];
    details: any[];
}

export async function validateITCChain(buyerGstin: string, period: string): Promise<ReconciliationResult[]> {
    const session = db.getSession();
    try {
        // 1. Get all invoices claimed by buyer in GSTR-2B
        const invoicesResult = await session.run(`
      MATCH (i:Invoice)-[:REFLECTED_IN]->(r2b:Return {returnType: 'GSTR2B', period: $period, gstin: $buyerGstin})
      RETURN i.invoiceNo AS invoiceNo, i.supplierGstin AS supplierGstin
    `, { period, buyerGstin });

        const results: ReconciliationResult[] = [];

        for (const record of invoicesResult.records) {
            const invoiceNo = record.get('invoiceNo');
            const supplierGstin = record.get('supplierGstin');

            const result: ReconciliationResult = {
                invoiceNo,
                supplierGSTIN: supplierGstin,
                buyerGSTIN: buyerGstin,
                status: 'VALID',
                riskLevel: 'LOW',
                rootCause: [],
                details: []
            };

            // 2. Check Supplier GSTR-1 Declaration
            const gstr1Check = await session.run(`
        MATCH (r1:Return {returnType: 'GSTR1', period: $period, gstin: $supplierGstin})-[:DECLARES]->(i:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})
        RETURN r1.status AS status
      `, { period, supplierGstin, invoiceNo });

            if (gstr1Check.records.length === 0) {
                result.status = 'MISMATCH';
                result.riskLevel = 'HIGH';
                result.rootCause.push("Missing GSTR-1 declaration by supplier");
            } else {
                const supplierStatus = gstr1Check.records[0].get('status');
                if (supplierStatus !== 'FILED') {
                    result.status = 'MISMATCH';
                    result.riskLevel = 'HIGH';
                    result.rootCause.push(`Supplier GSTR-1 status is ${supplierStatus}`);
                }
            }

            // 3. Check Active IRN
            const irnCheck = await session.run(`
        MATCH (i:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})-[:HAS_IRN]->(irn:IRN)
        RETURN irn.status AS status
      `, { invoiceNo, supplierGstin });

            if (irnCheck.records.length === 0) {
                result.status = 'MISMATCH';
                if (result.riskLevel === 'LOW') result.riskLevel = 'MEDIUM';
                result.rootCause.push("No active IRN found for invoice");
            } else {
                const irnStatus = irnCheck.records[0].get('status');
                if (irnStatus !== 'ACTIVE') {
                    result.status = 'MISMATCH';
                    result.riskLevel = 'HIGH';
                    result.rootCause.push(`IRN status is ${irnStatus}`);
                }
            }

            // 4. Value Mismatch Check (GSTR1 vs GSTR2B)
            const valueCheck = await session.run(`
        MATCH (r1:Return {returnType: 'GSTR1'})-[:DECLARES]->(i1:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})
        MATCH (i2:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})-[:REFLECTED_IN]->(r2b:Return {returnType: 'GSTR2B', gstin: $buyerGstin})
        WHERE i1.taxableValue <> i2.taxableValue OR i1.gstAmount <> i2.gstAmount
        RETURN i1.taxableValue AS sup_val, i2.taxableValue AS buy_val
      `, { invoiceNo, supplierGstin, buyerGstin });

            if (valueCheck.records.length > 0) {
                result.status = 'MISMATCH';
                result.riskLevel = 'HIGH';
                result.rootCause.push("Invoice value mismatch between supplier and buyer records");
            }

            results.push(result);
        }

        return results;
    } catch (error) {
        console.error("Reconciliation Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
