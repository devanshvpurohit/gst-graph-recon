import db from '../database';

export interface NetworkRisk {
    pageRank: { gstin: string; name: string; pageRank: number; riskScore: number }[];
    communities: { communityId: number; size: number; avgRiskScore: number; isSuspicious: boolean; members: any[] }[];
    degreeCentrality: { gstin: string; name: string; inDegreeCentrality: number; outDegreeCentrality: number; totalCentrality: number; role: string }[];
    riskySummary: { totalNodes: number; suspiciousClusters: number; highInfluenceVendors: number; avgNetworkRisk: number };
}

export async function calculateNetworkRisk(): Promise<NetworkRisk> {
    const session = db.getSession();
    try {
        // Note: Since we don't have NetworkX memory processing anymore,
        // we use standard Cypher traversals to approximate PageRank and Centrality concepts.
        // If the GDS (Graph Data Science) plugin is installed, we could use native algorithms.
        // Here we compute simplified proxy metrics using native Cypher counting/scoring.

        // 1. Centrality (In-Degree/Out-Degree via Relationships)
        const centralityQuery = await session.run(`
      MATCH (t:Taxpayer)
      // Out-degree: Suppliers filing and declaring invoices
      OPTIONAL MATCH (t)-[:FILES]->(:Return)-[:DECLARES]->(outInv:Invoice)
      // In-degree: Buyers reflecting invoices in GSTR2B
      OPTIONAL MATCH (t)-[:FILES]->(:Return)<-[:REFLECTED_IN]-(inInv:Invoice)
      WITH t, count(DISTINCT outInv) AS outDegree, count(DISTINCT inInv) AS inDegree
      RETURN 
        t.gstin AS gstin, 
        t.name AS name, 
        outDegree, 
        inDegree,
        (outDegree + inDegree) AS total
      ORDER BY total DESC LIMIT 10
    `);

        const degreeCentrality = centralityQuery.records.map(r => {
            const outD = r.get('outDegree').toNumber();
            const inD = r.get('inDegree').toNumber();
            return {
                gstin: r.get('gstin'),
                name: r.get('name'),
                inDegreeCentrality: inD,
                outDegreeCentrality: outD,
                totalCentrality: r.get('total'),
                role: outD > inD * 2 ? 'Major Supplier' : (inD > outD * 2 ? 'Major Buyer' : 'Intermediary')
            };
        });

        // 2. Mocking PageRank using existing risk scores and invoice volume
        // High-risk nodes that transact with many others get a higher "Rank"
        const pageRankQuery = await session.run(`
      MATCH (t:Taxpayer)
      OPTIONAL MATCH (t)-[:FILES]->(:Return)-[:DECLARES]->(i:Invoice)
      WITH t, count(i) AS volume
      RETURN t.gstin AS gstin, t.name AS name, t.riskScore AS riskScore, 
             ((t.riskScore * 0.7) + (CASE WHEN volume > 10 THEN 0.3 ELSE volume*0.03 END)) AS pseudoRank
      ORDER BY pseudoRank DESC LIMIT 10
    `);

        const pageRank = pageRankQuery.records.map(r => ({
            gstin: r.get('gstin'),
            name: r.get('name'),
            riskScore: r.get('riskScore') || 0,
            pageRank: r.get('pseudoRank') || 0
        }));

        // 3. Finding Risky Communities (Clusters of taxpayers passing risky invoices)
        // Cypher path finding to identify high-risk chains
        const communitiesQuery = await session.run(`
      MATCH chain=(s:Taxpayer)-[:FILES]->(:Return)-[:DECLARES]->(i:Invoice)-[:REFLECTED_IN]->(:Return)<-[:FILES]-(b:Taxpayer)
      WHERE s.riskScore > 0.5 OR b.riskScore > 0.5
      WITH collect(DISTINCT s) + collect(DISTINCT b) AS nodes
      UNWIND nodes AS node
      WITH DISTINCT node
      RETURN 
        1 AS communityId,
        count(node) AS size,
        avg(node.riskScore) AS avgRiskScore
    `);

        const communities = communitiesQuery.records.map(r => ({
            communityId: r.get('communityId').toNumber(),
            size: r.get('size').toNumber(),
            avgRiskScore: r.get('avgRiskScore') || 0,
            isSuspicious: (r.get('avgRiskScore') || 0) > 0.6,
            members: [] // Excluded for payload size
        }));

        // Overall Summary
        const totalQuery = await session.run(`MATCH (t:Taxpayer) RETURN count(t) AS total, avg(t.riskScore) AS avgRisk`);
        const totalNodes = totalQuery.records[0]?.get('total').toNumber() || 0;
        const avgRisk = totalQuery.records[0]?.get('avgRisk') || 0;

        return {
            pageRank,
            communities,
            degreeCentrality,
            riskySummary: {
                totalNodes,
                suspiciousClusters: communities.filter(c => c.isSuspicious).length,
                highInfluenceVendors: pageRank.filter(p => p.pageRank > 0.7).length,
                avgNetworkRisk: avgRisk
            }
        };

    } finally {
        await session.close();
    }
}
