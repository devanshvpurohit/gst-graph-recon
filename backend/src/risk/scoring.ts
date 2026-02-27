import db from '../database';

export interface VendorRisk {
    gstin: string;
    name: string;
    state: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    components: {
        filingDelay: number;
        mismatchRatio: number;
        irnMissingRatio: number;
        taxDefault: number;
        networkRisk: number;
    };
    recommendation: string;
}

export async function calculateVendorRisk(gstin: string): Promise<VendorRisk> {
    const session = db.getSession();
    try {
        // 1. Filing Delay Ratio
        const filingData = await session.run(`
      MATCH (t:Taxpayer {gstin: $gstin})-[:FILES]->(r:Return {returnType: 'GSTR1'})
      WITH count(r) AS total, sum(CASE WHEN r.status = 'LATE' OR r.status = 'NOT_FILED' THEN 1 ELSE 0 END) AS delayed
      RETURN CASE WHEN total = 0 THEN 1.0 ELSE toFloat(delayed) / total END AS ratio
    `, { gstin });
        const filingDelay = filingData.records.length > 0 ? (filingData.records[0].get('ratio') || 0) : 1.0;

        // 2. Mismatch Ratio & IRN Missing
        const invData = await session.run(`
      MATCH (r:Return {returnType: 'GSTR1', gstin: $gstin})-[:DECLARES]->(i:Invoice)
      OPTIONAL MATCH (i)-[:HAS_IRN]->(irn:IRN)
      OPTIONAL MATCH (i)-[:REFLECTED_IN]->(r2b:Return {returnType: 'GSTR2B'})
      WITH count(i) AS total,
           sum(CASE WHEN irn IS NULL OR irn.status = 'CANCELLED' THEN 1 ELSE 0 END) AS irn_missing,
           sum(CASE WHEN r2b IS NULL THEN 1 ELSE 0 END) AS mismatch
      RETURN 
        CASE WHEN total = 0 THEN 0.0 ELSE toFloat(mismatch) / total END AS mismatch_ratio,
        CASE WHEN total = 0 THEN 0.0 ELSE toFloat(irn_missing) / total END AS irn_missing_ratio
    `, { gstin });

        const mismatchRatio = invData.records.length > 0 ? (invData.records[0].get('mismatch_ratio') || 0) : 0;
        const irnMissingRatio = invData.records.length > 0 ? (invData.records[0].get('irn_missing_ratio') || 0) : 0;

        // 3. Tax Default Indicator (Mock component for scope)
        const taxDefault = filingDelay > 0.8 ? 0.7 : 0.1;

        // 4. Network Risk (Derived purely via Cypher instead of NetworkX)
        // Identifies if supplier is connected to other high-risk buyers
        const netRiskData = await session.run(`
      MATCH (s:Taxpayer {gstin: $gstin})-[:FILES]->(:Return)-[:DECLARES]->(i:Invoice)
      MATCH (i)-[:REFLECTED_IN]->(:Return)<-[:FILES]-(b:Taxpayer)
      WHERE b.riskScore > 0.7
      RETURN count(DISTINCT b) AS risky_connections
    `, { gstin });
        const riskyConnections = netRiskData.records.length > 0 ? (netRiskData.records[0].get('risky_connections') || 0) : 0;
        const networkRisk = Math.min(Number(riskyConnections) * 0.2, 1.0);

        // Calculate Final Weighted Score
        const riskScore = (
            0.30 * filingDelay +
            0.25 * mismatchRatio +
            0.20 * irnMissingRatio +
            0.15 * taxDefault +
            0.10 * networkRisk
        );

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let recommendation = 'Standard compliance.';

        if (riskScore >= 0.7) {
            riskLevel = 'HIGH';
            recommendation = 'Flag for audit. Suspend ITC claims pending verification.';
        } else if (riskScore >= 0.3) {
            riskLevel = 'MEDIUM';
            recommendation = 'Monitor closely. Verify top mismatched invoices.';
        }

        // Persist to DB
        await session.run(`
      MATCH (t:Taxpayer {gstin: $gstin})
      SET t.riskScore = $score
      RETURN t.name AS name, t.state AS state
    `, { gstin, score: riskScore });

        const nameQuery = await session.run(`MATCH (t:Taxpayer {gstin: $gstin}) RETURN t.name AS name, t.state AS state`, { gstin });
        const name = nameQuery.records[0]?.get('name') || "Unknown";
        const state = nameQuery.records[0]?.get('state') || "Unknown";

        return {
            gstin,
            name,
            state,
            riskScore,
            riskLevel,
            components: {
                filingDelay,
                mismatchRatio,
                irnMissingRatio,
                taxDefault,
                networkRisk
            },
            recommendation
        };

    } finally {
        await session.close();
    }
}
