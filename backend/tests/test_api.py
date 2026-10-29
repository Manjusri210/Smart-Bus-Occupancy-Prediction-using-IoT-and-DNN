import pytest


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database_connected" in data
    assert "timestamp" in data


def test_status_endpoint(client):
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.get_json()
    assert data["backend_health"] == "online"
    assert data["bus_capacity"] == 40
    assert data["polling_interval_seconds"] == 5
    assert "total_observations" in data
    assert "data_source_mode" in data


def test_csv_template_endpoint(client):
    response = client.get("/api/data/template")
    assert response.status_code == 200
    assert "text/csv" in response.headers["Content-Type"]
    content = response.data.decode("utf-8")
    assert "time_s,entries,exits,passengers,occupancy_pct" in content
