"""
Utility helper functions for the Supply Chain Risk Prediction Engine.
"""

import math
import random
import string
from datetime import datetime
from typing import List, Optional


def generate_id(prefix: str = "SHP") -> str:
    """Generate a unique shipment ID in the format SHP-XXXXXX.

    Args:
        prefix: The prefix for the ID. Defaults to 'SHP'.

    Returns:
        A string ID like 'SHP-A3F9K2'.
    """
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"{prefix}-{suffix}"


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points using the Haversine formula.

    Args:
        lat1: Latitude of point 1 in decimal degrees.
        lon1: Longitude of point 1 in decimal degrees.
        lat2: Latitude of point 2 in decimal degrees.
        lon2: Longitude of point 2 in decimal degrees.

    Returns:
        Distance in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


def risk_level_from_score(score: int) -> str:
    """Convert a numeric risk score (0-100) to a categorical risk level.

    Args:
        score: Risk score between 0 and 100.

    Returns:
        One of 'Low', 'Medium', 'High', or 'Critical'.

    Raises:
        ValueError: If score is outside the 0-100 range.
    """
    if not 0 <= score <= 100:
        raise ValueError(f"Score must be between 0 and 100, got {score}")

    if score <= 25:
        return "Low"
    elif score <= 50:
        return "Medium"
    elif score <= 75:
        return "High"
    else:
        return "Critical"


def format_datetime(dt: Optional[datetime] = None) -> str:
    """Format a datetime object as an ISO 8601 string.

    Args:
        dt: The datetime to format. Defaults to current UTC time.

    Returns:
        ISO 8601 formatted datetime string.
    """
    if dt is None:
        dt = datetime.utcnow()
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp a numeric value to a specified range.

    Args:
        value: The value to clamp.
        min_val: Minimum allowed value.
        max_val: Maximum allowed value.

    Returns:
        The clamped value.

    Raises:
        ValueError: If min_val > max_val.
    """
    if min_val > max_val:
        raise ValueError(f"min_val ({min_val}) must be <= max_val ({max_val})")
    return max(min_val, min(value, max_val))


def weighted_average(values: List[float], weights: List[float]) -> float:
    """Calculate the weighted average of a list of values.

    Args:
        values: List of numeric values.
        weights: List of corresponding weights.

    Returns:
        The weighted average.

    Raises:
        ValueError: If lists are empty or have different lengths,
                    or if all weights are zero.
    """
    if not values or not weights:
        raise ValueError("Values and weights must be non-empty lists")
    if len(values) != len(weights):
        raise ValueError(
            f"Values ({len(values)}) and weights ({len(weights)}) must have the same length"
        )

    total_weight = sum(weights)
    if total_weight == 0:
        raise ValueError("Sum of weights must be non-zero")

    return sum(v * w for v, w in zip(values, weights)) / total_weight
