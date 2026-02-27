import db from '../database';

export async function generateAuditTrail(invoiceNo: string) {
    const session = db.getSession();
    try {
        const result = await session.run(`
      MATCH (i:Invoice {invoiceNo: $invoiceNo})
      OPTIONAL MATCH (r1:Return {returnType: 'GSTR1'})-[:DECLARES]->(i)
      OPTIONAL MATCH (sup:Taxpayer)-[:FILES]->(r1)
      OPTIONAL MATCH (i)-[:HAS_IRN]->(irn:IRN)
      OPTIONAL MATCH (i)-[:REFLECTED_IN]->(r2b:Return {returnType: 'GSTR2B'})
      OPTIONAL MATCH (buy:Taxpayer)-[:FILES]->(r2b)
      RETURN 
        sup.gstin AS supplierGstin, sup.name AS supplierName,
        buy.gstin AS buyerGstin,
        r1.status AS gstr1Status,
        irn.status AS irnStatus, irn.generationDate AS irnDate,
        r2b IS NOT NULL AS inGstr2b
    `, { invoiceNo });

        if (result.records.length === 0) {
            throw new Error(`Invoice ${invoiceNo} not found`);
        }

        const record = result.records[0];
        const data = {
            supplierGstin: record.get('supplierGstin') || 'UNKNOWN',
            supplierName: record.get('supplierName') || 'Unknown Supplier',
            buyerGstin: record.get('buyerGstin') || 'UNKNOWN',
            gstr1Status: record.get('gstr1Status'),
            irnStatus: record.get('irnStatus'),
            inGstr2b: record.get('inGstr2b')
        };

        const structuredReasoning = [];
        const recommendedActions = [];
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let failures = 0;

        // Step 1: Supplier Identity
        structuredReasoning.push({
            step: 1,
            check: "Supplier Identity",
            status: data.supplierGstin !== 'UNKNOWN' ? "PASS" : "FAIL",
            detail: `Supplier GSTIN: ${data.supplierGstin}`
        });

        // Step 2: GSTR-1
        if (data.gstr1Status === 'FILED') {
            structuredReasoning.push({ step: 2, check: "GSTR-1 Filing", status: "PASS", detail: "Supplier filed GSTR-1 successfully" });
        } else {
            structuredReasoning.push({ step: 2, check: "GSTR-1 Filing", status: "FAIL", detail: `GSTR-1 status is ${data.gstr1Status || 'MISSING'}` });
            recommendedActions.push("Contact supplier immediately to file missing returns");
            riskLevel = 'HIGH';
            failures++;
        }

        // Step 3: IRN
        if (data.irnStatus === 'ACTIVE') {
            structuredReasoning.push({ step: 3, check: "IRN Verification", status: "PASS", detail: "Active IRN exists" });
        } else {
            structuredReasoning.push({ step: 3, check: "IRN Verification", status: "FAIL", detail: `IRN missing or status is ${data.irnStatus}` });
            recommendedActions.push("Validate e-invoice generation with supplier ERP");
            if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
            failures++;
        }

        // Contextual sentence
        const plainEnglish = `Invoice ${invoiceNo} from ${data.supplierName} was reviewed. ` +
            (failures === 0
                ? "All checks passed successfully. ITC is fully eligible."
                : `Validation failed due to ${failures} critical issues affecting ITC eligibility.`);

        if (failures === 0) {
            recommendedActions.push("Proceed with ITC claim");
        } else if (riskLevel === 'HIGH') {
            recommendedActions.push("Suspend payment until compliance issues are resolved");
        }

        return {
            invoiceNo,
            supplierGSTIN: data.supplierGstin,
            buyerGSTIN: data.buyerGstin,
            structuredReasoning,
            plainEnglish,
            recommendedActions,
            riskLevel
        };

    } finally {
        await session.close();
    }
}
