import pytest


def test_valid_ingest(client):
    payload = {
        "time_s": 15.0,
        "entries": 5,
        "exits": 1,
        "passengers": 4,
        "occupancy_pct": 10.0,
        "source": "wokwi"
    }
    response = client.post("/api/occupancy/ingest", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data["data"]["passengers"] == 4
    assert data["data"]["occupancy_pct"] == 10.0
    assert data["data"]["source"] == "wokwi"


def test_reject_exceeding_capacity(client):
    payload = {
        "time_s": 20.0,
        "entries": 45,
        "exits": 0,
        "passengers": 45,  # Exceeds 40
        "occupancy_pct": 112.5,
        "source": "wokwi"
    }
    response = client.post("/api/occupancy/ingest", json=payload)
    assert response.status_code == 422
    data = response.get_json()
    assert "exceeds bus capacity" in data["error"].lower()


def test_reject_negative_passengers(client):
    payload = {
        "time_s": 25.0,
        "entries": 2,
        "exits": 5,
        "passengers": -3,
        "occupancy_pct": -7.5,
        "source": "wokwi"
    }
    response = client.post("/api/occupancy/ingest", json=payload)
    assert response.status_code == 422
    data = response.get_json()
    assert "cannot be negative" in data["error"].lower()


def test_simulation_entry_and_exit(client):
    # Initial state should be 0
    resp_init = client.get("/api/occupancy/current")
    assert resp_init.status_code == 200

    # Simulate 1 entry
    resp_entry = client.post("/api/occupancy/simulate", json={"action": "entry"})
    assert resp_entry.status_code == 200
    assert resp_entry.get_json()["data"]["passengers"] == 1

    # Simulate 2nd entry
    resp_entry2 = client.post("/api/occupancy/simulate", json={"action": "entry"})
    assert resp_entry2.status_code == 200
    assert resp_entry2.get_json()["data"]["passengers"] == 2

    # Simulate exit
    resp_exit = client.post("/api/occupancy/simulate", json={"action": "exit"})
    assert resp_exit.status_code == 200
    assert resp_exit.get_json()["data"]["passengers"] == 1


def test_simulation_cannot_exit_below_zero(client):
    # Exits until 0
    resp_exit1 = client.post("/api/occupancy/simulate", json={"action": "exit"})
    # It might be 0 already, so exit should fail
    if resp_exit1.status_code == 200 and resp_exit1.get_json()["data"]["passengers"] > 0:
        # Alight once more
        client.post("/api/occupancy/simulate", json={"action": "exit"})

    resp_fail = client.post("/api/occupancy/simulate", json={"action": "exit"})
    assert resp_fail.status_code == 400
    assert "already 0" in resp_fail.get_json()["error"].lower()
