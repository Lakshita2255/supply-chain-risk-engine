"""
Anomaly detection for supply‑chain shipments using Isolation Forest.

Identifies unusual patterns in shipment data (e.g. abnormal weight,
unexpected route‑risk scores, extreme weather) and generates actionable
alerts with severity levels and recommended mitigations.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

# Numeric features used for anomaly scoring
ANOMALY_FEATURES: List[str] = [
    "weight_kg",
    "distance_km",
    "weather_severity",
    "traffic_congestion",
    "supplier_reliability",
    "port_congestion",
    "customs_complexity",
    "route_risk_score",
]

# Human‑readable labels and thresholds for anomaly descriptions
FEATURE_LABELS: Dict[str, str] = {
    "weight_kg": "shipment weight",
    "distance_km": "route distance",
    "weather_severity": "weather severity",
    "traffic_congestion": "traffic congestion",
    "supplier_reliability": "supplier reliability",
    "port_congestion": "port congestion",
    "customs_complexity": "customs complexity",
    "route_risk_score": "route risk score",
}

# Typical expected ranges (min, max) for anomaly narrative
EXPECTED_RANGES: Dict[str, tuple] = {
    "weight_kg": (100, 50000),
    "distance_km": (50, 20000),
    "weather_severity": (1, 5),
    "traffic_congestion": (0, 1),
    "supplier_reliability": (0, 1),
    "port_congestion": (0, 1),
    "customs_complexity": (0, 1),
    "route_risk_score": (0, 100),
}


class AnomalyDetector:
    """Detects anomalous shipments via Isolation Forest and issues alerts."""

    def __init__(self, contamination: float = 0.1, random_state: int = 42) -> None:
        """
        Parameters
        ----------
        contamination : expected proportion of outliers in training data
        random_state  : seed for reproducibility
        """
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1,
        )
        self.is_trained: bool = False
        self._training_stats: Dict[str, Dict[str, float]] = {}
        logger.info("AnomalyDetector initialised (contamination=%.2f)", contamination)

    # ── Training ──────────────────────────────────────────────────────────

    def train(self, data: pd.DataFrame) -> None:
        """
        Train the Isolation Forest on historical shipment data.

        Parameters
        ----------
        data : DataFrame containing at least the columns in ANOMALY_FEATURES
        """
        try:
            available = [f for f in ANOMALY_FEATURES if f in data.columns]
            if not available:
                raise ValueError(
                    "None of the expected anomaly features found in the data. "
                    f"Expected: {ANOMALY_FEATURES}"
                )

            X = data[available].fillna(0).values.astype(np.float64)

            # Store per‑feature stats for later description generation
            for i, feat in enumerate(available):
                self._training_stats[feat] = {
                    "mean": float(np.mean(X[:, i])),
                    "std": float(np.std(X[:, i])),
                    "min": float(np.min(X[:, i])),
                    "max": float(np.max(X[:, i])),
                }

            self.model.fit(X)
            self.is_trained = True
            self._trained_features = available
            logger.info("AnomalyDetector trained on %d samples with %d features",
                         len(X), len(available))

        except Exception as exc:
            logger.exception("Anomaly detector training failed")
            raise RuntimeError(f"Training failed: {exc}") from exc

    # ── Single‑shipment detection ─────────────────────────────────────────

    def detect(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse a single shipment and return anomaly information.

        Parameters
        ----------
        shipment_data : dict with feature keys matching ANOMALY_FEATURES

        Returns
        -------
        dict with is_anomaly, anomaly_score, severity, description,
        recommended_actions
        """
        if not self.is_trained:
            logger.warning("Detector not trained – using heuristic fallback")
            return self._heuristic_detect(shipment_data)

        try:
            features = self._trained_features
            row = np.array(
                [float(shipment_data.get(f, 0)) for f in features],
                dtype=np.float64,
            ).reshape(1, -1)

            raw_score: float = float(self.model.decision_function(row)[0])
            prediction: int = int(self.model.predict(row)[0])

            is_anomaly = prediction == -1
            # Normalise score to [-1, 1] range (lower = more anomalous)
            anomaly_score = round(-raw_score, 4)
            severity = self._severity_from_score(anomaly_score)
            description = self._generate_description(shipment_data, anomaly_score)
            actions = self._recommend_actions(shipment_data, severity)

            return {
                "is_anomaly": is_anomaly,
                "anomaly_score": anomaly_score,
                "severity": severity,
                "description": description,
                "recommended_actions": actions,
            }

        except Exception as exc:
            logger.exception("Anomaly detection failed for shipment")
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "severity": "info",
                "description": f"Detection error: {exc}",
                "recommended_actions": ["Review shipment data manually"],
            }

    # ── Batch scanning ────────────────────────────────────────────────────

    def scan_shipments(self, shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scan a list of shipments and return alerts for anomalies.

        Returns
        -------
        list of alert dicts (only anomalous shipments)
        """
        alerts: List[Dict[str, Any]] = []
        for shipment in shipments:
            result = self.detect(shipment)
            if result["is_anomaly"]:
                shipment_id = shipment.get("id") or shipment.get("shipment_id") or "N/A"
                alert = {
                    "id": f"ANM-{uuid.uuid4().hex[:8].upper()}",
                    "severity": result["severity"],
                    "title": f"Anomaly detected in shipment {shipment_id}",
                    "description": result["description"],
                    "affected_shipments": [shipment_id],
                    "detected_at": datetime.utcnow().isoformat(),
                    "recommended_actions": result["recommended_actions"],
                    "anomaly_score": result["anomaly_score"],
                }
                alerts.append(alert)

        alerts.sort(key=lambda a: a["anomaly_score"], reverse=True)
        logger.info("Scanned %d shipments – %d anomalies detected",
                     len(shipments), len(alerts))
        return alerts

    # ── Severity mapping ──────────────────────────────────────────────────

    @staticmethod
    def _severity_from_score(score: float) -> str:
        """
        Map an anomaly score to a severity level.

        Higher (positive) scores indicate stronger anomalies.
        """
        if score >= 0.3:
            return "critical"
        elif score >= 0.1:
            return "warning"
        return "info"

    # ── Description generation ────────────────────────────────────────────

    def _generate_description(
        self, features: Dict[str, Any], score: float,
    ) -> str:
        """Build a human‑readable anomaly narrative."""
        unusual: List[str] = []
        for feat in ANOMALY_FEATURES:
            val = features.get(feat)
            if val is None:
                continue
            val = float(val)
            stats = self._training_stats.get(feat)
            if stats:
                mean, std = stats["mean"], stats["std"]
                if std > 0 and abs(val - mean) > 2 * std:
                    label = FEATURE_LABELS.get(feat, feat)
                    direction = "above" if val > mean else "below"
                    unusual.append(
                        f"{label} ({val:.1f}) is significantly {direction} average ({mean:.1f})"
                    )
            else:
                lo, hi = EXPECTED_RANGES.get(feat, (0, 1))
                if val < lo or val > hi:
                    label = FEATURE_LABELS.get(feat, feat)
                    unusual.append(f"{label} ({val:.1f}) is outside expected range [{lo}, {hi}]")

        if unusual:
            detail = "; ".join(unusual[:3])
            return f"Anomalous shipment (score {score:.2f}): {detail}."
        return f"Shipment flagged as anomalous with score {score:.2f}."

    # ── Recommendations ───────────────────────────────────────────────────

    @staticmethod
    def _recommend_actions(
        features: Dict[str, Any], severity: str,
    ) -> List[str]:
        """Generate severity‑aware recommended actions."""
        actions: List[str] = []

        weather = float(features.get("weather_severity", 1))
        if weather >= 4:
            actions.append("Consider rerouting to avoid severe weather conditions")

        congestion = float(features.get("traffic_congestion", 0))
        if congestion >= 0.7:
            actions.append("Adjust departure timing to avoid peak congestion")

        reliability = float(features.get("supplier_reliability", 1))
        if reliability < 0.5:
            actions.append("Engage backup supplier or increase safety stock")

        port_cong = float(features.get("port_congestion", 0))
        if port_cong >= 0.7:
            actions.append("Pre‑clear customs documentation to reduce port dwell time")

        if severity == "critical":
            actions.insert(0, "Escalate to supply‑chain manager immediately")
            actions.append("Activate contingency logistics plan")
        elif severity == "warning":
            actions.append("Monitor shipment closely for further deviations")

        if not actions:
            actions.append("Continue monitoring – no immediate action required")

        return actions

    # ── Heuristic fallback ────────────────────────────────────────────────

    @staticmethod
    def _heuristic_detect(data: Dict[str, Any]) -> Dict[str, Any]:
        """Rule‑based fallback when the model is not trained."""
        score = 0.0
        weather = float(data.get("weather_severity", 1))
        if weather >= 4:
            score += 0.2
        congestion = float(data.get("traffic_congestion", 0))
        if congestion >= 0.8:
            score += 0.15
        reliability = float(data.get("supplier_reliability", 1))
        if reliability < 0.4:
            score += 0.15

        is_anomaly = score >= 0.25
        severity = "info"
        if score >= 0.3:
            severity = "critical"
        elif score >= 0.15:
            severity = "warning"

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 4),
            "severity": severity,
            "description": "Heuristic analysis (model not trained): elevated risk indicators detected."
                           if is_anomaly else "No anomalies detected (heuristic mode).",
            "recommended_actions": ["Train the anomaly model with historical data for better results"],
        }
