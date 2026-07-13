"""
Pydantic schemas for the Global Supply Chain Risk Prediction Engine.

Defines all request/response models used across the API layer,
ML prediction pipeline, and analytics dashboard.
"""

from datetime import datetime, date
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    """Enumeration of risk severity levels."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ShipmentStatus(str, Enum):
    """Possible states of a shipment throughout its lifecycle."""
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELAYED = "delayed"
    CANCELLED = "cancelled"
    CUSTOMS_HOLD = "customs_hold"


class AlertSeverity(str, Enum):
    """Severity levels for anomaly alerts."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Priority(str, Enum):
    """Shipment priority tiers."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXPRESS = "express"


# ─── Location & Route ────────────────────────────────────────────────────────

class Location(BaseModel):
    """Geographic location with coordinates."""
    city: str = Field(..., min_length=1, description="City name")
    country: str = Field(..., min_length=1, description="Country name")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")


class RouteInfo(BaseModel):
    """Complete route information between two locations."""
    id: str = Field(..., description="Unique route identifier")
    origin: Location
    destination: Location
    distance_km: float = Field(..., gt=0, description="Route distance in kilometres")
    typical_transit_days: int = Field(..., gt=0, description="Normal transit duration")
    route_type: str = Field(
        default="ocean",
        description="Transport mode (ocean, air, rail, road)",
    )
    risk_factors: List[str] = Field(
        default_factory=list,
        description="Known risk factors on this route",
    )
    avg_delay_hours: float = Field(default=0.0, ge=0, description="Historical average delay")
    reliability_score: float = Field(
        default=0.8,
        ge=0,
        le=1,
        description="Route reliability (0‑1)",
    )

    @field_validator("reliability_score", mode="before")
    @classmethod
    def convert_reliability_score(cls, v: Any) -> float:
        try:
            val = float(v)
            if val > 1.0:
                return val / 100.0
            return val
        except (ValueError, TypeError):
            return 0.8


# ─── Shipment ────────────────────────────────────────────────────────────────

class ShipmentBase(BaseModel):
    """Common shipment fields shared by create and response models."""
    origin: str = Field(..., min_length=1, description="Origin city or location")
    destination: str = Field(..., min_length=1, description="Destination city or location")
    cargo_type: str = Field(default="General", description="Type of cargo")
    weight_kg: float = Field(default=5000.0, gt=0, description="Shipment weight in kg")
    volume_cbm: float = Field(default=10.0, gt=0, description="Volume in cubic metres")
    priority: Priority = Field(default=Priority.MEDIUM, description="Shipment priority")

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, v: Any) -> Priority:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean == "standard":
                return Priority.MEDIUM
            if v_clean == "critical":
                return Priority.HIGH
            if v_clean == "express":
                return Priority.EXPRESS
            if v_clean in ("low", "medium", "high"):
                return Priority(v_clean)
        if isinstance(v, Priority):
            return v
        return Priority.MEDIUM


class ShipmentCreate(ShipmentBase):
    """Payload for creating a new shipment."""
    departure_date: date = Field(..., description="Scheduled departure date")


class ShipmentResponse(ShipmentBase):
    """Full shipment record returned by the API."""
    id: str = Field(..., description="Unique shipment identifier")
    route_id: str = Field(..., description="Associated route identifier")
    status: ShipmentStatus = Field(default=ShipmentStatus.PENDING)
    departure_date: date
    estimated_arrival: date
    actual_arrival: Optional[date] = Field(default=None)
    current_location: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Current GPS coordinates or checkpoint",
    )
    weather_conditions: str = Field(default="Clear", description="Current weather along route")
    traffic_congestion: float = Field(default=0.0, ge=0, le=1, description="Congestion index 0‑1")
    supplier_reliability: float = Field(default=0.8, ge=0, le=1)
    delay_risk_score: float = Field(default=0.0, ge=0, le=100, description="ML risk score 0‑100")
    delay_hours: Optional[float] = Field(default=None, ge=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Any) -> ShipmentStatus:
        if isinstance(v, str):
            v_clean = v.strip().lower().replace(" ", "_")
            if v_clean in ("pending", "in_transit", "delivered", "delayed", "cancelled", "customs_hold"):
                return ShipmentStatus(v_clean)
        if isinstance(v, ShipmentStatus):
            return v
        return ShipmentStatus.PENDING

    @field_validator("departure_date", "estimated_arrival", "actual_arrival", mode="before")
    @classmethod
    def parse_date(cls, v: Any) -> Any:
        if isinstance(v, str):
            date_str = v.split("T")[0].split(" ")[0]
            try:
                return date.fromisoformat(date_str)
            except ValueError:
                pass
        return v


# ─── Prediction ───────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    """Input parameters for a delay‑risk prediction."""
    origin: str = Field(..., min_length=1, description="Origin city")
    destination: str = Field(..., min_length=1, description="Destination city")
    cargo_type: str = Field(default="General", description="Cargo category")
    weight_kg: float = Field(default=5000.0, gt=0)
    departure_date: Optional[date] = Field(default=None)
    weather_severity: Optional[int] = Field(default=None, ge=1, le=5)
    traffic_congestion: Optional[float] = Field(default=None, ge=0, le=1)

    @field_validator("weather_severity", mode="before")
    @classmethod
    def clamp_weather(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            return max(1, min(5, int(v)))
        return v


class ContributingFactor(BaseModel):
    """A single factor that contributes to the risk score."""
    name: str
    impact: float = Field(..., ge=0, le=1, description="Normalised impact weight")
    description: str


class PredictionResponse(BaseModel):
    """Result of a delay‑risk prediction."""
    shipment_id: Optional[str] = Field(default=None)
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0, le=100)
    delay_probability: float = Field(..., ge=0, le=1)
    estimated_delay_hours: float = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=1)
    contributing_factors: List[ContributingFactor] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    predicted_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Simulation ───────────────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    """
    Allows users to override individual parameters on top of a base
    prediction request to explore "what‑if" scenarios.
    """
    scenario_name: str = Field(
        default="Custom Scenario",
        description="Human‑readable label for the scenario",
    )
    origin: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    cargo_type: Optional[str] = Field(default=None)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    departure_date: Optional[date] = Field(default=None)
    weather_severity: Optional[int] = Field(default=None, ge=1, le=5)
    traffic_congestion: Optional[float] = Field(default=None, ge=0, le=1)
    supplier_reliability: Optional[float] = Field(default=None, ge=0, le=1)
    port_congestion: Optional[float] = Field(default=None, ge=0, le=1)
    customs_complexity: Optional[float] = Field(default=None, ge=0, le=1)


class SimulationResponse(BaseModel):
    """Outcome of a single simulation scenario."""
    scenario_name: str
    prediction: PredictionResponse
    parameter_values: Dict[str, Any] = Field(
        default_factory=dict,
        description="Effective parameter values used in the simulation",
    )


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single conversational exchange with the AI assistant."""
    message: str = Field(..., min_length=1, description="User message")
    response: Optional[str] = Field(default=None, description="Assistant response")
    suggested_questions: Optional[List[str]] = Field(
        default=None,
        description="Follow‑up questions the user may ask",
    )


# ─── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    """Aggregated KPIs for the analytics dashboard."""
    total_shipments: int = Field(..., ge=0)
    in_transit: int = Field(..., ge=0)
    delivered: int = Field(..., ge=0)
    delayed: int = Field(..., ge=0)
    on_time_rate: float = Field(..., ge=0, le=1)
    avg_delay_hours: float = Field(..., ge=0)
    risk_distribution: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of shipments per risk level",
    )
    top_risk_routes: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Routes with the highest average risk scores",
    )


# ─── Anomaly ──────────────────────────────────────────────────────────────────

class AnomalyAlert(BaseModel):
    """An anomaly detected by the anomaly‑detection pipeline."""
    id: str = Field(..., description="Unique alert identifier")
    severity: AlertSeverity = Field(default=AlertSeverity.INFO)
    title: str
    description: str
    affected_shipments: List[str] = Field(
        default_factory=list,
        description="IDs of affected shipments",
    )
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    recommended_actions: List[str] = Field(default_factory=list)


# ─── Reports ──────────────────────────────────────────────────────────────────

class ReportData(BaseModel):
    """Structured report payload for PDF / dashboard export."""
    report_type: str = Field(
        ...,
        description="E.g. 'daily_summary', 'risk_analysis', 'route_performance'",
    )
    date_range: Dict[str, str] = Field(
        ...,
        description="{'start': 'YYYY-MM-DD', 'end': 'YYYY-MM-DD'}",
    )
    summary: Dict[str, Any] = Field(default_factory=dict)
    details: List[Dict[str, Any]] = Field(default_factory=list)
