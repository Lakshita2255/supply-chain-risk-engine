"""
Main API entrypoint for the Supply Chain Risk Prediction Engine.
"""

import os
import sys
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add workspace directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.pipelines.data_pipeline import DataPipeline
from backend.pipelines.feature_engineering import FeatureEngineer
from backend.models.ml_model import SupplyChainPredictor
from backend.models.anomaly_detector import AnomalyDetector
from backend.utils.helpers import generate_id, calculate_distance
from backend.models.schemas import (
    ShipmentCreate,
    ShipmentResponse,
    PredictionRequest,
    PredictionResponse,
    SimulationRequest,
    SimulationResponse,
    ChatMessage,
    AnalyticsSummary,
    AnomalyAlert,
    ReportData,
    RiskLevel,
    ShipmentStatus,
    AlertSeverity,
    ContributingFactor,
    RouteInfo,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pipelines and models
data_pipeline = DataPipeline(settings.DATA_DIR)
feature_engineer = FeatureEngineer()
predictor = SupplyChainPredictor()
anomaly_detector = AnomalyDetector()

# In-memory alerts cache
cached_alerts: List[Dict[str, Any]] = []

def enrich_shipments_for_anomaly_detection(shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich raw shipments with matched route details and weather mapping for ML anomaly detection."""
    enriched_shipments = []
    weather_map = {"Clear": 1, "Cloudy": 2, "Rain": 3, "Storm": 4, "Extreme": 5}
    for s in shipments:
        route = data_pipeline.get_route_by_id(s.get("route_id")) or {}
        w_cond = s.get("weather_conditions", "Clear")
        weather_severity = weather_map.get(w_cond, 1)
        
        feature_input = {
            "weight_kg": s.get("weight_kg", 5000),
            "cargo_type": s.get("cargo_type", "General"),
            "distance_km": route.get("distance_km", s.get("distance_km", 1000)),
            "weather_severity": weather_severity,
            "traffic_congestion": s.get("traffic_congestion", 0.0),
            "supplier_reliability": s.get("supplier_reliability", route.get("reliability_score", 80) / 100.0),
            "port_congestion": s.get("port_congestion") or (0.3 if weather_severity > 3 else 0.1),
            "customs_complexity": route.get("customs_complexity", 0.3),
            "departure_date": s.get("departure_date")
        }
        
        try:
            pred_features = feature_engineer.extract_features(feature_input, route)
            s_enriched = s.copy()
            s_enriched.update(pred_features)
            if "shipment_id" not in s_enriched:
                s_enriched["shipment_id"] = s.get("id")
            enriched_shipments.append(s_enriched)
        except Exception as e:
            logger.error(f"Failed to enrich shipment {s.get('id')}: {e}")
            enriched_shipments.append(s)
            
    return enriched_shipments

@app.on_event("startup")
def startup_event():
    """Run model training and ensure directory structures on startup."""
    logger.info("Starting up Supply Chain Risk Engine services...")
    settings.ensure_directories()
    
    # Check if historical data exists
    csv_path = settings.DATA_DIR / "historical_delays.csv"
    if not csv_path.exists():
        logger.warning(f"Historical delays file not found at: {csv_path}. Please run generate_csv.py.")
    else:
        try:
            logger.info("Training ML prediction model...")
            predictor.train(csv_path)
            
            logger.info("Training Isolation Forest anomaly detector...")
            df = data_pipeline.load_historical_data()
            if not df.empty:
                anomaly_detector.train(df)
            logger.info("All models trained and ready.")
        except Exception as e:
            logger.error(f"Error training models during startup: {e}")
            
    # Initial scan of sample shipments to generate static alerts
    try:
        shipments = data_pipeline.load_shipments()
        global cached_alerts
        enriched = enrich_shipments_for_anomaly_detection(shipments)
        cached_alerts = anomaly_detector.scan_shipments(enriched)
        logger.info(f"Generated {len(cached_alerts)} initial anomaly alerts.")
    except Exception as e:
        logger.error(f"Error scanning initial shipments: {e}")

# Helper function to save shipments back to disk
def persist_shipments():
    """Save in-memory shipments list to sample_shipments.json to persist changes."""
    try:
        import json
        path = settings.DATA_DIR / "sample_shipments.json"
        shipments_data = data_pipeline.load_shipments()
        # Custom JSON encoder for datetime and date objects
        class DateTimeEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                return super().default(obj)
                
        with path.open("w", encoding="utf-8") as f:
            json.dump(shipments_data, f, cls=DateTimeEncoder, indent=2)
        logger.info(f"Persisted {len(shipments_data)} shipments to {path}")
    except Exception as e:
        logger.error(f"Failed to persist shipments: {e}")

# ─── Shipment Endpoints ──────────────────────────────────────────────────────

@app.get("/api/shipments", response_model=List[ShipmentResponse])
def get_shipments(status: Optional[str] = None):
    """Retrieve all shipments, optionally filtered by status."""
    if status:
        shipments = data_pipeline.get_shipments_by_status(status)
    else:
        shipments = data_pipeline.load_shipments()
    return shipments

@app.get("/api/shipments/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(shipment_id: str):
    """Retrieve a single shipment by its ID."""
    shipment = data_pipeline.get_shipment_by_id(shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID {shipment_id} not found."
        )
    return shipment

@app.post("/api/shipments", response_model=ShipmentResponse)
def create_shipment(shipment: ShipmentCreate):
    """Create a new shipment, predict its risk score, and save it."""
    # Find matching route info
    route = data_pipeline.find_route(shipment.origin, shipment.destination)
    if not route:
        route_id = "ROUTE-MOCK"
        dist = calculate_distance(0.0, 0.0, 10.0, 10.0) # default distance
        transit_days = 5
        reliability = 0.8
        customs = 0.3
    else:
        route_id = route.get("id") or route.get("route_id")
        dist = route.get("distance_km", 1000)
        transit_days = route.get("typical_transit_days", 5)
        reliability = route.get("reliability_score", 80) / 100.0
        customs = route.get("customs_complexity", 0.3)
        
    # Extract features for prediction
    feature_input = {
        "weight_kg": shipment.weight_kg,
        "cargo_type": shipment.cargo_type,
        "distance_km": dist,
        "weather_severity": 1,
        "traffic_congestion": 0.1,
        "supplier_reliability": reliability,
        "port_congestion": 0.2,
        "customs_complexity": customs,
        "departure_date": shipment.departure_date,
    }
    
    # Run risk prediction
    try:
        pred_features = feature_engineer.extract_features(feature_input, route or {})
        prediction = predictor.predict(pred_features)
        risk_score = prediction["risk_score"]
        delay_hours = prediction["estimated_delay_hours"]
    except Exception as e:
        logger.error(f"Prediction failed for new shipment: {e}")
        risk_score = 15.0
        delay_hours = 0.0
        
    # Calculate arrival date
    dep_date = datetime.combine(shipment.departure_date, datetime.min.time())
    est_arrival = dep_date + timedelta(days=transit_days)
    
    # Build complete shipment object
    new_shipment = {
        "id": generate_id("SHP"),
        "route_id": route_id,
        "origin": shipment.origin,
        "destination": shipment.destination,
        "cargo_type": shipment.cargo_type,
        "weight_kg": shipment.weight_kg,
        "volume_cbm": shipment.volume_cbm,
        "status": ShipmentStatus.PENDING.value,
        "priority": shipment.priority.value,
        "departure_date": shipment.departure_date.isoformat(),
        "estimated_arrival": est_arrival.isoformat(),
        "actual_arrival": None,
        "current_location": None,
        "weather_conditions": "Clear",
        "traffic_congestion": 0.1,
        "supplier_reliability": reliability,
        "delay_risk_score": int(risk_score),
        "delay_hours": round(delay_hours, 1),
        "last_updated": datetime.utcnow().isoformat()
    }
    
    added_shipment = data_pipeline.add_shipment(new_shipment)
    persist_shipments()
    return added_shipment

@app.put("/api/shipments/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(shipment_id: str, updates: Dict[str, Any]):
    """Update shipment status, location, or risk parameters."""
    shipment = data_pipeline.get_shipment_by_id(shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID {shipment_id} not found."
        )
        
    # Apply updates
    shipment.update(updates)
    shipment["last_updated"] = datetime.utcnow().isoformat()
    
    route_id = shipment.get("route_id")
    route = data_pipeline.get_route_by_id(route_id) if route_id else None
    
    weather_map = {"Clear": 1, "Cloudy": 2, "Rain": 3, "Storm": 4, "Extreme": 5}
    weather_cond = shipment.get("weather_conditions", "Clear")
    weather_severity = weather_map.get(weather_cond, 1)
    
    feature_input = {
        "weight_kg": shipment.get("weight_kg", 5000),
        "cargo_type": shipment.get("cargo_type", "General"),
        "distance_km": route.get("distance_km", 1000) if route else 1000,
        "weather_severity": weather_severity,
        "traffic_congestion": shipment.get("traffic_congestion", 0.0),
        "supplier_reliability": shipment.get("supplier_reliability", 0.8),
        "port_congestion": shipment.get("port_congestion", 0.0) or (0.3 if weather_severity > 3 else 0.1),
        "customs_complexity": route.get("customs_complexity", 0.3) if route else 0.3,
        "departure_date": shipment.get("departure_date")
    }
    
    try:
        pred_features = feature_engineer.extract_features(feature_input, route or {})
        prediction = predictor.predict(pred_features)
        shipment["delay_risk_score"] = int(prediction["risk_score"])
        shipment["delay_hours"] = round(prediction["estimated_delay_hours"], 1)
        
        if shipment["status"] == ShipmentStatus.DELIVERED.value and not shipment.get("actual_arrival"):
            shipment["actual_arrival"] = datetime.utcnow().isoformat()
            
    except Exception as e:
        logger.error(f"Re-prediction failed during shipment update: {e}")
        
    data_pipeline.update_shipment(shipment_id, shipment)
    persist_shipments()
    
    try:
        global cached_alerts
        enriched = enrich_shipments_for_anomaly_detection(data_pipeline.load_shipments())
        cached_alerts = anomaly_detector.scan_shipments(enriched)
    except Exception as e:
        logger.error(f"Re-scanning shipments failed: {e}")
        
    return shipment

# ─── Route Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/routes", response_model=List[RouteInfo])
def get_routes():
    """Retrieve all available routes."""
    return data_pipeline.load_routes()

@app.get("/api/routes/{route_id}", response_model=RouteInfo)
def get_route(route_id: str):
    """Retrieve details for a specific route."""
    route = data_pipeline.get_route_by_id(route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route with ID {route_id} not found."
        )
    return route

# ─── Prediction & Simulation Endpoints ───────────────────────────────────────

def get_delay_recommendations(features: Dict[str, Any], risk_level: str) -> List[str]:
    recs = []
    
    weather = float(features.get("weather_severity", 1))
    if weather >= 4:
        recs.append("Reroute shipment via alternative shipping lanes to bypass storm front.")
        recs.append("Delay departure by 24-48 hours until weather reports clear.")
    elif weather >= 3:
        recs.append("Instruct carrier to secure cargo and monitor updates closely.")
        
    traffic = float(features.get("traffic_congestion", 0.0))
    if traffic >= 0.7:
        recs.append("Coordinate off-peak loading slots with regional logistics hub.")
    
    port_cong = float(features.get("port_congestion", 0.0))
    if port_cong >= 0.7:
        recs.append("Pre-clear customs paperwork before port entry to reduce dwell time.")
        recs.append("Redirect shipment to secondary dry-port to buffer delays.")
        
    reliability = float(features.get("supplier_reliability", 1.0))
    if reliability < 0.7:
        recs.append("Activate secondary backup supplier to fulfill partial volume.")
        
    if risk_level in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value):
        recs.append("Flag shipment with high-priority tracking alerts.")
        recs.append("Add buffer stock at destination warehousing centers.")
        
    if not recs:
        recs.append("No immediate action required. Maintain standard monitoring schedules.")
        
    return recs

@app.post("/api/predict", response_model=PredictionResponse)
def predict_risk(request: PredictionRequest):
    """Run delay prediction on custom parameters."""
    route = data_pipeline.find_route(request.origin, request.destination)
    if not route:
        dist = 5000.0
        reliability = 0.8
        customs = 0.3
    else:
        dist = route.get("distance_km", 5000.0)
        reliability = route.get("reliability_score", 80) / 100.0
        customs = route.get("customs_complexity", 0.3)
        
    feature_input = {
        "weight_kg": request.weight_kg,
        "cargo_type": request.cargo_type,
        "distance_km": dist,
        "weather_severity": request.weather_severity or 1,
        "traffic_congestion": request.traffic_congestion or 0.1,
        "supplier_reliability": reliability,
        "port_congestion": 0.2,
        "customs_complexity": customs,
        "departure_date": request.departure_date or date.today(),
    }
    
    try:
        pred_features = feature_engineer.extract_features(feature_input, route or {})
        prediction = predictor.predict(pred_features)
        
        factors = []
        for f in prediction["contributing_factors"]:
            factors.append(
                ContributingFactor(
                    name=f["name"],
                    impact=f["impact"],
                    description=f["description"]
                )
            )
            
        recs = get_delay_recommendations(pred_features, prediction["risk_level"])
        
        return PredictionResponse(
            risk_level=prediction["risk_level"],
            risk_score=prediction["risk_score"],
            delay_probability=prediction["delay_probability"],
            estimated_delay_hours=prediction["estimated_delay_hours"],
            confidence=prediction["confidence"],
            contributing_factors=factors,
            recommendations=recs,
            predicted_at=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Prediction API failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction engine failed: {e}"
        )

@app.post("/api/simulate", response_model=SimulationResponse)
def simulate_scenario(request: SimulationRequest):
    """Run simulation with factor overrides to compare outcomes."""
    route = data_pipeline.find_route(request.origin, request.destination)
    if not route:
        dist = 5000.0
        reliability = 0.8
        customs = 0.3
    else:
        dist = route.get("distance_km", 5000.0)
        reliability = route.get("reliability_score", 80) / 100.0
        customs = route.get("customs_complexity", 0.3)
        
    feature_input = {
        "weight_kg": request.weight_kg if request.weight_kg is not None else 5000.0,
        "cargo_type": request.cargo_type if request.cargo_type is not None else "General",
        "distance_km": dist,
        "weather_severity": request.weather_severity if request.weather_severity is not None else 1,
        "traffic_congestion": request.traffic_congestion if request.traffic_congestion is not None else 0.1,
        "supplier_reliability": request.supplier_reliability if request.supplier_reliability is not None else reliability,
        "port_congestion": request.port_congestion if request.port_congestion is not None else 0.2,
        "customs_complexity": request.customs_complexity if request.customs_complexity is not None else customs,
        "departure_date": request.departure_date or date.today()
    }
    
    try:
        pred_features = feature_engineer.extract_features(feature_input, route or {})
        prediction = predictor.predict(pred_features)
        
        factors = []
        for f in prediction["contributing_factors"]:
            factors.append(
                ContributingFactor(
                    name=f["name"],
                    impact=f["impact"],
                    description=f["description"]
                )
            )
            
        recs = get_delay_recommendations(pred_features, prediction["risk_level"])
        
        pred_response = PredictionResponse(
            risk_level=prediction["risk_level"],
            risk_score=prediction["risk_score"],
            delay_probability=prediction["delay_probability"],
            estimated_delay_hours=prediction["estimated_delay_hours"],
            confidence=prediction["confidence"],
            contributing_factors=factors,
            recommendations=recs,
            predicted_at=datetime.utcnow()
        )
        
        return SimulationResponse(
            scenario_name=request.scenario_name,
            prediction=pred_response,
            parameter_values=feature_input
        )
        
    except Exception as e:
        logger.error(f"Simulation API failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation engine failed: {e}"
        )

# ─── Analytics & Anomalies Endpoints ─────────────────────────────────────────

@app.get("/api/analytics", response_model=AnalyticsSummary)
def get_analytics():
    """Retrieve aggregated performance metrics and risk breakdowns."""
    stats = data_pipeline.get_summary_stats()
    return stats

@app.get("/api/anomalies", response_model=List[AnomalyAlert])
def get_anomalies(scan: bool = False):
    """Scan shipments for abnormal logs using Isolation Forest."""
    global cached_alerts
    if scan:
        shipments = data_pipeline.load_shipments()
        try:
            enriched = enrich_shipments_for_anomaly_detection(shipments)
            cached_alerts = anomaly_detector.scan_shipments(enriched)
            logger.info(f"Manual scan complete: {len(cached_alerts)} alerts detected.")
        except Exception as e:
            logger.error(f"Manual scan failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Isolation forest scan failed: {e}"
            )
            
    alerts = []
    for item in cached_alerts:
        alerts.append(
            AnomalyAlert(
                id=item["id"],
                severity=item["severity"],
                title=item["title"],
                description=item["description"],
                affected_shipments=item["affected_shipments"],
                detected_at=datetime.fromisoformat(item["detected_at"]),
                recommended_actions=item["recommended_actions"]
            )
        )
    return alerts

# ─── Chat & Reports Endpoints ────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatMessage)
def chat_assistant(chat: ChatMessage):
    """Interactive conversational chatbot addressing supply chain risks."""
    msg = chat.message.lower().strip()
    response = ""
    suggested = []
    
    shipments = data_pipeline.load_shipments()
    stats = data_pipeline.get_summary_stats()
    
    if "shipment" in msg:
        found_shipment = None
        for s in shipments:
            sid = s.get("id") or s.get("shipment_id")
            if sid.lower() in msg:
                found_shipment = s
                break
                
        if found_shipment:
            sid = found_shipment.get("id") or found_shipment.get("shipment_id")
            origin = found_shipment.get("origin")
            dest = found_shipment.get("destination")
            status_val = found_shipment.get("status")
            risk = found_shipment.get("delay_risk_score", 0)
            delay = found_shipment.get("delay_hours", 0.0)
            weather = found_shipment.get("weather_conditions", "Clear")
            congestion = found_shipment.get("traffic_congestion", 0.0)
            
            response = (
                f"**Shipment ID:** {sid}\n"
                f"**Route:** {origin} to {dest}\n"
                f"**Current Status:** {status_val}\n"
                f"**Delay Risk Score:** {risk}/100\n"
                f"**Estimated Delay Hours:** {delay}h\n\n"
                f"**Current Conditions:** Weather along the route is currently **{weather}** "
                f"with a regional traffic congestion factor of **{congestion:.2f}**.\n"
            )
            
            if risk > 50:
                response += (
                    "\n**Mitigation Recommendations:**\n"
                    "- Flag this cargo for priority logistics routing.\n"
                    "- Alert the warehouse receiver in advance to buffer inventory cycles.\n"
                )
            else:
                response += "\nThis shipment is on schedule. No urgent intervention required."
        else:
            response = (
                "To look up a shipment's details, please specify the exact shipment ID (for example, "
                "**SHP-A1B2C3** or **SHP-D4E5F6**). Here is a summary of current operations:\n"
                f"- Total active shipments monitored: **{stats['in_transit']}** in transit.\n"
                f"- Flagged delayed: **{stats['delayed']}** shipments.\n"
                f"- Overall On-Time performance rating: **{stats['on_time_rate'] * 100:.1f}%**.\n"
            )
            
    elif "route" in msg:
        top_routes = stats.get("top_risk_routes", [])
        top_route_strs = []
        for r in top_routes:
            route_id = r.get("route_id")
            avg_score = r.get("avg_risk_score")
            route_detail = data_pipeline.get_route_by_id(route_id)
            if route_detail:
                origin = route_detail["origin"]["city"]
                dest = route_detail["destination"]["city"]
                top_route_strs.append(f"- **{route_id}** ({origin} → {dest}): Average Risk Score: **{avg_score}**")
            else:
                top_route_strs.append(f"- **{route_id}**: Average Risk: **{avg_score}**")
                
        response = (
            "Here are the highest risk routes currently registered in the database:\n\n"
            + "\n".join(top_route_strs) + "\n\n"
            "High risk scores are typically driven by persistent weather cycles (typhoon belts), "
            "extreme distances, or complex customs protocols."
        )
        
    elif "weather" in msg or "storm" in msg:
        response = (
            "**Weather Mitigation Playbook:**\n\n"
            "1. **Re-routing**: If weather severity levels reach level 4 (Storm) or 5 (Extreme), trigger alternative routing logic. "
            "For trans-Pacific ocean lanes, this often means diverting ships south of storm systems.\n"
            "2. **Departure Buffers**: Delay ship departures by 24-48 hours. The fuel savings and safety improvements outweigh "
            "the transit wait times.\n"
            "3. **Modal Shifts**: For high-value pharmaceuticals or critical electronics, evaluate switching from ocean carrier "
            "to express air cargo to bypass maritime bottlenecks."
        )
        
    elif "congestion" in msg or "port" in msg:
        response = (
            "**Port Congestion Mitigation Guidelines:**\n\n"
            "- **Digital Document Pre-Clearance**: Ensure all customs document filings are completed 72 hours before port arrival to eliminate document holds.\n"
            "- **Off-Peak Slot Booking**: Schedule container pickups during night-shift operations (10 PM to 6 AM) when terminal gate delays drop by up to 45%.\n"
            "- **Alternative Ports**: Divert vessels to nearby feeder ports (e.g. Port of Oakland instead of LAX/Long Beach) and use intermodal rail transport."
        )
        
    else:
        response = (
            "Hello! I am your AI Supply Chain Risk Assistant. I analyze real-time shipment profiles, "
            "ML model factors, and anomaly triggers to answer your questions.\n\n"
            "Here are some examples of what you can ask me:\n"
            "- *'What is the delay risk for shipment SHP-D4E5F6?'*\n"
            "- *'Which routes currently have the highest risk scores?'*\n"
            "- *'How can we mitigate severe weather along shipping lanes?'*\n"
            "- *'What suggestions do you have to avoid terminal port congestion?'*"
        )
        
    suggested = [
        "What is the status of shipment SHP-D4E5F6?",
        "Which routes are currently high-risk?",
        "How can we avoid weather delays?",
        "What are the best methods to tackle port congestion?"
    ]
    
    return ChatMessage(
        message=chat.message,
        response=response,
        suggested_questions=suggested
    )

@app.post("/api/reports/export", response_model=ReportData)
def export_report(report: ReportData):
    """Build and return structured reporting data."""
    shipments = data_pipeline.load_shipments()
    
    details_list = []
    for s in shipments:
        details_list.append({
            "shipment_id": s.get("id") or s.get("shipment_id"),
            "route": f"{s.get('origin')} → {s.get('destination')}",
            "cargo_type": s.get("cargo_type"),
            "risk_score": s.get("delay_risk_score", 0),
            "status": s.get("status"),
            "delay_hours": s.get("delay_hours", 0.0),
            "weather": s.get("weather_conditions")
        })
        
    report.details = details_list
    report.summary = {
        "generated_at": datetime.utcnow().isoformat(),
        "total_items": len(details_list),
        "high_risk_items": sum(1 for d in details_list if d["risk_score"] > 50),
        "delayed_items": sum(1 for d in details_list if d["status"] == ShipmentStatus.DELAYED.value)
    }
    
    return report

# ─── Execution ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
