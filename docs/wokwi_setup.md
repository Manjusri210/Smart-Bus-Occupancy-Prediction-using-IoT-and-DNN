# Wokwi ESP32 Simulation Setup Guide

This guide describes how to run the SmartBus ESP32 IoT simulation in [Wokwi](https://wokwi.com) and connect it to the SmartBus AI system.

## 1. Quick Wokwi Web Setup

1. Open [Wokwi ESP32 Simulator](https://wokwi.com/projects/new/esp32).
2. Replace the contents of the `sketch.ino` tab with the code in `esp32/sketch.ino`.
3. In the `diagram.json` tab, replace the contents with `esp32/diagram.json`.
4. Add the **LiquidCrystal_I2C** library:
   - Click the **Library Manager** tab (book icon).
   - Click **+ Add a library** and type `LiquidCrystal I2C`. Select the standard library.
5. Click **Play / Start Simulation**.

## 2. Interactive Testing in Wokwi
- **Green Button (GPIO 18):** Simulates a passenger boarding the bus.
  - Passenger count increments by 1.
  - LCD displays: `Pass: X/40 (Y%)`.
  - Serial monitor prints: `time_s,entries,exits,passengers,occupancy_pct`.
- **Red Button (GPIO 19):** Simulates a passenger alighting the bus.
  - Passenger count decrements by 1 (cannot drop below 0).
- **LCD Line 2:** Shows `Status: LOW`, `Status: MODERATE`, or `Status: HIGH!` based on the 40% and 75% thresholds.

## 3. Streaming Data to SmartBus AI

### Method A: Direct CSV Import (Recommended Fallback)
1. In Wokwi, let the simulation run and press the buttons several times.
2. Select all text from the Wokwi **Serial Monitor** output.
3. Save it to a file (e.g. `data/bus_occupancy.csv`).
4. In the SmartBus AI Web Dashboard, navigate to **Data Management** and upload your CSV.

### Method B: Live Serial Bridge
If you run Wokwi through the VS Code Wokwi extension or use a virtual COM port bridge (`com0com` on Windows or `socat` on Linux/macOS):
```powershell
.\venv\Scripts\python.exe esp32/serial_bridge.py --port COM3 --baud 115200 --url http://127.0.0.1:5000/api/occupancy/ingest
```

### Method C: Automated Simulation Playback
To stream a pre-recorded simulation trace into the live dashboard without manual copy-pasting:
```powershell
.\venv\Scripts\python.exe esp32/serial_bridge.py --simulate-file data/bus_occupancy.csv --interval 2.0
```
