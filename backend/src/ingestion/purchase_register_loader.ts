import db from '../database';

export async function loadPurchaseRegister(data: any): Promise<any> {
    const session = db.getSession();
    try {
        const tx = session.beginTransaction();
        const period = data.period;
        const buyerGstin = data.buyerGstin;

        // 1. Create GSTR-3B Node
        await tx.run(`
      MATCH (t:Taxpayer {gstin: $gstin})
      MERGE (r:Return {returnType: 'GSTR3B', period: $period, gstin: $gstin})
      ON CREATE SET r.status = $status
      ON MATCH SET r.status = $status
      MERGE (t)-[:FILES]->(r)
      MERGE (t)-[:CLAIMED_ITC]->(r)
    `, {
            gstin: buyerGstin,
            period: period,
            status: data.status
        });

        // 2. Create Ledger Entries and Offset
        for (const claim of data.itcClaims) {
            await tx.run(`
        MATCH (r:Return {returnType: 'GSTR3B', period: $period, gstin: $gstin})
        MERGE (l:LedgerEntry {ledgerId: $ledgerId})
        ON CREATE SET l.mode = $mode, l.amount = $amount, l.date = $date
        MERGE (r)-[:OFFSET_BY]->(l)
      `, {
                period: period,
                gstin: buyerGstin,
                ledgerId: claim.ledgerId,
                mode: claim.mode,
                amount: claim.amount,
                date: claim.date
            });
        }

        await tx.commit();
        return { status: "success", claimsProcessed: data.itcClaims.length };
    } catch (error) {
        console.error("Purchase Register Load Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
