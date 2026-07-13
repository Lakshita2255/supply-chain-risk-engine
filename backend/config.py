"""
Application configuration for the Supply Chain Risk Prediction Engine.
"""

from pathlib import Path
from typing import List


class Settings:
    """Central application configuration."""

    # Application metadata
    APP_NAME: str = "Supply Chain Risk Prediction Engine"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Directory paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    MODEL_DIR: Path = BASE_DIR / "models" / "trained"

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.MODEL_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
