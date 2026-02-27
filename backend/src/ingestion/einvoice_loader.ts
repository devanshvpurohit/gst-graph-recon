import db from '../database';

export async function loadEInvoice(data: any): Promise<any> {
    const session = db.getSession();
    try {
        const tx = session.beginTransaction();

        // Create IRN node
        await tx.run(`
      MERGE (irn:IRN {irnHash: $irnHash})
      ON CREATE SET irn.status = $status, irn.generationDate = $generationDate
      ON MATCH SET irn.status = $status
    `, {
            irnHash: data.irn,
            status: data.status,
            generationDate: data.generationDate
        });

        // Link Invoice to IRN
        await tx.run(`
      MERGE (i:Invoice {invoiceNo: $invoiceNo, supplierGstin: $supplierGstin})
      MERGE (i)-[:HAS_IRN]->(irn:IRN {irnHash: $irnHash})
    `, {
            invoiceNo: data.invoiceDetails.invoiceNo,
            supplierGstin: data.supplierGstin,
            irnHash: data.irn
        });

        await tx.commit();
        return { status: "success", irn: data.irn };
    } catch (error) {
        console.error("e-Invoice Load Error:", error);
        throw error;
    } finally {
        await session.close();
    }
}
