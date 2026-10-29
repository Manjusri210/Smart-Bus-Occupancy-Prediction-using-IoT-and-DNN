# SmartBus AI — REST API Documentation

All API endpoints return JSON payloads and standard HTTP status codes. Timestamps are formatted according to ISO 8601 UTC.

Base URL: `http://127.0.0.1:5000/api`

---

## 1. System & Health

### `GET /api/health`
Checks backend and database operational readiness.
- **Response (200 OK):**
```json
{
  "database_connected": true,
  "model_ready": true,
  "status": "healthy",
  "timestamp": "2026-10-28T16:22:21.000Z",
  "version": "1.0.0"
}
```

### `GET /api/status`
Returns high-level system metrics and active operating mode.
- **Response (200 OK):**
```json
{
  "active_alerts_count": 0,
  "backend_health": "online",
  "bus_capacity": 40,
  "data_source_mode": "DEMO",
  "database_available": true,
  "latest_update": "2026-10-28T16:20:00.000Z",
  "model_status": {
    "horizon_minutes": 5,
    "message": "DNN model loaded and ready for inference.",
    "model_name": "SmartBus-DNN-v1",
    "ready": true,
    "status": "ready"
  },
  "polling_interval_seconds": 5,
  "total_observations": 2692
}
```

---

## 2. Occupancy Telemetry

### `GET /api/occupancy/current`
Returns the latest recorded observation and calculated occupancy status.
- **Response (200 OK):**
```json
{
  "capacity": 40,
  "entries": 34,
  "exits": 12,
  "is_empty": false,
  "occupancy_pct": 55.0,
  "passengers": 22,
  "source": "synthetic",
  "status": "MODERATE",
  "time_s": 1420.0,
  "timestamp": "2026-10-28T16:20:00.000Z"
}
```

### `GET /api/occupancy/history`
Query parameters:
- `limit` (int, default 100, max 1000)
- `offset` (int, default 0)
- `source` (string, optional: `wokwi`, `csv`, `synthetic`, `live_device`)

- **Response (200 OK):**
```json
{
  "count": 100,
  "data": [...],
  "limit": 100,
  "offset": 0,
  "total": 2692
}
```

### `POST /api/occupancy/ingest`
Ingests an observation from ESP32 serial bridge or telemetry source.
- **Request Body:**
```json
{
  "time_s": 125.0,
  "entries": 15,
  "exits": 5,
  "passengers": 10,
  "occupancy_pct": 25.0,
  "source": "wokwi"
}
```
- **Response (201 Created):**
```json
{
  "data": {
    "entries": 15,
    "exits": 5,
    "id": 1,
    "occupancy_pct": 25.0,
    "passengers": 10,
    "source": "wokwi",
    "time_s": 125.0,
    "timestamp": "2026-10-28T16:21:00.000Z"
  },
  "message": "Observation ingested successfully"
}
```
- **Error Codes:**
  - `400 Bad Request`: Malformed JSON or negative time/entry/exit counts.
  - `422 Unprocessable Entity`: Passenger count out of bounds (`< 0` or `> 40`).

### `POST /api/occupancy/simulate`
Simulates manual passenger movement for interactive testing.
- **Request Body:**
```json
{ "action": "entry" }
```
*(Or `"action": "exit"`)*
- **Response (200 OK):** Observation incremented/decremented and saved to database.

---

## 3. AI Predictive Forecasting

### `POST /api/predict`
Executes inference through the Deep Neural Network.
- **Request Body:**
```json
{
  "horizon_minutes": 5,
  "passengers": 25
}
```
*(If `passengers` is omitted, the latest database observation is automatically used)*
- **Response (200 OK):**
```json
{
  "clamped": false,
  "disclaimer": "Predictions are clamped to [0, 40] physical capacity. Clipping does not guarantee statistical accuracy.",
  "horizon_minutes": 5,
  "mae_estimate": 1.93,
  "model_name": "SmartBus-DNN-v1",
  "predicted_occupancy_pct": 52.5,
  "predicted_passengers": 21.0,
  "raw_predicted_passengers": 21.04,
  "timestamp": "2026-10-28T16:22:00.000Z"
}
```
- **Error (503 Service Unavailable):**
```json
{
  "error": "Model is not ready: please train the model or ensure model weights exist.",
  "ready": false,
  "status": "model_not_ready"
}
```

### `GET /api/predictions/history`
Returns past prediction inferences.
- **Response (200 OK):** List of past prediction records.

---

## 4. Alerts & Threshold Violations

### `GET /api/alerts`
Query parameters:
- `acknowledged`: `all`, `true`, `false` (default: `all`)
- `limit`: int (default: 50)

### `POST /api/alerts/{id}/acknowledge`
Marks an alert event as acknowledged with a timestamp.

---

## 5. Data Import & Export

### `POST /api/data/import`
Accepts `multipart/form-data` with a `file` field or JSON with `csv_content`.
Validates columns: `time_s,entries,exits,passengers,occupancy_pct`.

### `GET /api/data/export`
Downloads stored telemetry observations as a CSV file (`Content-Type: text/csv`).

### `GET /api/data/template`
Downloads a sample CSV template.
