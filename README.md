# SmartBus AI — Intelligent Bus Occupancy Prediction and Monitoring System

**SmartBus AI** is a production-grade, full-stack intelligent transportation monitoring and predictive ridership platform. It unifies **ESP32 IoT simulation telemetry**, **Deep Neural Network (DNN) predictive regression**, **real-time passenger occupancy monitoring**, **capacity alert management**, and an **interactive, modern web dashboard**.

---

## 1. System Overview & Architecture

SmartBus AI addresses the critical transit challenge of overcrowding and unpredictable ridership surges.

- **IoT Sensing Layer:** ESP32 DevKit V1 simulation in Wokwi with a Green Button (GPIO 18, Passenger Entry), Red Button (GPIO 19, Passenger Exit), and I2C 16×2 LCD Display (GPIO 21/22).
- **Backend & REST API:** Python 3.11 with Flask, SQLAlchemy, Pydantic validation, CORS, and transactional SQLite persistence.
- **Machine Learning Pipeline:** Feed-forward Deep Neural Network (TensorFlow/Keras 4-layer architecture with scikit-learn MLP fallback) trained with a strictly chronological split (70% train, 15% validation, 15% test) without future data leakage, benchmarked against a persistence baseline.
- **Dashboard UI:** React 18, TypeScript, Tailwind CSS, Lucide icons, and Recharts with modern dark navy aesthetics (`#070d1e`), accessible controls, and responsive layout.

---

## 2. Project Structure

```
SmartBusPrediction/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory, CORS, and blueprint registration
│   │   ├── config.py             # Environment configuration (capacity 40, 5s poll)
│   │   ├── database.py           # SQLAlchemy session and engine management
│   │   ├── models.py             # Database schemas: observations, predictions, alerts, imports
│   │   ├── routes.py             # REST API endpoints (/api/*)
│   │   ├── services.py           # Ingestion, validation, alert engine, analytics
│   │   └── ml_service.py         # In-memory ML loader, feature scaler, and inference
│   ├── tests/                    # Automated pytest suite (14 passing unit tests)
│   ├── run.py                    # Flask development server entrypoint
│   └── requirements.txt          # Python dependencies
├── ml/
│   ├── generate_demo_data.py     # Multi-trip synthetic dataset generator
│   ├── train_model.py            # Chronological split, persistence baseline, DNN trainer
│   ├── evaluate_model.py         # Held-out test set evaluation reporter
│   └── models/
│       ├── dnn_model.keras       # Trained Keras Deep Neural Network weights
│       ├── dnn_model.joblib      # Trained MLPRegressor fallback weights
│       ├── scaler.joblib         # StandardScaler fitted solely on training split
│       └── model_card.json       # Structured metadata and evaluation metrics
├── data/
│   ├── bus_occupancy.csv         # Small sample observation trace from Wokwi
│   ├── bus_occupancy_template.csv# CSV template for imports
│   └── synthetic_bus_trips.csv   # Rich multi-trip dataset (2692 records, 16 trips)
├── esp32/
│   ├── sketch.ino                # ESP32 C++ firmware for Wokwi simulation
│   ├── diagram.json              # Wokwi wiring and component schematic
│   ├── serial_bridge.py          # UART serial listener & playback forwarder
│   └── README.md                 # Hardware pinout and connection guide
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, StatCard, OccupancyGauge, StatusBadge
│   │   ├── pages/                # Overview, Live, Prediction, Analytics, Alerts, Data, System
│   │   ├── services/api.ts       # Typed REST API client
│   │   ├── types/index.ts        # TypeScript data contracts
│   │   ├── App.tsx               # State orchestration & polling loop
│   │   └── main.tsx              # Application entrypoint
│   ├── package.json
│   ├── vite.config.ts            # Vite proxy & Tailwind CSS configuration
│   └── tsconfig.app.json
├── docs/
│   ├── architecture.md           # End-to-end architectural blueprints
│   ├── api.md                    # REST API documentation & endpoint schemas
│   ├── model_card.md             # Comprehensive ML model card
│   └── wokwi_setup.md            # Step-by-step Wokwi simulation setup
├── .env.example                  # Documented environment variables
├── .gitignore
├── start.bat                     # 1-click Windows launcher
└── README.md
```

---

## 3. Quickstart Installation (Windows)

### Prerequisites
- **Python 3.11** installed on your system.
- **Node.js** (v18+) and **npm** installed.

### Step 1: Clone / Navigate to Directory
```powershell
cd "c:\Users\MANJU SRI\OneDrive\Desktop\BUS"
```

### Step 2: Set up Python Virtual Environment
```powershell
# Create virtual environment using Python 3.11
py -3.11 -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install backend & ML dependencies
pip install -r backend/requirements.txt
```

### Step 3: Install Frontend Dependencies
```powershell
cd frontend
npm.cmd install
cd ..
```

---

## 4. Running the Application

### Option A: Automatic 1-Click Launch (Windows)
Double-click `start.bat` or run:
```powershell
.\start.bat
```

### Option B: Manual Multi-Terminal Launch

**Terminal 1 — Python Flask Backend:**
```powershell
.\venv\Scripts\python.exe backend/run.py
```
*Backend runs on: `http://127.0.0.1:5000`*

**Terminal 2 — React Vite Dashboard:**
```powershell
cd frontend
npm.cmd run dev
```
*Dashboard opens on: `http://localhost:5173`*

---

## 5. Machine Learning Pipeline Commands

### 1. Generate Synthetic Demonstration Trips
Generates realistic morning peak, midday off-peak, evening rush hour, and night trips adhering to physical capacity laws:
```powershell
.\venv\Scripts\python.exe ml/generate_demo_data.py --output data/synthetic_bus_trips.csv --trips 16
```

### 2. Validate Data and Train Deep Neural Network
Fits `StandardScaler` only on the training split, benchmarks the persistence baseline, trains the Keras DNN, and exports the model card:
```powershell
# Using the rich synthetic dataset:
.\venv\Scripts\python.exe ml/train_model.py --use-synthetic

# Testing on small/insufficient dataset:
.\venv\Scripts\python.exe ml/train_model.py
```

### 3. Evaluate Model on Held-Out Test Set
Prints evaluation tables comparing MAE, RMSE, and $R^2$ scores side-by-side:
```powershell
.\venv\Scripts\python.exe ml/evaluate_model.py
```

---

## 6. Running Automated Tests

Run the backend test suite covering endpoints, capacity bounds, alert suppression, simulation actions, and CSV imports:
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

Test Frontend Production Build:
```powershell
cd frontend
npm.cmd run build
```

---

## 7. Connecting the Wokwi ESP32 Simulation

1. Open [Wokwi ESP32](https://wokwi.com/projects/new/esp32).
2. Paste `esp32/sketch.ino` into the code editor and `esp32/diagram.json` into the diagram tab.
3. Add the `LiquidCrystal I2C` library in the Wokwi Library Manager.
4. Click **Start Simulation**.
5. Press the **Green Button** (GPIO 18) to board riders and the **Red Button** (GPIO 19) to alight.
6. To stream live data into SmartBus AI:
   - **Simulated stream:** Run `.\venv\Scripts\python.exe esp32/serial_bridge.py --simulate-file data/bus_occupancy.csv --interval 2.0`
   - **CSV Upload:** Save the Wokwi Serial Monitor output to a `.csv` file and upload it through the **Data Management** page in the web UI.

---

## 8. Dashboard Features

| Page | Features |
| :--- | :--- |
| **Overview Dashboard** | Real-time passenger count, occupancy gauge, AI 5m prediction, area trend chart, recent observation logs, active alerts. |
| **Live Telemetry** | Polling rate control (2s, 5s, 10s, 30s), stale telemetry warning, interactive test controls (+1 board / -1 alight with 0–40 bounds). |
| **AI Forecast** | Future horizon selector (5, 10, 15, 30 min), DNN vs Persistence Baseline evaluation scorecard, physical clamping disclaimers. |
| **Analytics** | Window filters (1h, 6h, 24h, All Time), occupancy status distribution (LOW, MODERATE, HIGH), boarding vs alighting flow. |
| **Alerts & Incidents** | Threshold transitions (&ge;75% occupancy / 30 riders), duplicate alert flood prevention, one-click incident acknowledgement. |
| **Data Management** | CSV drag-and-drop file upload, schema validation preview table, sample template download, full telemetry export. |
| **System Diagnostics** | Component health status (API, SQLite, DNN, Polling), transit parameter configuration, one-click retraining triggers. |

---

## 9. Limitations & Disclaimer

This system is an **engineering demonstration prototype** for educational and research purposes. Predictions are clamped to $[0, 40]$ seating bounds. Clamping to valid physical boundaries does not turn an uncertain statistical regression into a certified safety measurement. This software is not certified for passenger safety or automated transit dispatch operations.
