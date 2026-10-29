# ESP32 IoT Simulation & Ingestion Bridge

This directory contains the firmware, wiring diagram, and bridge script for the ESP32 passenger occupancy telemetry subsystem.

## 1. Hardware Specification & Wiring

The hardware simulation is designed for an **ESP32 DevKit V1** inside [Wokwi](https://wokwi.com).

| Component | ESP32 Pin | Logic Level | Description |
| :--- | :--- | :--- | :--- |
| **Green Push Button** | GPIO 18 | Active LOW (Pull-up) | Passenger Entry (+1) |
| **Red Push Button** | GPIO 19 | Active LOW (Pull-up) | Passenger Exit (-1) |
| **I2C 16×2 LCD SDA** | GPIO 21 | 3.3V / 5V | I2C Data Line (0x27) |
| **I2C 16×2 LCD SCL** | GPIO 22 | 3.3V / 5V | I2C Clock Line (0x27) |
| **VCC & GND** | 5V & GND | 5V DC | Common power rails |

### Operating Parameters
- **Bus Seating Capacity:** 40 passengers.
- **Debounce Delay:** 200 ms per physical button press.
- **Periodic Telemetry Frequency:** Every 5 seconds (or immediately upon state transition).
- **Serial Baud Rate:** 115200 baud.

## 2. Firmware Files
- `sketch.ino`: Complete Arduino ESP32 firmware with debounced inputs, LCD status reporting, capacity boundary clamping [0, 40], and comma-separated serial streaming.
- `diagram.json`: Complete Wokwi diagram definition containing board, pushbuttons, LCD, and color-coded wires. You can paste this directly into Wokwi or launch it using the Wokwi VS Code / browser extension.

## 3. Serial Monitor Output Format
Every record emitted to the Serial Monitor adheres to this CSV format:
```csv
time_s,entries,exits,passengers,occupancy_pct
0,0,0,0,0.0
5,1,0,1,2.5
10,2,0,2,5.0
```
- `time_s`: Elapsed seconds since microcontroller boot.
- `entries`: Cumulative boardings.
- `exits`: Cumulative alightings.
- `passengers`: Current passenger count (clamped to 0–40).
- `occupancy_pct`: Calculated occupancy percentage `(passengers / 40.0) * 100.0`.

## 4. Ingestion Bridge (`serial_bridge.py`)
Because web browsers cannot directly open raw USB/UART serial COM ports without specialized native bridges, `serial_bridge.py` acts as the intermediary.

### Running with a Physical ESP32 or Virtual COM Port
```powershell
# From project root
.\venv\Scripts\python.exe esp32/serial_bridge.py --port COM3 --baud 115200 --url http://127.0.0.1:5000/api/occupancy/ingest
```

### Running in Simulated Serial Playback Mode
If running Wokwi in a standalone browser tab where COM port redirect is unavailable, use simulated playback to stream observations into the backend:
```powershell
.\venv\Scripts\python.exe esp32/serial_bridge.py --simulate-file data/bus_occupancy.csv --interval 3.0
```
Or use the web dashboard's **Data Management** page to directly upload CSV files or the **Live Monitor** to click simulated Board/Alight buttons.
