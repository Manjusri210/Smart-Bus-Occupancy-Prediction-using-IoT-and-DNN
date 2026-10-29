import pytest


def test_analytics_calculation(client):
    # Empty case first
    resp_empty = client.get("/api/analytics/summary")
    assert resp_empty.status_code == 200
    assert resp_empty.get_json()["total_observations"] == 0

    # Ingest observations
    client.post("/api/occupancy/ingest", json={
        "time_s": 0.0, "entries": 10, "exits": 0, "passengers": 10, "occupancy_pct": 25.0, "source": "csv"
    })
    client.post("/api/occupancy/ingest", json={
        "time_s": 10.0, "entries": 25, "exits": 0, "passengers": 25, "occupancy_pct": 62.5, "source": "csv"
    })
    client.post("/api/occupancy/ingest", json={
        "time_s": 20.0, "entries": 35, "exits": 0, "passengers": 35, "occupancy_pct": 87.5, "source": "csv"
    })

    resp = client.get("/api/analytics/summary")
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["total_observations"] == 3
    assert data["peak_passengers"] == 35
    assert data["peak_occupancy_pct"] == 87.5
    assert data["avg_passengers"] == 23.3  # (10 + 25 + 35) / 3 = 23.33
    assert data["low_count"] == 1        # 25% is LOW (<40%)
    assert data["moderate_count"] == 1   # 62.5% is MODERATE (40-75%)
    assert data["high_count"] == 1       # 87.5% is HIGH (>=75%)
