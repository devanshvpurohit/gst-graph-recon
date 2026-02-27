import db from '../database';

export async function loadGSTR1(data: any): Promise<any> {
    const session = db.getSession();
    try {
        const tx = session.beginTransaction();
        const supplier = data.supplier;
        const returnsInfo = data.returns_info;
        const period = returnsInfo.period;
        const status = returnsInfo.status;

        // 1. Create/Update Supplier
        await tx.run(`
      MERGE (t:Taxpayer {gstin: $gstin})
      ON CREATE SET t.name = $name, t.state = $state, t.type = 'SUPPLIER', t.riskScore = 0.0
      ON MATCH SET t.name = $name
    `, {
            gstin: supplier.gstin,
            name: supplier.name,
            state: supplier.state
        });

        // 2. Create/Update GSTR-1 Return Node
        await tx.run(`
      MATCH (t:Taxpayer {gstin: $gstin})
      MERGE (r:Return {returnType: 'GSTR1', period: $period, gstin: $gstin})
      ON CREATE SET r.status = $status, r.filingDate = $filingDate
      ON MATCH SET r.status = $status
      MERGE (t)-[:FILES]->(r)
    `, {
            gstin: supplier.gstin,
            period: period,
            status: status,
            filingDate: returnsInfo.filingDate
        });

        // 3. Process Invoices
        for (const inv of data.invoices) {
            // Create/Update Buyer
            await tx.run(`
        MERGE (b:Taxpayer {gstin: $buyerGstin})
        ON CREATE SET b.type = 'BUYER', b.riskScore = 0.0
      `, { buyerGstin: inv.buyerGstin });

            // Create/Update Invoice
            await tx.run(`
        MATCH (r:Return {returnType: 'GSTR1', period: $period, gstin: $supplierGstin})
        MERGE (i:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})
        ON CREATE SET i.date = $date, i.taxableValue = $taxableValue, i.gstAmount = $gstAmount, i.buyerGstin = $buyerGstin
        ON MATCH SET i.taxableValue = $taxableValue, i.gstAmount = $gstAmount
        MERGE (r)-[:DECLARES]->(i)
      `, {
                period: period,
                supplierGstin: supplier.gstin,
                invoiceNo: inv.invoiceNo,
                date: inv.date,
                taxableValue: inv.taxableValue,
                gstAmount: inv.gstAmount,
                buyerGstin: inv.buyerGstin
            });
        }

        await tx.commit();
        return { status: "success", invoicesProcessed: data.invoices.length };
    } catch (error) {
        console.error("GSTR-1 Load Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
