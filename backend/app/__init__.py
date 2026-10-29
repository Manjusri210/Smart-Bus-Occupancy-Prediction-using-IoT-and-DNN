import logging
from flask import Flask
from flask_cors import CORS
from backend.app.config import Config
from backend.app.database import init_db
from backend.app.routes import api_bp

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}})

    # Initialize Database tables
    init_db()

    # Register blueprints
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return {
            "name": "SmartBus AI Backend API",
            "status": "online",
            "docs": "/api/status",
            "health": "/api/health"
        }

    return app
