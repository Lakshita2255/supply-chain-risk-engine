"""Generate historical_delays.csv with 300 statistically realistic rows."""
import csv
import random
import os

random.seed(42)

ROUTES = {
    "ROUTE-001": ("Shanghai", "Los Angeles", 10463),
    "ROUTE-002": ("Rotterdam", "New York", 5836),
    "ROUTE-003": ("Mumbai", "Dubai", 1923),
    "ROUTE-004": ("Singapore", "Sydney", 6302),
    "ROUTE-005": ("Hamburg", "Shanghai", 19540),
    "ROUTE-006": ("Santos", "Rotterdam", 9616),
    "ROUTE-007": ("Busan", "Long Beach", 9648),
    "ROUTE-008": ("Dubai", "London", 5488),
    "ROUTE-009": ("Tokyo", "Vancouver", 7562),
    "ROUTE-010": ("Lagos", "Amsterdam", 6588),
    "ROUTE-011": ("Cape Town", "Mumbai", 8146),
    "ROUTE-012": ("Guangzhou", "Hamburg", 18120),
    "ROUTE-013": ("Ho Chi Minh City", "Yokohama", 4210),
    "ROUTE-014": ("Jeddah", "Singapore", 7234),
    "ROUTE-015": ("Piraeus", "Istanbul", 612),
    "ROUTE-016": ("Felixstowe", "New York", 5516),
    "ROUTE-017": ("Colombo", "Melbourne", 8432),
    "ROUTE-018": ("Mombasa", "Jeddah", 2812),
    "ROUTE-019": ("Callao", "Shanghai", 17240),
    "ROUTE-020": ("Antwerp", "Casablanca", 2387),
}

HIGH_RISK_ROUTES = {"ROUTE-010", "ROUTE-018", "ROUTE-005", "ROUTE-019", "ROUTE-006"}

CARGO_TYPES = [
    "Electronics", "Automotive Parts", "Pharmaceuticals", "Textiles",
    "Food & Perishables", "Machinery", "Chemicals", "Consumer Goods",
    "Raw Materials", "Furniture"
]

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
    "backend", "data", "historical_delays.csv")
os.makedirs(os.path.dirname(output_path), exist_ok=True)

rows = []
for i in range(1, 301):
    route_id = f"ROUTE-{random.randint(1,20):03d}"
    origin, destination, distance_km = ROUTES[route_id]
    cargo_type = random.choice(CARGO_TYPES)
    weight_kg = random.randint(500, 50000)
    month = random.randint(1, 12)
    day_of_week = random.randint(0, 6)
    is_peak_season = 1 if month in (10, 11, 12) else 0

    # Base risk from route
    if route_id in HIGH_RISK_ROUTES:
        base_route_risk = random.randint(55, 90)
    else:
        base_route_risk = random.randint(15, 60)

    # Weather severity - higher in peak season and high-risk routes
    if is_peak_season:
        weather_severity = random.choices([1,2,3,4,5], weights=[10,15,25,30,20])[0]
    else:
        weather_severity = random.choices([1,2,3,4,5], weights=[25,30,25,15,5])[0]

    # Traffic congestion
    if is_peak_season:
        traffic_congestion = round(random.uniform(0.3, 1.0), 2)
    else:
        traffic_congestion = round(random.uniform(0.05, 0.75), 2)

    supplier_reliability = round(random.uniform(0.50, 1.0), 2)

    # Port congestion - higher for congested routes
    if route_id in {"ROUTE-001", "ROUTE-005", "ROUTE-006", "ROUTE-010", "ROUTE-012", "ROUTE-019"}:
        port_congestion = round(random.uniform(0.3, 0.95), 2)
    else:
        port_congestion = round(random.uniform(0.05, 0.65), 2)

    customs_complexity = random.choices([1,2,3,4,5], weights=[15,25,30,20,10])[0]
    route_risk_score = base_route_risk

    # Delay calculation - correlated with risk factors
    delay_probability = 0.15  # base
    delay_probability += (weather_severity - 1) * 0.08
    delay_probability += traffic_congestion * 0.15
    delay_probability += (1 - supplier_reliability) * 0.20
    delay_probability += port_congestion * 0.10
    if is_peak_season:
        delay_probability += 0.15
    if weight_kg > 30000:
        delay_probability += 0.05
    if route_id in HIGH_RISK_ROUTES:
        delay_probability += 0.10

    delay_probability = min(delay_probability, 0.95)

    if random.random() < delay_probability:
        # Generate delay hours with realistic distribution
        r = random.random()
        if r < 0.35:
            delay_hours = round(random.uniform(4.1, 12.0), 1)
        elif r < 0.70:
            delay_hours = round(random.uniform(12.0, 36.0), 1)
        elif r < 0.90:
            delay_hours = round(random.uniform(36.0, 72.0), 1)
        else:
            delay_hours = round(random.uniform(72.0, 168.0), 1)
        # Amplify for bad conditions
        if weather_severity >= 4:
            delay_hours = round(delay_hours * random.uniform(1.1, 1.5), 1)
        is_delayed = 1
    else:
        delay_hours = round(random.uniform(0.0, 4.0), 1)
        is_delayed = 0

    rows.append({
        "shipment_id": f"HST-{i:06d}",
        "route_id": route_id,
        "origin": origin,
        "destination": destination,
        "cargo_type": cargo_type,
        "weight_kg": weight_kg,
        "distance_km": distance_km,
        "weather_severity": weather_severity,
        "traffic_congestion": traffic_congestion,
        "supplier_reliability": supplier_reliability,
        "port_congestion": port_congestion,
        "customs_complexity": customs_complexity,
        "route_risk_score": route_risk_score,
        "month": month,
        "day_of_week": day_of_week,
        "is_peak_season": is_peak_season,
        "delay_hours": delay_hours,
        "is_delayed": is_delayed,
    })

with open(output_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

# Stats
delayed = sum(1 for r in rows if r["is_delayed"] == 1)
peak_delayed = sum(1 for r in rows if r["is_peak_season"] == 1 and r["is_delayed"] == 1)
peak_total = sum(1 for r in rows if r["is_peak_season"] == 1)
nonpeak_delayed = sum(1 for r in rows if r["is_peak_season"] == 0 and r["is_delayed"] == 1)
nonpeak_total = sum(1 for r in rows if r["is_peak_season"] == 0)

print(f"Generated {len(rows)} rows to {output_path}")
print(f"Overall delay rate: {delayed}/{len(rows)} = {delayed/len(rows)*100:.1f}%")
if peak_total > 0:
    print(f"Peak season delay rate: {peak_delayed}/{peak_total} = {peak_delayed/peak_total*100:.1f}%")
if nonpeak_total > 0:
    print(f"Non-peak delay rate: {nonpeak_delayed}/{nonpeak_total} = {nonpeak_delayed/nonpeak_total*100:.1f}%")
