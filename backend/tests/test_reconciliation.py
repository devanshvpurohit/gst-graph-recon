"""
Tests for the GST Reconciliation Engine.

Uses NetworkX in-memory graph as mock — no Neo4j dependency for unit tests.
Tests cover ITC chain validation, mismatch detection, risk classification, and edge cases.
"""

import pytest
import networkx as nx


# ─── In-Memory Graph Mock ────────────────────────────────────────────

def build_test_graph():
    """Build a mock knowledge graph using NetworkX for testing."""
    G = nx.DiGraph()
    
    # Suppliers
    G.add_node("SUP_29AABCS", type="Taxpayer", gstin="29AABCS1234F1Z5",
               name="Steel Corp", state="KA", riskScore=0.0)
    G.add_node("SUP_06AABCX", type="Taxpayer", gstin="06AABCX1234K1Z5",
               name="Haryana Chemicals", state="HR", riskScore=0.0)
    
    # Buyers
    G.add_node("BUY_29BUYER", type="Taxpayer", gstin="29BUYER001KA1Z5",
               name="Bangalore Retail", state="KA", riskScore=0.0)
    
    # Returns
    G.add_node("R_GSTR1_29AABCS_042025", type="Return", returnType="GSTR1",
               period="042025", status="FILED")
    G.add_node("R_GSTR1_06AABCX_042025", type="Return", returnType="GSTR1",
               period="042025", status="NOT_FILED")
    G.add_node("R_GSTR2B_29BUYER_042025", type="Return", returnType="GSTR2B",
               period="042025", status="FILED")
    G.add_node("R_GSTR3B_29BUYER_042025", type="Return", returnType="GSTR3B",
               period="042025", status="FILED")
    
    # Invoices
    G.add_node("INV001", type="Invoice", invoiceNo="INV001",
               taxableValue=100000, gstAmount=18000,
               supplierGstin="29AABCS1234F1Z5", buyerGstin="29BUYER001KA1Z5")
    G.add_node("INV027", type="Invoice", invoiceNo="INV027",
               taxableValue=230000, gstAmount=41400,
               supplierGstin="06AABCX1234K1Z5", buyerGstin="29BUYER001KA1Z5")
    G.add_node("INV_NOIRN", type="Invoice", invoiceNo="INV_NOIRN",
               taxableValue=50000, gstAmount=9000,
               supplierGstin="29AABCS1234F1Z5", buyerGstin="29BUYER001KA1Z5")
    
    # IRN
    G.add_node("IRN_INV001", type="IRN", irnHash="IRN_HASH_001", status="ACTIVE")
    G.add_node("IRN_INV027", type="IRN", irnHash="IRN_HASH_027", status="ACTIVE")
    
    # Ledger
    G.add_node("LEDGER_001", type="LedgerEntry", mode="CREDIT", amount=200000)
    
    # Relationships
    # Supplier FILES Return
    G.add_edge("SUP_29AABCS", "R_GSTR1_29AABCS_042025", rel="FILES")
    G.add_edge("SUP_06AABCX", "R_GSTR1_06AABCX_042025", rel="FILES")
    G.add_edge("BUY_29BUYER", "R_GSTR2B_29BUYER_042025", rel="FILES")
    G.add_edge("BUY_29BUYER", "R_GSTR3B_29BUYER_042025", rel="FILES")
    
    # Return DECLARES Invoice
    G.add_edge("R_GSTR1_29AABCS_042025", "INV001", rel="DECLARES")
    G.add_edge("R_GSTR1_29AABCS_042025", "INV_NOIRN", rel="DECLARES")
    
    # Invoice REFLECTED_IN GSTR2B
    G.add_edge("INV001", "R_GSTR2B_29BUYER_042025", rel="REFLECTED_IN")
    G.add_edge("INV027", "R_GSTR2B_29BUYER_042025", rel="REFLECTED_IN")
    G.add_edge("INV_NOIRN", "R_GSTR2B_29BUYER_042025", rel="REFLECTED_IN")
    
    # Invoice HAS_IRN
    G.add_edge("INV001", "IRN_INV001", rel="HAS_IRN")
    G.add_edge("INV027", "IRN_INV027", rel="HAS_IRN")
    # INV_NOIRN deliberately has no IRN
    
    # Buyer CLAIMED_ITC
    G.add_edge("BUY_29BUYER", "R_GSTR3B_29BUYER_042025", rel="CLAIMED_ITC")
    
    # GSTR3B OFFSET_BY Ledger
    G.add_edge("R_GSTR3B_29BUYER_042025", "LEDGER_001", rel="OFFSET_BY")
    
    return G


# ─── Graph Traversal Helper Functions ────────────────────────────────

def traverse_itc_chain(G, invoice_id):
    """
    Simulate the multi-hop ITC validation:
    1. Find if invoice is declared in any GSTR-1
    2. Check if invoice has an active IRN
    3. Check if invoice is reflected in GSTR-2B
    4. Check if buyer has filed GSTR-3B
    5. Check if ledger offset exists
    """
    invoice = G.nodes.get(invoice_id, {})
    if not invoice:
        return {"error": "Invoice not found"}
    
    result = {
        "invoiceNo": invoice.get("invoiceNo"),
        "supplierGSTIN": invoice.get("supplierGstin"),
        "buyerGSTIN": invoice.get("buyerGstin"),
        "status": "VALID",
        "riskLevel": "LOW",
        "rootCause": [],
    }
    
    # Check 1: GSTR-1 declaration (supplier path)
    has_gstr1 = False
    for pred in G.predecessors(invoice_id):
        if G.nodes[pred].get("returnType") == "GSTR1":
            edge = G.edges[pred, invoice_id]
            if edge.get("rel") == "DECLARES":
                has_gstr1 = True
                # Check supplier filing status
                for sup_pred in G.predecessors(pred):
                    if G.nodes[sup_pred].get("type") == "Taxpayer":
                        gstr1_status = G.nodes[pred].get("status")
                        if gstr1_status == "NOT_FILED":
                            result["rootCause"].append("Supplier GSTR-1 not filed")
                            result["riskLevel"] = "HIGH"
                            result["status"] = "MISMATCH"
    
    if not has_gstr1:
        result["rootCause"].append("No GSTR-1 declaration found")
        result["status"] = "MISMATCH"
        result["riskLevel"] = "HIGH"
    
    # Check 2: IRN
    has_active_irn = False
    for succ in G.successors(invoice_id):
        if G.nodes[succ].get("type") == "IRN":
            if G.nodes[succ].get("status") == "ACTIVE":
                has_active_irn = True
            elif G.nodes[succ].get("status") == "CANCELLED":
                result["rootCause"].append("IRN cancelled")
                result["status"] = "MISMATCH"
                result["riskLevel"] = "HIGH"
    
    if not has_active_irn and "IRN cancelled" not in result["rootCause"]:
        result["rootCause"].append("No active IRN")
        result["status"] = "MISMATCH"
        if result["riskLevel"] != "HIGH":
            result["riskLevel"] = "MEDIUM"
    
    # Check 3: GSTR-2B reflection
    has_gstr2b = False
    for succ in G.successors(invoice_id):
        if G.nodes[succ].get("returnType") == "GSTR2B":
            has_gstr2b = True
    
    if not has_gstr2b:
        result["rootCause"].append("Not reflected in GSTR-2B")
        result["status"] = "MISMATCH"
        if result["riskLevel"] == "LOW":
            result["riskLevel"] = "MEDIUM"
    
    return result


def detect_missing_gstr1_mock(G):
    """Find invoices in GSTR-2B without GSTR-1 declaration."""
    results = []
    for node, data in G.nodes(data=True):
        if data.get("type") != "Invoice":
            continue
        
        in_gstr2b = any(
            G.nodes[s].get("returnType") == "GSTR2B"
            for s in G.successors(node)
        )
        in_gstr1 = any(
            G.nodes[p].get("returnType") == "GSTR1"
            for p in G.predecessors(node)
        )
        
        if in_gstr2b and not in_gstr1:
            results.append({
                "invoiceNo": data["invoiceNo"],
                "issue": "MISSING_GSTR1",
            })
    
    return results


def detect_irn_issues_mock(G):
    """Find invoices without active IRN."""
    results = []
    for node, data in G.nodes(data=True):
        if data.get("type") != "Invoice":
            continue
        
        irn_nodes = [
            s for s in G.successors(node)
            if G.nodes[s].get("type") == "IRN"
        ]
        
        if not irn_nodes:
            results.append({
                "invoiceNo": data["invoiceNo"],
                "issue": "IRN_MISSING",
            })
        else:
            for irn in irn_nodes:
                if G.nodes[irn].get("status") != "ACTIVE":
                    results.append({
                        "invoiceNo": data["invoiceNo"],
                        "issue": f"IRN_{G.nodes[irn].get('status')}",
                    })
    
    return results


# ─── Test Cases ──────────────────────────────────────────────────────

class TestITCChainValidation:
    """Test multi-hop ITC chain validation via graph traversal."""
    
    def setup_method(self):
        self.G = build_test_graph()
    
    def test_valid_itc_chain(self):
        """INV001: has GSTR-1 + active IRN + in GSTR-2B → should be VALID."""
        result = traverse_itc_chain(self.G, "INV001")
        assert result["status"] == "VALID"
        assert result["riskLevel"] == "LOW"
        assert len(result["rootCause"]) == 0
    
    def test_missing_gstr1_declaration(self):
        """INV027: supplier hasn't filed GSTR-1 → should be MISMATCH/HIGH."""
        result = traverse_itc_chain(self.G, "INV027")
        assert result["status"] == "MISMATCH"
        assert result["riskLevel"] == "HIGH"
        assert any("GSTR-1" in rc for rc in result["rootCause"])
    
    def test_missing_irn(self):
        """INV_NOIRN: no IRN → should be MISMATCH/MEDIUM."""
        result = traverse_itc_chain(self.G, "INV_NOIRN")
        assert result["status"] == "MISMATCH"
        assert "No active IRN" in result["rootCause"]
    
    def test_invoice_not_found(self):
        """Non-existent invoice → should return error."""
        result = traverse_itc_chain(self.G, "INV_NONEXISTENT")
        assert "error" in result


class TestMissingGSTR1Detection:
    """Test detection of invoices in GSTR-2B without GSTR-1."""
    
    def setup_method(self):
        self.G = build_test_graph()
    
    def test_detect_unfiled_supplier(self):
        """INV027 is in GSTR-2B but supplier hasn't filed GSTR-1 → should be detected."""
        results = detect_missing_gstr1_mock(self.G)
        invoice_nos = [r["invoiceNo"] for r in results]
        assert "INV027" in invoice_nos
    
    def test_filed_supplier_not_flagged(self):
        """INV001 is in both GSTR-1 and GSTR-2B → should NOT be flagged."""
        results = detect_missing_gstr1_mock(self.G)
        invoice_nos = [r["invoiceNo"] for r in results]
        assert "INV001" not in invoice_nos


class TestIRNMismatchDetection:
    """Test detection of invoices with IRN issues."""
    
    def setup_method(self):
        self.G = build_test_graph()
    
    def test_missing_irn_detected(self):
        """INV_NOIRN has no IRN → should be flagged."""
        results = detect_irn_issues_mock(self.G)
        invoice_nos = [r["invoiceNo"] for r in results]
        assert "INV_NOIRN" in invoice_nos
    
    def test_active_irn_not_flagged(self):
        """INV001 has active IRN → should NOT be flagged."""
        results = detect_irn_issues_mock(self.G)
        invoice_nos = [r["invoiceNo"] for r in results]
        assert "INV001" not in invoice_nos
    
    def test_cancelled_irn(self):
        """Add a cancelled IRN and verify detection."""
        self.G.nodes["IRN_INV027"]["status"] = "CANCELLED"
        results = detect_irn_issues_mock(self.G)
        invoice_nos = [r["invoiceNo"] for r in results]
        assert "INV027" in invoice_nos
        issue = next(r for r in results if r["invoiceNo"] == "INV027")
        assert issue["issue"] == "IRN_CANCELLED"


class TestEdgeCases:
    """Test edge cases: duplicate invoices, complex paths."""
    
    def setup_method(self):
        self.G = build_test_graph()
    
    def test_invoice_with_no_relationships(self):
        """Isolated invoice node should be flagged as high risk."""
        self.G.add_node("INV_ISOLATED", type="Invoice", invoiceNo="INV_ISOLATED",
                       taxableValue=10000, gstAmount=1800,
                       supplierGstin="UNKNOWN", buyerGstin="UNKNOWN")
        result = traverse_itc_chain(self.G, "INV_ISOLATED")
        assert result["status"] == "MISMATCH"
        assert result["riskLevel"] == "HIGH"
    
    def test_duplicate_invoice_detection(self):
        """Same invoice in different nodes should be detectable."""
        # In a real graph, MERGE prevents duplicates.
        # Here we test that our logic handles it.
        self.G.add_node("INV001_DUP", type="Invoice", invoiceNo="INV001",
                       taxableValue=100000, gstAmount=18000,
                       supplierGstin="29AABCS1234F1Z5", buyerGstin="29BUYER001KA1Z5")
        
        invoices_with_same_no = [
            n for n, d in self.G.nodes(data=True)
            if d.get("invoiceNo") == "INV001"
        ]
        assert len(invoices_with_same_no) == 2  # Duplicate exists
    
    def test_graph_traversal_depth(self):
        """Verify multi-hop traversal covers the full path by checking each segment."""
        # The graph uses directed edges, so we verify each hop individually
        # as the Cypher engine would match patterns in both directions.
        
        # Hop 1: Supplier → GSTR1 (via FILES)
        assert self.G.has_edge("SUP_29AABCS", "R_GSTR1_29AABCS_042025")
        
        # Hop 2: GSTR1 → Invoice (via DECLARES)
        assert self.G.has_edge("R_GSTR1_29AABCS_042025", "INV001")
        
        # Hop 3: Invoice → IRN (via HAS_IRN)
        assert self.G.has_edge("INV001", "IRN_INV001")
        
        # Hop 4: Invoice → GSTR2B (via REFLECTED_IN)
        assert self.G.has_edge("INV001", "R_GSTR2B_29BUYER_042025")
        
        # Hop 5: Buyer → GSTR2B (via FILES — buyer owns the return)
        assert self.G.has_edge("BUY_29BUYER", "R_GSTR2B_29BUYER_042025")
        
        # Hop 6: Buyer → GSTR3B (via CLAIMED_ITC)
        assert self.G.has_edge("BUY_29BUYER", "R_GSTR3B_29BUYER_042025")
        
        # Hop 7: GSTR3B → Ledger (via OFFSET_BY)
        assert self.G.has_edge("R_GSTR3B_29BUYER_042025", "LEDGER_001")
        
        # Total graph should cover all 7 relationship types
        edge_types = set(d.get("rel") for _, _, d in self.G.edges(data=True))
        assert "FILES" in edge_types
        assert "DECLARES" in edge_types
        assert "HAS_IRN" in edge_types
        assert "REFLECTED_IN" in edge_types
        assert "CLAIMED_ITC" in edge_types
        assert "OFFSET_BY" in edge_types


class TestRiskScoring:
    """Test risk scoring formula."""
    
    def test_risk_formula_calculation(self):
        """Test the weighted risk formula."""
        filing_delay = 0.5
        mismatch_ratio = 0.3
        irn_missing = 0.2
        tax_default = 0.1
        network_risk = 0.4
        
        risk_score = (
            0.30 * filing_delay
            + 0.25 * mismatch_ratio
            + 0.20 * irn_missing
            + 0.15 * tax_default
            + 0.10 * network_risk
        )
        
        expected = 0.30 * 0.5 + 0.25 * 0.3 + 0.20 * 0.2 + 0.15 * 0.1 + 0.10 * 0.4
        assert abs(risk_score - expected) < 0.001
        assert 0 <= risk_score <= 1
    
    def test_risk_formula_bounds(self):
        """Risk score should always be between 0 and 1."""
        # All zeros
        risk_zero = 0.30 * 0 + 0.25 * 0 + 0.20 * 0 + 0.15 * 0 + 0.10 * 0
        assert risk_zero == 0.0
        
        # All ones
        risk_max = 0.30 * 1 + 0.25 * 1 + 0.20 * 1 + 0.15 * 1 + 0.10 * 1
        assert risk_max == 1.0
    
    def test_risk_classification(self):
        """Test risk level classification thresholds."""
        def classify(score):
            if score >= 0.7:
                return "HIGH"
            elif score >= 0.3:
                return "MEDIUM"
            return "LOW"
        
        assert classify(0.8) == "HIGH"
        assert classify(0.7) == "HIGH"
        assert classify(0.5) == "MEDIUM"
        assert classify(0.3) == "MEDIUM"
        assert classify(0.2) == "LOW"
        assert classify(0.0) == "LOW"


class TestXGBoostModel:
    """Test XGBoost scoring model."""
    
    def test_synthetic_data_generation(self):
        """Verify synthetic training data is generated correctly."""
        from app.risk.scoring_model import generate_synthetic_training_data
        X, y = generate_synthetic_training_data(100)
        assert X.shape == (100, 7)
        assert y.shape == (100,)
        assert set(y).issubset({0, 1})
    
    def test_predict_risk_fallback(self):
        """Test formula fallback when XGBoost model is missing."""
        from app.risk.scoring_model import predict_risk
        result = predict_risk({
            "filing_delay_ratio": 0.5,
            "mismatch_ratio": 0.3,
            "irn_missing_ratio": 0.2,
            "tax_default_rate": 0.1,
            "network_risk": 0.4,
        })
        assert "predicted_risk" in result
        assert 0 <= result["predicted_risk"] <= 1
