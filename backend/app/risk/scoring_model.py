"""
XGBoost-based predictive risk scoring model.

Trained on synthetic mismatch patterns to predict vendor compliance risk.
"""

import numpy as np
import json
import os

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.json")


def generate_synthetic_training_data(n_samples: int = 500) -> tuple:
    """
    Generate synthetic training data for risk prediction.
    
    Features:
    - filing_delay_ratio (0-1)
    - mismatch_ratio (0-1)
    - irn_missing_ratio (0-1)
    - tax_default_rate (0-1)
    - network_risk (0-1)
    - invoice_volume (normalized)
    - avg_invoice_value (normalized)
    
    Target: binary (1 = high risk, 0 = low risk)
    """
    np.random.seed(42)
    
    X = np.random.rand(n_samples, 7)
    
    # Create realistic correlations
    # High filing delay + high mismatch = likely high risk
    risk_signal = (
        0.30 * X[:, 0]  # filing delay
        + 0.25 * X[:, 1]  # mismatch ratio
        + 0.20 * X[:, 2]  # irn missing
        + 0.15 * X[:, 3]  # tax default
        + 0.10 * X[:, 4]  # network risk
    )
    
    # Add noise
    noise = np.random.normal(0, 0.1, n_samples)
    risk_signal += noise
    
    # Binary classification threshold
    y = (risk_signal > 0.5).astype(int)
    
    return X, y


def train_model():
    """Train XGBoost model on synthetic data and save."""
    if not HAS_XGBOOST:
        return {"error": "XGBoost not installed"}
    
    X, y = generate_synthetic_training_data()
    
    dtrain = xgb.DMatrix(X, label=y)
    
    params = {
        "max_depth": 4,
        "eta": 0.1,
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "nthread": 2,
        "seed": 42,
    }
    
    model = xgb.train(params, dtrain, num_boost_round=100)
    model.save_model(MODEL_PATH)
    
    return {"status": "trained", "path": MODEL_PATH, "samples": len(y)}


def predict_risk(features: dict) -> dict:
    """
    Predict risk using the trained XGBoost model.
    
    Args:
        features: dict with keys:
            filing_delay_ratio, mismatch_ratio, irn_missing_ratio,
            tax_default_rate, network_risk, invoice_volume, avg_invoice_value
    """
    if not HAS_XGBOOST:
        # Fallback to formula-based scoring
        score = (
            0.30 * features.get("filing_delay_ratio", 0)
            + 0.25 * features.get("mismatch_ratio", 0)
            + 0.20 * features.get("irn_missing_ratio", 0)
            + 0.15 * features.get("tax_default_rate", 0)
            + 0.10 * features.get("network_risk", 0)
        )
        return {
            "predicted_risk": round(score, 4),
            "model": "formula_fallback",
            "high_risk": score > 0.5,
        }
    
    feature_array = np.array([[
        features.get("filing_delay_ratio", 0),
        features.get("mismatch_ratio", 0),
        features.get("irn_missing_ratio", 0),
        features.get("tax_default_rate", 0),
        features.get("network_risk", 0),
        features.get("invoice_volume", 0),
        features.get("avg_invoice_value", 0),
    ]])
    
    if not os.path.exists(MODEL_PATH):
        train_model()
    
    model = xgb.Booster()
    model.load_model(MODEL_PATH)
    
    dtest = xgb.DMatrix(feature_array)
    pred = model.predict(dtest)[0]
    
    return {
        "predicted_risk": round(float(pred), 4),
        "model": "xgboost",
        "high_risk": pred > 0.5,
    }
