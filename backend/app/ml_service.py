import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import joblib

logger = logging.getLogger("SmartBusML")

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "models"
MODEL_CARD_FILE = MODEL_DIR / "model_card.json"
SCALER_FILE = MODEL_DIR / "scaler.joblib"
KERAS_MODEL_FILE = MODEL_DIR / "dnn_model.keras"
MLP_MODEL_FILE = MODEL_DIR / "dnn_model.joblib"


class MLService:
    _instance = None

    def __init__(self):
        self.model = None
        self.model_type = None  # 'keras' or 'mlp'
        self.scaler = None
        self.model_card: Optional[Dict[str, Any]] = None
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload(self):
        self.model = None
        self.model_type = None
        self.scaler = None
        self.model_card = None
        self.load_model()

    def load_model(self):
        if not MODEL_DIR.exists():
            MODEL_DIR.mkdir(parents=True, exist_ok=True)

        if MODEL_CARD_FILE.exists():
            try:
                with open(MODEL_CARD_FILE, "r", encoding="utf-8") as f:
                    self.model_card = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load model card: {e}")
                self.model_card = None

        if SCALER_FILE.exists():
            try:
                self.scaler = joblib.load(SCALER_FILE)
            except Exception as e:
                logger.warning(f"Could not load scaler: {e}")
                self.scaler = None

        # Check for Keras model
        if KERAS_MODEL_FILE.exists():
            try:
                # Lazy import tensorflow/keras
                from tensorflow import keras
                self.model = keras.models.load_model(KERAS_MODEL_FILE)
                self.model_type = "keras"
                logger.info("Loaded Keras DNN model successfully.")
                return
            except Exception as e:
                logger.warning(f"Failed to load Keras model, checking fallback: {e}")

        # Check for fallback scikit-learn MLPRegressor
        if MLP_MODEL_FILE.exists():
            try:
                self.model = joblib.load(MLP_MODEL_FILE)
                self.model_type = "mlp"
                logger.info("Loaded MLPRegressor DNN model successfully.")
                return
            except Exception as e:
                logger.warning(f"Failed to load MLP model: {e}")

        logger.info("No trained model currently available.")

    def is_ready(self) -> bool:
        return self.model is not None and self.scaler is not None

    def get_status(self) -> Dict[str, Any]:
        if not self.is_ready():
            return {
                "ready": False,
                "status": "not_trained",
                "message": "AI prediction model is not trained or insufficient training data was collected.",
                "model_name": None,
                "metrics": None,
                "model_card": self.model_card
            }

        return {
            "ready": True,
            "status": "ready",
            "message": "DNN model loaded and ready for inference.",
            "model_name": self.model_card.get("model_name", "SmartBus-DNN-v1") if self.model_card else "SmartBus-DNN-v1",
            "model_type": self.model_type,
            "horizon_minutes": self.model_card.get("horizon_minutes", 5) if self.model_card else 5,
            "metrics": self.model_card.get("metrics") if self.model_card else None,
            "trained_at": self.model_card.get("trained_at") if self.model_card else None,
            "model_card": self.model_card
        }

    def predict(
        self,
        passengers: int,
        occupancy_pct: float,
        entries: int,
        exits: int,
        time_s: float,
        horizon_minutes: int = 5,
        recent_history: Optional[list] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Runs inference through the trained DNN.
        Features: [time_s, entries, exits, passengers, occupancy_pct, rolling_mean, net_rate]
        """
        if not self.is_ready():
            return False, "Model is not ready: please train the model or ensure model weights exist.", {}

        # Build feature vector
        # Approximate rolling features from recent history if provided
        if recent_history and len(recent_history) >= 2:
            p_hist = [h.get("passengers", passengers) for h in recent_history[-5:]]
            rolling_mean = float(np.mean(p_hist))
            net_rate = float(p_hist[-1] - p_hist[0])
        else:
            rolling_mean = float(passengers)
            net_rate = 0.0

        features = np.array([[
            float(time_s),
            float(entries),
            float(exits),
            float(passengers),
            float(occupancy_pct),
            rolling_mean,
            net_rate
        ]], dtype=np.float32)

        try:
            # Scale features
            scaled_features = self.scaler.transform(features)

            # Predict
            if self.model_type == "keras":
                pred_raw = float(self.model.predict(scaled_features, verbose=0)[0][0])
            else:
                pred_raw = float(self.model.predict(scaled_features)[0])

            # Clamp predicted passengers to valid bus range [0, 40]
            clamped_passengers = max(0.0, min(40.0, pred_raw))
            clamped_pct = (clamped_passengers / 40.0) * 100.0

            mae_estimate = None
            if self.model_card and "metrics" in self.model_card:
                mae_estimate = self.model_card["metrics"].get("dnn_mae")

            return True, "", {
                "predicted_passengers": round(clamped_passengers, 1),
                "raw_predicted_passengers": round(pred_raw, 2),
                "predicted_occupancy_pct": round(clamped_pct, 1),
                "horizon_minutes": horizon_minutes,
                "model_name": self.model_card.get("model_name", "SmartBus-DNN") if self.model_card else "SmartBus-DNN",
                "model_type": self.model_type,
                "mae_estimate": mae_estimate,
                "clamped": pred_raw < 0.0 or pred_raw > 40.0,
                "disclaimer": "Predictions are clamped to [0, 40] physical capacity. Clipping does not guarantee statistical accuracy."
            }
        except Exception as e:
            logger.error(f"Prediction inference error: {e}")
            return False, f"Inference execution failed: {str(e)}", {}
