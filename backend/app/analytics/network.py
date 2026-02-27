"""
Advanced Graph Analytics Module

Implements:
- PageRank for vendor influence
- Community detection for fraud clusters
- Degree centrality for exposure risk

Exports Neo4j subgraphs to NetworkX for computation.
"""

import networkx as nx
from app.database import get_session


def _build_networkx_graph() -> nx.DiGraph:
    """Export the taxpayer-invoice network from Neo4j into NetworkX."""
    G = nx.DiGraph()
    
    with get_session() as session:
        # Add taxpayer nodes
        taxpayers = session.run("""
            MATCH (t:Taxpayer)
            RETURN t.gstin AS gstin, t.name AS name, t.riskScore AS riskScore
        """)
        for t in taxpayers:
            G.add_node(t["gstin"], name=t["name"], riskScore=t["riskScore"] or 0.0, type="taxpayer")
        
        # Add edges: supplier -> buyer relationships via invoices
        edges = session.run("""
            MATCH (inv:Invoice)
            RETURN inv.supplierGstin AS supplier,
                   inv.buyerGstin AS buyer,
                   count(inv) AS invoiceCount,
                   sum(inv.gstAmount) AS totalGst
        """)
        for e in edges:
            G.add_edge(
                e["supplier"],
                e["buyer"],
                weight=e["invoiceCount"],
                totalGst=e["totalGst"] or 0,
            )
    
    return G


def compute_pagerank() -> list[dict]:
    """Compute PageRank for vendor influence scoring."""
    G = _build_networkx_graph()
    
    if len(G.nodes) == 0:
        return []
    
    pr = nx.pagerank(G, alpha=0.85, weight="weight")
    
    results = []
    for gstin, score in sorted(pr.items(), key=lambda x: x[1], reverse=True):
        node_data = G.nodes.get(gstin, {})
        results.append({
            "gstin": gstin,
            "name": node_data.get("name", "Unknown"),
            "pageRank": round(score, 6),
            "riskScore": node_data.get("riskScore", 0.0),
        })
    
    return results


def detect_communities() -> list[dict]:
    """
    Detect communities/clusters in the supplier-buyer network.
    Uses greedy modularity for undirected version.
    """
    G = _build_networkx_graph()
    
    if len(G.nodes) == 0:
        return []
    
    # Convert to undirected for community detection
    G_undirected = G.to_undirected()
    
    try:
        from networkx.algorithms.community import greedy_modularity_communities
        communities = greedy_modularity_communities(G_undirected, weight="weight")
    except Exception:
        # Fallback: connected components
        communities = list(nx.connected_components(G_undirected))
    
    results = []
    for i, community in enumerate(communities):
        members = []
        total_risk = 0.0
        for gstin in community:
            node_data = G.nodes.get(gstin, {})
            risk = node_data.get("riskScore", 0.0)
            total_risk += risk
            members.append({
                "gstin": gstin,
                "name": node_data.get("name", "Unknown"),
                "riskScore": risk,
            })
        
        avg_risk = total_risk / len(members) if members else 0
        results.append({
            "communityId": i,
            "size": len(members),
            "avgRiskScore": round(avg_risk, 4),
            "isSuspicious": avg_risk > 0.5,
            "members": sorted(members, key=lambda x: x["riskScore"], reverse=True),
        })
    
    return sorted(results, key=lambda x: x["avgRiskScore"], reverse=True)


def compute_degree_centrality() -> list[dict]:
    """Compute degree centrality for exposure risk assessment."""
    G = _build_networkx_graph()
    
    if len(G.nodes) == 0:
        return []
    
    in_centrality = nx.in_degree_centrality(G)
    out_centrality = nx.out_degree_centrality(G)
    
    results = []
    for gstin in G.nodes:
        node_data = G.nodes.get(gstin, {})
        in_c = in_centrality.get(gstin, 0)
        out_c = out_centrality.get(gstin, 0)
        results.append({
            "gstin": gstin,
            "name": node_data.get("name", "Unknown"),
            "inDegreeCentrality": round(in_c, 6),
            "outDegreeCentrality": round(out_c, 6),
            "totalCentrality": round(in_c + out_c, 6),
            "riskScore": node_data.get("riskScore", 0.0),
            "role": "hub" if out_c > in_c else "authority",
        })
    
    return sorted(results, key=lambda x: x["totalCentrality"], reverse=True)


def get_network_risk_summary() -> dict:
    """Comprehensive network risk analysis."""
    pagerank = compute_pagerank()
    communities = detect_communities()
    centrality = compute_degree_centrality()
    
    suspicious_communities = [c for c in communities if c.get("isSuspicious")]
    high_influence = [p for p in pagerank if p["pageRank"] > 0.1]
    
    return {
        "pageRank": pagerank[:20],  # Top 20
        "communities": communities,
        "degreeCentrality": centrality[:20],
        "riskySummary": {
            "totalNodes": len(pagerank),
            "suspiciousClusters": len(suspicious_communities),
            "highInfluenceVendors": len(high_influence),
            "avgNetworkRisk": round(
                sum(p["riskScore"] for p in pagerank) / max(len(pagerank), 1), 4
            ),
        },
    }
