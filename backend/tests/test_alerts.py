import pytest


def test_alert_generation_on_high_occupancy(client):
    # Ingest 29 passengers (72.5% - MODERATE, no alert)
    client.post("/api/occupancy/ingest", json={
        "time_s": 50.0,
        "entries": 29,
        "exits": 0,
        "passengers": 29,
        "occupancy_pct": 72.5,
        "source": "simulation"
    })
    resp_alerts1 = client.get("/api/alerts")
    assert resp_alerts1.status_code == 200
    assert resp_alerts1.get_json()["count"] == 0

    # Ingest 30 passengers (75% - HIGH threshold crossed!)
    client.post("/api/occupancy/ingest", json={
        "time_s": 55.0,
        "entries": 30,
        "exits": 0,
        "passengers": 30,
        "occupancy_pct": 75.0,
        "source": "simulation"
    })
    resp_alerts2 = client.get("/api/alerts")
    assert resp_alerts2.status_code == 200
    data2 = resp_alerts2.get_json()
    assert data2["count"] == 1
    alert = data2["data"][0]
    assert alert["severity"] == "HIGH"
    assert alert["passenger_count"] == 30
    assert alert["acknowledged"] is False

    # Ingest 31 passengers immediately after (should NOT duplicate alert within 5 mins)
    client.post("/api/occupancy/ingest", json={
        "time_s": 60.0,
        "entries": 31,
        "exits": 0,
        "passengers": 31,
        "occupancy_pct": 77.5,
        "source": "simulation"
    })
    resp_alerts3 = client.get("/api/alerts")
    assert resp_alerts3.get_json()["count"] == 1  # No duplicate alert!

    # Test acknowledgement
    alert_id = alert["id"]
    resp_ack = client.post(f"/api/alerts/{alert_id}/acknowledge")
    assert resp_ack.status_code == 200
    ack_data = resp_ack.get_json()["data"]
    assert ack_data["acknowledged"] is True
    assert ack_data["acknowledged_at"] is not None
