# SmartBus AI — System Architecture

SmartBus AI is an end-to-end intelligent transportation telemetry and occupancy forecasting system. It combines IoT edge sensing, backend validation and persistence, deep neural network regression, and an interactive modern web dashboard.

```
+--------------------------------------------------------------------------------+
|                             EDGE SENSING LAYER                                 |
|                                                                                |
|   +-----------------------+              +-----------------------+             |
|   |   Green Button (GPIO 18)   |              |    Red Button (GPIO 19)   |    |
|   |      Passenger Entry  |              |       Passenger Exit  |             |
|   +-----------+-----------+              +-----------+-----------+             |
|               |                                      |                         |
|               v                                      v                         |
|   +------------------------------------------------------------------------+   |
|   |                      ESP32 DevKit V1 Microcontroller                   |   |
|   |   - Hardware debounce logic (200ms)                                    |   |
|   |   - LCD 16x2 Display Driver (I2C 0x27, GPIO 21 SDA / GPIO 22 SCL)     |   |
|   |   - Capacity boundary enforcement [0, 40]                              |   |
|   |   - Serial CSV output: time_s,entries,exits,passengers,occupancy_pct   |   |
|   +------------------------------------+-----------------------------------+   |
+----------------------------------------|---------------------------------------+
                                         |
                                         | Serial Stream (115200 Baud) or CSV
                                         v
+--------------------------------------------------------------------------------+
|                             INGESTION & BACKEND LAYER                          |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                     ESP32 Serial Ingestion Bridge                      |   |
|   |   - pyserial client reading UART COM ports                             |   |
|   |   - Row parsing, type validation, and range sanity checking            |   |
|   |   - HTTP POST forwarder to /api/occupancy/ingest                       |   |
|   +------------------------------------+-----------------------------------+   |
|                                        |                                       |
|                                        v                                       |
|   +------------------------------------------------------------------------+   |
|   |                        Flask REST API (Python 3.11)                    |   |
|   |   - Endpoints: /api/occupancy/*, /api/predict, /api/alerts, etc.       |   |
|   |   - Range validation: passengers in [0, 40], non-negative flow counts  |   |
|   |   - Dynamic Alert Engine: Triggers on >=75% occupancy (30 riders)      |   |
|   |   - Duplicate Alert Flood Suppression: 5-minute sliding window         |   |
|   +-------------------+--------------------------------+-------------------+   |
|                       |                                |                       |
|                       v                                v                       |
|   +-----------------------+          +-------------------------------------+   |
|   |  SQLite Database      |          |    ML Inference Engine              |   |
|   |  - observations       |          |    - StandardScaler transform       |   |
|   |  - predictions        |          |    - TensorFlow / Keras 4-layer DNN |   |
|   |  - alerts             |          |    - Fallback MLPRegressor          |   |
|   |  - model_runs         |          |    - Persistence Baseline benchmark |   |
|   +-----------------------+          +-------------------------------------+   |
+--------------------------------------------------------------------------------+
                                         ^
                                         | REST / JSON (5s Polling)
                                         v
+--------------------------------------------------------------------------------+
|                             PRESENTATION LAYER (DASHBOARD)                     |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                     React 18 + Vite + TypeScript                       |   |
|   |   - Overview Dashboard: Real-time KPIs, Occupancy Gauge, Area Chart    |   |
|   |   - Live Telemetry: Streaming chart, manual +1/-1 testing controls     |   |
|   |   - AI Prediction: Horizon selector (5-30m), model metrics comparison  |   |
|   |   - Analytics: Windowed filters, occupancy distribution, net flux      |   |
|   |   - Alert Management: Incident feed with instant acknowledgement       |   |
|   |   - Data Management: Drag-and-drop CSV upload, preview table, export   |   |
|   |   - System Diagnostics: Component readiness, model card, retrain       |   |
|   +------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

## Key Architectural Decisions

1. **Decoupled Edge and Backend:** Microcontrollers communicate through standard serial format (`time_s,entries,exits,passengers,occupancy_pct`). The browser is not required to open raw serial ports directly; instead, a bridge script or file import is used.
2. **Double-Layered Validation:** Edge hardware clamps passenger counts to [0, 40]. The backend re-verifies these bounds and rejects invalid inputs with HTTP 422.
3. **No Temporal Data Leakage:** The ML training pipeline splits datasets strictly chronologically (70% train, 15% val, 15% test). The `StandardScaler` is fitted solely on the training split.
4. **Honest Baseline Comparison:** The Deep Neural Network is benchmarked against a persistence baseline ($y_{pred} = passengers_t$). The model card records both MAE and RMSE metrics side-by-side.
