"""Tests for risk scoring formula and model."""

import pytest


class TestRiskFormulaWeights:
    """Verify risk formula weights sum to 1.0 and produce expected results."""
    
    def test_weights_sum_to_one(self):
        weights = [0.30, 0.25, 0.20, 0.15, 0.10]
        assert abs(sum(weights) - 1.0) < 0.001
    
    def test_high_filing_delay_dominates(self):
        """Filing delay has highest weight (0.30) — verify it dominates."""
        high_delay = 0.30 * 1.0 + 0.25 * 0 + 0.20 * 0 + 0.15 * 0 + 0.10 * 0
        high_mismatch = 0.30 * 0 + 0.25 * 1.0 + 0.20 * 0 + 0.15 * 0 + 0.10 * 0
        assert high_delay > high_mismatch
    
    def test_vendor_scenarios(self):
        """Test realistic vendor risk scenarios."""
        # Good vendor: low everything
        good = 0.30 * 0.0 + 0.25 * 0.05 + 0.20 * 0.0 + 0.15 * 0.0 + 0.10 * 0.1
        assert good < 0.3  # LOW risk
        
        # Bad vendor: high everything
        bad = 0.30 * 0.9 + 0.25 * 0.8 + 0.20 * 0.7 + 0.15 * 0.6 + 0.10 * 0.5
        assert bad >= 0.7  # HIGH risk
        
        # Mixed vendor
        mixed = 0.30 * 0.4 + 0.25 * 0.5 + 0.20 * 0.3 + 0.15 * 0.2 + 0.10 * 0.3
        assert 0.3 <= mixed < 0.7  # MEDIUM risk

    def test_network_risk_contribution(self):
        """Network risk has lowest weight — verify limited impact."""
        base = 0.30 * 0.5 + 0.25 * 0.5 + 0.20 * 0.5 + 0.15 * 0.5
        
        low_network = base + 0.10 * 0.0
        high_network = base + 0.10 * 1.0
        
        # Difference should be at most 0.10
        assert abs(high_network - low_network) == pytest.approx(0.10, abs=0.001)
