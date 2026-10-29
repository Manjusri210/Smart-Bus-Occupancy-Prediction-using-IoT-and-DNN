import pytest
import io


def test_valid_csv_import_and_export(client):
    csv_data = (
        "time_s,entries,exits,passengers,occupancy_pct\n"
        "0,0,0,0,0.0\n"
        "5,2,0,2,5.0\n"
        "10,5,1,4,10.0\n"
        "15,10,2,8,20.0\n"
    )
    data = {
        "file": (io.BytesIO(csv_data.encode("utf-8")), "test_bus.csv")
    }
    response = client.post("/api/data/import", data=data, content_type="multipart/form-data")
    assert response.status_code == 200
    res = response.get_json()
    assert res["success"] is True
    assert res["imported_rows"] == 4
    assert res["rejected_rows"] == 0

    # Test export
    exp_resp = client.get("/api/data/export")
    assert exp_resp.status_code == 200
    assert "text/csv" in exp_resp.headers["Content-Type"]
    content = exp_resp.data.decode("utf-8")
    assert "time_s,entries,exits,passengers,occupancy_pct" in content
    assert "10.0" in content


def test_reject_csv_missing_required_columns(client):
    bad_csv = (
        "time_s,entries,wrong_column\n"
        "0,0,0\n"
    )
    data = {
        "file": (io.BytesIO(bad_csv.encode("utf-8")), "invalid.csv")
    }
    response = client.post("/api/data/import", data=data, content_type="multipart/form-data")
    assert response.status_code == 400
    res = response.get_json()
    assert res["success"] is False
    assert "missing required columns" in res["error"].lower()
