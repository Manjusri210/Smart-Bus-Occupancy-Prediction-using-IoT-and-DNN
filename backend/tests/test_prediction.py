import pytest
from backend.app.ml_service import MLService


def test_prediction_when_model_not_ready(client, monkeypatch):
    # Ensure MLService is not ready
    ml = MLService.get_instance()
    monkeypatch.setattr(ml, "is_ready", lambda: False)

    response = client.post("/api/predict", json={"horizon_minutes": 5})
    assert response.status_code == 503
    data = response.get_json()
    assert "error" in data
    assert data["status"] == "model_not_ready"


def test_prediction_clamps_to_bus_bounds(client, monkeypatch):
    ml = MLService.get_instance()
    monkeypatch.setattr(ml, "is_ready", lambda: True)

    # Mock predict returning an out-of-bounds raw value (e.g. 52.4 passengers)
    def mock_predict(*args, **kwargs):
        return True, "", {
            "predicted_passengers": 40.0,
            "raw_predicted_passengers": 52.4,
            "predicted_occupancy_pct": 100.0,
            "horizon_minutes": 5,
            "model_name": "SmartBus-DNN-v1",
            "model_type": "keras",
            "mae_estimate": 1.25,
            "clamped": True,
            "disclaimer": "Predictions are clamped to [0, 40] physical capacity."
        }

    monkeypatch.setattr(ml, "predict", mock_predict)

    response = client.post("/api/predict", json={"horizon_minutes": 5, "passengers": 35})
    assert response.status_code == 200
    data = response.get_json()
    assert data["predicted_passengers"] == 40.0
    assert data["predicted_occupancy_pct"] == 100.0
    assert data["clamped"] is True
    assert "disclaimer" in data
