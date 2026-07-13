"""
Feature engineering for the Supply Chain Risk Prediction Engine.

Transforms raw shipment, route, weather, and traffic data into a
normalised feature vector consumed by :class:`SupplyChainPredictor`.
"""

from __future__ import annotations

import logging
import math
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

FEATURE_COLUMNS: List[str] = [
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

# Min/max ranges used for normalisation (derived from domain knowledge)
FEATURE_RANGES: Dict[str, tuple] = {
    "weight_kg": (0, 100_000),
    "distance_km": (0, 25_000),
    "weather_severity": (1, 5),
    "traffic_congestion": (0, 1),
    "supplier_reliability": (0, 1),
    "port_congestion": (0, 1),
    "customs_complexity": (0, 1),
    "route_risk_score": (0, 100),
    "month": (1, 12),
    "day_of_week": (0, 6),
    "is_peak_season": (0, 1),
    "cargo_type_encoded": (0, max(CARGO_TYPE_MAP.values())),
}

# Seasonal multipliers per month (1‑indexed)
SEASONAL_MULTIPLIERS: Dict[int, float] = {
    1: 1.0,   # January
    2: 0.9,   # February
    3: 0.9,   # March
    4: 1.0,   # April
    5: 1.0,   # May
    6: 1.1,   # June
    7: 1.1,   # July
    8: 1.15,  # August
    9: 1.1,   # September
    10: 1.2,  # October   – Q4 ramp‑up
    11: 1.35, # November  – peak pre‑holiday
    12: 1.4,  # December  – holiday peak
}


class FeatureEngineer:
    """Extracts, encodes, and normalises features for the ML pipeline."""

    def __init__(self) -> None:
        self.feature_columns = list(FEATURE_COLUMNS)
        self.cargo_type_map = dict(CARGO_TYPE_MAP)
        logger.info("FeatureEngineer initialised (%d features)", len(self.feature_columns))

    # ── Core extraction ───────────────────────────────────────────────────

    def extract_features(
        self,
        shipment: Dict[str, Any],
        route: Dict[str, Any],
        weather_data: Optional[Dict[str, Any]] = None,
        traffic_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Merge all data sources into a flat feature dictionary.

        Parameters
        ----------
        shipment     : shipment record (or prediction request)
        route        : matched route record
        weather_data : optional weather context (keys: severity, conditions)
        traffic_data : optional traffic context (keys: congestion, port_congestion)

        Returns
        -------
        dict with keys matching ``FEATURE_COLUMNS``
        """
        weather_data = weather_data or {}
        traffic_data = traffic_data or {}

        try:
            # Date features
            dep_date = self._parse_date(
                shipment.get("departure_date") or shipment.get("date")
            )
            month = dep_date.month if dep_date else datetime.utcnow().month
            day_of_week = dep_date.weekday() if dep_date else datetime.utcnow().weekday()

            # Route complexity
            route_complexity = self.calculate_route_complexity(route)

            features: Dict[str, Any] = {
                # Shipment
                "weight_kg": float(shipment.get("weight_kg", 5000)),
                "cargo_type": shipment.get("cargo_type", "General"),
                "cargo_type_encoded": self.encode_cargo_type(
                    shipment.get("cargo_type", "General")
                ),

                # Route
                "distance_km": float(
                    route.get("distance_km", shipment.get("distance_km", 0))
                ),
                "route_risk_score": float(
                    route.get("route_risk_score", route_complexity * 100)
                ),

                # Weather
                "weather_severity": int(
                    weather_data.get("severity",
                                     weather_data.get("weather_severity",
                                                      shipment.get("weather_severity", 1)))
                ),

                # Traffic / congestion
                "traffic_congestion": float(
                    traffic_data.get("congestion",
                                     traffic_data.get("traffic_congestion",
                                                      shipment.get("traffic_congestion", 0)))
                ),
                "port_congestion": float(
                    traffic_data.get("port_congestion",
                                     shipment.get("port_congestion", 0))
                ),

                # Supplier
                "supplier_reliability": float(
                    shipment.get("supplier_reliability",
                                 route.get("reliability_score", 0.8))
                ),

                # Customs
                "customs_complexity": float(
                    shipment.get("customs_complexity",
                                 route.get("customs_complexity", 0.3))
                ),

                # Temporal
                "month": month,
                "day_of_week": day_of_week,
                "is_peak_season": int(month in (10, 11, 12)),
            }

            return features

        except Exception as exc:
            logger.exception("Feature extraction failed")
            return self._default_features()

    # ── Cargo encoding ────────────────────────────────────────────────────

    def encode_cargo_type(self, cargo_type: str) -> int:
        """
        Ordinal‑encode a cargo type string.

        Unknown types default to 0 (General).
        """
        return self.cargo_type_map.get(cargo_type, 0)

    # ── Route complexity ──────────────────────────────────────────────────

    @staticmethod
    def calculate_route_complexity(route: Dict[str, Any]) -> float:
        """
        Compute a 0‑1 complexity score based on distance, number of
        risk factors, and typical transit days.

        A higher score implies a more complex (and riskier) route.
        """
        try:
            distance = float(route.get("distance_km", 0))
            risk_factors = route.get("risk_factors", [])
            transit_days = int(route.get("typical_transit_days", 1))

            # Normalise components
            dist_score = min(distance / 20000, 1.0)
            risk_count_score = min(len(risk_factors) / 5, 1.0)
            transit_score = min(transit_days / 30, 1.0)

            complexity = (
                dist_score * 0.4
                + risk_count_score * 0.35
                + transit_score * 0.25
            )
            return round(max(0.0, min(1.0, complexity)), 4)

        except Exception:
            logger.warning("Route complexity calculation fell back to default")
            return 0.5

    # ── Seasonal factor ───────────────────────────────────────────────────

    @staticmethod
    def get_seasonal_factor(month: int) -> float:
        """
        Return a seasonal risk multiplier for the given month (1‑12).

        Q4 months have elevated multipliers reflecting holiday‑season
        volume surges and weather disruptions.
        """
        return SEASONAL_MULTIPLIERS.get(month, 1.0)

    # ── Normalisation ─────────────────────────────────────────────────────

    def normalize_features(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply min‑max normalisation to all numeric features.

        Returns a new dict with the same keys, values scaled to [0, 1].
        """
        normalised: Dict[str, Any] = {}
        for key, value in features.items():
            if key in FEATURE_RANGES:
                lo, hi = FEATURE_RANGES[key]
                span = hi - lo
                if span > 0:
                    try:
                        normalised[key] = round(
                            max(0.0, min(1.0, (float(value) - lo) / span)), 6
                        )
                    except (TypeError, ValueError):
                        normalised[key] = 0.0
                else:
                    normalised[key] = 0.0
            else:
                # Pass through non‑numeric / unmapped keys
                normalised[key] = value
        return normalised

    # ── Feature names ─────────────────────────────────────────────────────

    def get_feature_names(self) -> List[str]:
        """Return the ordered list of feature column names."""
        return list(self.feature_columns)

    # ── Private helpers ───────────────────────────────────────────────────

    @staticmethod
    def _parse_date(value: Any) -> Optional[date]:
        """Best‑effort date parsing from various input formats."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(str(value), fmt).date()
            except ValueError:
                continue
        return None

    @staticmethod
    def _default_features() -> Dict[str, Any]:
        """Fallback feature vector with safe defaults."""
        now = datetime.utcnow()
        return {
            "weight_kg": 5000.0,
            "distance_km": 5000.0,
            "weather_severity": 1,
            "traffic_congestion": 0.0,
            "supplier_reliability": 0.8,
            "port_congestion": 0.0,
            "customs_complexity": 0.3,
            "route_risk_score": 25.0,
            "month": now.month,
            "day_of_week": now.weekday(),
            "is_peak_season": int(now.month in (10, 11, 12)),
            "cargo_type_encoded": 0,
            "cargo_type": "General",
        }
