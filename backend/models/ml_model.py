"""
Supply‑chain delay predictor built on scikit‑learn Random Forests.

Provides:
* Binary classification  – will the shipment be delayed?
* Regression             – by how many hours?
* Risk scoring           – 0‑100 composite risk score
* Contributing‑factor analysis with human‑readable descriptions
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

FEATURE_NAMES: List[str] = [
    "weight_kg",
    "distance_km",
    "weather_severity",
    "traffic_congestion",
    "supplier_reliability",
    "port_congestion",
    "customs_complexity",
    "route_risk_score",
    "month",
    "day_of_week",
    "is_peak_season",
    "cargo_type_encoded",
]

CARGO_TYPE_MAP: Dict[str, int] = {
    "General": 0,
    "Electronics": 1,
    "Perishable": 2,
    "Hazardous": 3,
    "Pharmaceutical": 4,
    "Automotive": 5,
    "Textiles": 6,
    "Machinery": 7,
    "Chemicals": 8,
    "Food": 9,
}

RISK_THRESHOLDS: List[Tuple[float, str]] = [
    (25, "Low"),
    (50, "Medium"),
    (75, "High"),
    (100, "Critical"),
]

FACTOR_DESCRIPTIONS: Dict[str, str] = {
    "weight_kg": "Heavier shipments tend to face more handling delays",
    "distance_km": "Longer routes increase exposure to disruption risks",
    "weather_severity": "Adverse weather conditions along the route",
    "traffic_congestion": "Current traffic and port congestion levels",
    "supplier_reliability": "Historical reliability of the supplier",
    "port_congestion": "Congestion levels at origin/destination ports",
    "customs_complexity": "Complexity of customs clearance procedures",
    "route_risk_score": "Historical risk score for the route",
    "month": "Seasonal demand and weather patterns",
    "day_of_week": "Day‑of‑week shipping patterns",
    "is_peak_season": "Peak season increases demand and delays",
    "cargo_type_encoded": "Certain cargo types require special handling",
}


# ─── Predictor ────────────────────────────────────────────────────────────────

class SupplyChainPredictor:
    """Trains and serves delay‑risk predictions for supply‑chain shipments."""

    def __init__(self) -> None:
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=-1,
        )
        self.regressor = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            n_jobs=-1,
        )
        self.is_trained: bool = False
        self.feature_importances_: Optional[np.ndarray] = None
        self._classifier_accuracy: float = 0.0
        self._regressor_mae: float = 0.0
        logger.info("SupplyChainPredictor initialised (untrained)")

    # ── public API ────────────────────────────────────────────────────────

    def train(self, csv_path: str | Path) -> Dict[str, float]:
        """
        Train both the classifier and the regressor from a CSV file.

        Parameters
        ----------
        csv_path : path to the historical_delays CSV

        Returns
        -------
        dict with 'accuracy' and 'mae' metrics on the test split
        """
        csv_path = Path(csv_path)
        if not csv_path.exists():
            raise FileNotFoundError(f"Training data not found: {csv_path}")

        try:
            df = pd.read_csv(csv_path)
            logger.info("Loaded %d records from %s", len(df), csv_path)

            # Encode cargo_type if present
            if "cargo_type" in df.columns:
                df["cargo_type_encoded"] = df["cargo_type"].apply(self._encode_cargo_type)
            else:
                df["cargo_type_encoded"] = 0

            # Ensure all feature columns exist
            for col in FEATURE_NAMES:
                if col not in df.columns:
                    df[col] = 0

            X = df[FEATURE_NAMES].values.astype(np.float64)
            y_class = df["is_delayed"].values.astype(int)
            y_reg = df["delay_hours"].values.astype(np.float64)

            X_train, X_test, yc_train, yc_test, yr_train, yr_test = train_test_split(
                X, y_class, y_reg, test_size=0.2, random_state=42,
            )

            # Classifier
            self.classifier.fit(X_train, yc_train)
            yc_pred = self.classifier.predict(X_test)
            self._classifier_accuracy = accuracy_score(yc_test, yc_pred)

            # Regressor
            self.regressor.fit(X_train, yr_train)
            yr_pred = self.regressor.predict(X_test)
            self._regressor_mae = mean_absolute_error(yr_test, yr_pred)

            self.feature_importances_ = self.classifier.feature_importances_
            self.is_trained = True

            metrics = {
                "accuracy": round(self._classifier_accuracy, 4),
                "mae": round(self._regressor_mae, 4),
            }
            logger.info("Training complete – accuracy=%.4f, MAE=%.4f",
                         metrics["accuracy"], metrics["mae"])
            print(f"[OK] Model trained  |  Accuracy: {metrics['accuracy']:.2%}  |  MAE: {metrics['mae']:.2f} h")
            return metrics

        except Exception as exc:
            logger.exception("Training failed")
            raise RuntimeError(f"Training failed: {exc}") from exc

    def predict(self, features_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a risk prediction for a single shipment.

        Parameters
        ----------
        features_dict : flat dict whose keys are a superset of FEATURE_NAMES

        Returns
        -------
        dict containing risk_score, delay_probability, estimated_delay_hours,
        risk_level, confidence, contributing_factors
        """
        if not self.is_trained:
            logger.warning("Model not trained – returning heuristic defaults")
            return self._default_prediction(features_dict)

        try:
            X = self._prepare_features(features_dict)
            delay_prob = float(self.classifier.predict_proba(X)[0, 1])
            delay_hours = max(0.0, float(self.regressor.predict(X)[0]))
            risk_score = self._compute_risk_score(delay_prob, delay_hours, features_dict)
            risk_level = self._get_risk_level(risk_score)
            confidence = self._estimate_confidence(features_dict)
            factors = self._generate_contributing_factors(
                features_dict, self.feature_importances_,
            )

            return {
                "risk_score": round(risk_score, 2),
                "delay_probability": round(delay_prob, 4),
                "estimated_delay_hours": round(delay_hours, 2),
                "risk_level": risk_level,
                "confidence": round(confidence, 4),
                "contributing_factors": factors,
            }

        except Exception as exc:
            logger.exception("Prediction failed")
            return self._default_prediction(features_dict)

    def get_feature_importance(self) -> List[Tuple[str, float]]:
        """Return feature importances sorted descending by importance."""
        if self.feature_importances_ is None:
            logger.warning("No importances available (model not trained)")
            return [(name, 1.0 / len(FEATURE_NAMES)) for name in FEATURE_NAMES]

        pairs = list(zip(FEATURE_NAMES, self.feature_importances_.tolist()))
        pairs.sort(key=lambda p: p[1], reverse=True)
        return pairs

    # ── feature preparation ───────────────────────────────────────────────

    def _prepare_features(self, data_dict: Dict[str, Any]) -> np.ndarray:
        """Convert an input dict into a (1, n_features) numpy array."""
        row: List[float] = []
        for name in FEATURE_NAMES:
            if name == "cargo_type_encoded" and name not in data_dict:
                val = self._encode_cargo_type(data_dict.get("cargo_type", "General"))
            else:
                val = data_dict.get(name, 0)
            row.append(float(val))
        return np.array(row, dtype=np.float64).reshape(1, -1)

    # ── encoding helpers ──────────────────────────────────────────────────

    @staticmethod
    def _encode_cargo_type(cargo_type: str) -> int:
        """Ordinal‑encode a cargo type string."""
        return CARGO_TYPE_MAP.get(cargo_type, 0)

    # ── risk helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _get_risk_level(score: float) -> str:
        """Map a 0‑100 risk score to a human‑readable level."""
        for threshold, label in RISK_THRESHOLDS:
            if score <= threshold:
                return label
        return "Critical"

    @staticmethod
    def _compute_risk_score(
        delay_prob: float,
        delay_hours: float,
        features: Dict[str, Any],
    ) -> float:
        """
        Composite risk score (0‑100) blending delay probability,
        predicted delay hours, and contextual features.
        """
        base = delay_prob * 60
        hour_component = min(delay_hours / 48, 1.0) * 20
        weather = float(features.get("weather_severity", 1))
        weather_component = ((weather - 1) / 4) * 10
        congestion = float(features.get("traffic_congestion", 0))
        congestion_component = congestion * 10
        score = base + hour_component + weather_component + congestion_component
        return max(0.0, min(100.0, score))

    @staticmethod
    def _estimate_confidence(features: Dict[str, Any]) -> float:
        """
        Heuristic confidence based on how many features are non‑default.
        More data → higher confidence.
        """
        provided = sum(
            1 for k in FEATURE_NAMES if features.get(k) not in (None, 0, 0.0)
        )
        return min(0.95, 0.5 + 0.045 * provided)

    # ── factor generation ─────────────────────────────────────────────────

    @staticmethod
    def _generate_contributing_factors(
        features: Dict[str, Any],
        importances: Optional[np.ndarray],
    ) -> List[Dict[str, Any]]:
        """
        Build a list of human‑readable contributing factors sorted by impact.
        """
        if importances is None:
            importances = np.ones(len(FEATURE_NAMES)) / len(FEATURE_NAMES)

        factors: List[Dict[str, Any]] = []
        for name, imp in sorted(
            zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True,
        ):
            value = features.get(name, 0)
            factors.append({
                "name": name,
                "impact": round(float(imp), 4),
                "description": FACTOR_DESCRIPTIONS.get(
                    name,
                    f"Feature '{name}' has value {value}",
                ),
            })
        return factors[:8]  # top‑8 most impactful

    # ── fallback ──────────────────────────────────────────────────────────

    def _default_prediction(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Return reasonable defaults when the model is not trained."""
        weather = float(features.get("weather_severity", 1))
        congestion = float(features.get("traffic_congestion", 0))
        reliability = float(features.get("supplier_reliability", 0.8))

        risk_score = (weather / 5) * 30 + congestion * 30 + (1 - reliability) * 40
        risk_score = max(0.0, min(100.0, risk_score))

        return {
            "risk_score": round(risk_score, 2),
            "delay_probability": round(risk_score / 100, 4),
            "estimated_delay_hours": round(risk_score * 0.48, 2),
            "risk_level": self._get_risk_level(risk_score),
            "confidence": 0.45,
            "contributing_factors": self._generate_contributing_factors(
                features, None,
            ),
        }
