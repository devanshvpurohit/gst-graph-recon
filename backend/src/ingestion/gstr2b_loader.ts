import db from '../database';

export async function loadGSTR2B(data: any): Promise<any> {
    const session = db.getSession();
    try {
        const tx = session.beginTransaction();
        const period = data.period;
        const buyer = data.buyer;

        // 1. Create/Update Buyer
        await tx.run(`
      MERGE (t:Taxpayer {gstin: $gstin})
      ON CREATE SET t.name = $name, t.state = $state, t.type = 'BUYER', t.riskScore = 0.0
      ON MATCH SET t.name = $name
    `, {
            gstin: buyer.gstin,
            name: buyer.name,
            state: buyer.state
        });

        // 2. Create GSTR-2B Return Node
        await tx.run(`
      MATCH (t:Taxpayer {gstin: $gstin})
      MERGE (r:Return {returnType: 'GSTR2B', period: $period, gstin: $gstin})
      ON CREATE SET r.status = 'AVAILABLE', r.totalItcAvailable = $totalItc
      ON MATCH SET r.totalItcAvailable = $totalItc
      MERGE (t)-[:FILES]->(r)
    `, {
            gstin: buyer.gstin,
            period: period,
            totalItc: data.totalItcAvailable
        });

        // 3. Link Invoices to GSTR-2B
        for (const inv of data.invoices) {
            await tx.run(`
        MATCH (r:Return {returnType: 'GSTR2B', period: $period, gstin: $buyerGstin})
        MERGE (i:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})
        ON CREATE SET i.taxableValue = $taxableValue, i.gstAmount = $gstAmount, i.buyerGstin = $buyerGstin
        MERGE (i)-[:REFLECTED_IN]->(r)
      `, {
                period: period,
                buyerGstin: buyer.gstin,
                supplierGstin: inv.supplierGstin,
                invoiceNo: inv.invoiceNo,
                taxableValue: inv.taxableValue,
                gstAmount: inv.gstAmount
            });
        }

        await tx.commit();
        return { status: "success", invoicesProcessed: data.invoices.length };
    } catch (error) {
        console.error("GSTR-2B Load Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
