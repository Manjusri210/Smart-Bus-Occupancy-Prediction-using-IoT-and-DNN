import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env if present
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "smartbus-ai-insecure-dev-key")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"

    # Bus Configuration
    BUS_CAPACITY = int(os.getenv("BUS_CAPACITY", "40"))
    POLLING_INTERVAL_SECONDS = int(os.getenv("POLLING_INTERVAL_SECONDS", "5"))

    # Database
    DB_PATH = BASE_DIR / "backend" / "smartbus.db"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Machine Learning
    MODEL_DIR = BASE_DIR / os.getenv("MODEL_DIR", "ml/models")
    ENABLE_MODEL_TRAINING_ENDPOINT = os.getenv("ENABLE_MODEL_TRAINING_ENDPOINT", "true").lower() == "true"

    # CORS
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    ]

    # Data Limits
    MAX_CSV_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
