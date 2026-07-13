"""
Data pipeline for the Supply Chain Risk Prediction Engine.

Handles loading, caching, querying, and updating shipment / route /
historical data from the backend data directory.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


class DataPipeline:
    """
    Centralised data access layer.

    Loads JSON and CSV files from ``data_dir``, caches them in memory,
    and exposes query / mutation helpers used by the API and ML layers.
    """

    def __init__(self, data_dir: str | Path) -> None:
        """
        Parameters
        ----------
        data_dir : absolute or relative path to the ``backend/data/`` folder
        """
        self.data_dir = Path(data_dir)
        if not self.data_dir.is_dir():
            logger.warning("Data directory does not exist: %s", self.data_dir)

        # In‑memory caches (lazily populated)
        self._shipments: Optional[List[Dict[str, Any]]] = None
        self._routes: Optional[List[Dict[str, Any]]] = None
        self._historical: Optional[pd.DataFrame] = None

        logger.info("DataPipeline initialised – data_dir=%s", self.data_dir)

    # ── Loaders (with caching) ────────────────────────────────────────────

    def load_shipments(self) -> List[Dict[str, Any]]:
        """Load and cache ``sample_shipments.json``."""
        if self._shipments is not None:
            return self._shipments

        path = self.data_dir / "sample_shipments.json"
        try:
            with path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            # Accept both a bare list and a wrapper object
            if isinstance(data, dict):
                data = data.get("shipments", data.get("data", []))
            self._shipments = list(data)
            logger.info("Loaded %d shipments from %s", len(self._shipments), path)
            return self._shipments
        except FileNotFoundError:
            logger.error("Shipments file not found: %s", path)
            self._shipments = []
            return self._shipments
        except (json.JSONDecodeError, TypeError) as exc:
            logger.error("Failed to parse shipments JSON: %s", exc)
            self._shipments = []
            return self._shipments

    def load_routes(self) -> List[Dict[str, Any]]:
        """Load and cache ``routes.json``."""
        if self._routes is not None:
            return self._routes

        path = self.data_dir / "routes.json"
        try:
            with path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                data = data.get("routes", data.get("data", []))
            self._routes = list(data)
            logger.info("Loaded %d routes from %s", len(self._routes), path)
            return self._routes
        except FileNotFoundError:
            logger.error("Routes file not found: %s", path)
            self._routes = []
            return self._routes
        except (json.JSONDecodeError, TypeError) as exc:
            logger.error("Failed to parse routes JSON: %s", exc)
            self._routes = []
            return self._routes

    def load_historical_data(self) -> pd.DataFrame:
        """
        Load and cache ``historical_delays.csv``.

        Handles missing values and casts key columns to appropriate types.
        """
        if self._historical is not None:
            return self._historical

        path = self.data_dir / "historical_delays.csv"
        try:
            df = pd.read_csv(path)
            logger.info("Loaded %d rows from %s", len(df), path)

            # ── Type casts & defaults ────────────────────────────────────
            numeric_cols = [
                "weight_kg", "distance_km", "weather_severity",
                "traffic_congestion", "supplier_reliability",
                "port_congestion", "customs_complexity",
                "route_risk_score", "delay_hours",
            ]
            for col in numeric_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

            int_cols = ["month", "day_of_week", "is_peak_season", "is_delayed"]
            for col in int_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

            # Fill remaining NaNs with column‑appropriate defaults
            df.fillna({
                "weather_severity": 1,
                "traffic_congestion": 0.0,
                "supplier_reliability": 0.8,
                "port_congestion": 0.0,
                "customs_complexity": 0.0,
                "route_risk_score": 0.0,
                "delay_hours": 0.0,
                "cargo_type": "General",
            }, inplace=True)

            self._historical = df
            return self._historical

        except FileNotFoundError:
            logger.error("Historical data file not found: %s", path)
            self._historical = pd.DataFrame()
            return self._historical
        except Exception as exc:
            logger.error("Failed to load historical data: %s", exc)
            self._historical = pd.DataFrame()
            return self._historical

    # ── Query helpers ─────────────────────────────────────────────────────

    def get_shipment_by_id(self, shipment_id: str) -> Optional[Dict[str, Any]]:
        """Return the first shipment matching ``shipment_id``, or None."""
        for s in self.load_shipments():
            sid = s.get("id") or s.get("shipment_id")
            if sid == shipment_id:
                return s
        logger.debug("Shipment %s not found", shipment_id)
        return None

    def get_route_by_id(self, route_id: str) -> Optional[Dict[str, Any]]:
        """Return the first route matching ``route_id``, or None."""
        for r in self.load_routes():
            rid = r.get("id") or r.get("route_id")
            if rid == route_id:
                return r
        logger.debug("Route %s not found", route_id)
        return None

    def find_route(
        self, origin: str, destination: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Find a route whose origin and destination cities match
        (case‑insensitive substring match).
        """
        origin_lower = origin.lower()
        dest_lower = destination.lower()

        for r in self.load_routes():
            r_origin = self._extract_city(r, "origin").lower()
            r_dest = self._extract_city(r, "destination").lower()
            if origin_lower in r_origin and dest_lower in r_dest:
                return r
        logger.debug("No route found for %s → %s", origin, destination)
        return None

    def get_shipments_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Return all shipments with the given status."""
        status_lower = status.lower()
        return [
            s for s in self.load_shipments()
            if str(s.get("status", "")).lower() == status_lower
        ]

    def get_shipments_by_risk(
        self, min_risk: float = 0, max_risk: float = 100,
    ) -> List[Dict[str, Any]]:
        """Return shipments whose ``delay_risk_score`` falls in [min_risk, max_risk]."""
        results: List[Dict[str, Any]] = []
        for s in self.load_shipments():
            score = s.get("delay_risk_score", s.get("risk_score", 0))
            try:
                score = float(score)
            except (TypeError, ValueError):
                continue
            if min_risk <= score <= max_risk:
                results.append(s)
        return results

    # ── Mutations ─────────────────────────────────────────────────────────

    def update_shipment(
        self, shipment_id: str, updates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Update fields of an existing shipment (in‑memory only).

        Returns the updated shipment dict, or None if not found.
        """
        shipments = self.load_shipments()
        for s in shipments:
            sid = s.get("id") or s.get("shipment_id")
            if sid == shipment_id:
                s.update(updates)
                logger.info("Updated shipment %s: %s", shipment_id, list(updates.keys()))
                return s
        logger.warning("Cannot update – shipment %s not found", shipment_id)
        return None

    def add_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new shipment to the in‑memory cache and return it."""
        shipments = self.load_shipments()
        # Assign an ID if not present
        if "id" not in shipment_data and "shipment_id" not in shipment_data:
            import uuid
            shipment_data["id"] = f"SHP-{uuid.uuid4().hex[:8].upper()}"
        shipments.append(shipment_data)
        logger.info("Added shipment %s", shipment_data.get("id") or shipment_data.get("shipment_id"))
        return shipment_data

    # ── Analytics ─────────────────────────────────────────────────────────

    def get_summary_stats(self) -> Dict[str, Any]:
        """
        Aggregate high‑level KPIs across all loaded shipments.

        Returns a dict suitable for populating an ``AnalyticsSummary`` model.
        """
        shipments = self.load_shipments()
        total = len(shipments)
        if total == 0:
            return {
                "total_shipments": 0,
                "in_transit": 0,
                "delivered": 0,
                "delayed": 0,
                "on_time_rate": 0.0,
                "avg_delay_hours": 0.0,
                "risk_distribution": {},
                "top_risk_routes": [],
            }

        status_counts: Dict[str, int] = {}
        delay_hours_list: List[float] = []
        risk_buckets: Dict[str, int] = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        route_risks: Dict[str, List[float]] = {}

        for s in shipments:
            # Status
            status = str(s.get("status", "unknown")).lower()
            status_counts[status] = status_counts.get(status, 0) + 1

            # Delay hours
            dh = s.get("delay_hours")
            if dh is not None:
                try:
                    delay_hours_list.append(float(dh))
                except (TypeError, ValueError):
                    pass

            # Risk bucket
            score = 0.0
            try:
                score = float(s.get("delay_risk_score", s.get("risk_score", 0)))
            except (TypeError, ValueError):
                pass
            if score <= 25:
                risk_buckets["Low"] += 1
            elif score <= 50:
                risk_buckets["Medium"] += 1
            elif score <= 75:
                risk_buckets["High"] += 1
            else:
                risk_buckets["Critical"] += 1

            # Per‑route risk aggregation
            route_id = s.get("route_id", "unknown")
            route_risks.setdefault(route_id, []).append(score)

        delivered = status_counts.get("delivered", 0)
        delayed = status_counts.get("delayed", 0)
        on_time = delivered / max(delivered + delayed, 1)

        avg_delay = sum(delay_hours_list) / max(len(delay_hours_list), 1)

        # Top risk routes (by average score, descending)
        top_routes = sorted(
            [
                {"route_id": rid, "avg_risk_score": round(sum(scores) / len(scores), 2)}
                for rid, scores in route_risks.items()
            ],
            key=lambda r: r["avg_risk_score"],
            reverse=True,
        )[:5]

        return {
            "total_shipments": total,
            "in_transit": status_counts.get("in_transit", 0),
            "delivered": delivered,
            "delayed": delayed,
            "on_time_rate": round(on_time, 4),
            "avg_delay_hours": round(avg_delay, 2),
            "risk_distribution": risk_buckets,
            "top_risk_routes": top_routes,
        }

    # ── Cache management ──────────────────────────────────────────────────

    def invalidate_cache(self) -> None:
        """Clear all in‑memory caches, forcing a reload on next access."""
        self._shipments = None
        self._routes = None
        self._historical = None
        logger.info("Data pipeline cache invalidated")

    # ── Private helpers ───────────────────────────────────────────────────

    @staticmethod
    def _extract_city(record: Dict[str, Any], key: str) -> str:
        """
        Extract a city name from a record where the value under ``key``
        may be a plain string or a nested dict with a 'city' field.
        """
        val = record.get(key, "")
        if isinstance(val, dict):
            return val.get("city", "")
        return str(val)
