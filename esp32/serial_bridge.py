#!/usr/bin/env python3
"""
SmartBus AI — ESP32 Serial Ingestion Bridge
============================================
Reads serial stream from an ESP32 (physical hardware or simulated serial RFC2217/com0com),
validates comma-separated occupancy records:
  time_s,entries,exits,passengers,occupancy_pct
and forward-posts validated observations to the SmartBus backend API.

Usage:
  python serial_bridge.py --port COM3 --baud 115200
  python serial_bridge.py --simulate-file ../data/bus_occupancy.csv --interval 3.0
"""

import os
import sys
import time
import argparse
import logging
import requests

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [SerialBridge] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("SerialBridge")

# Configuration defaults
DEFAULT_PORT = os.getenv("SERIAL_PORT", "COM3")
DEFAULT_BAUD = int(os.getenv("SERIAL_BAUD_RATE", "115200"))
DEFAULT_URL = os.getenv("BACKEND_INGEST_URL", "http://127.0.0.1:5000/api/occupancy/ingest")


def parse_and_validate_row(line: str) -> dict | None:
    """
    Parses a CSV row: time_s,entries,exits,passengers,occupancy_pct
    Validates range and integrity.
    """
    clean_line = line.strip()
    if not clean_line or clean_line.startswith("#"):
        return None
    
    # Check if header line
    if "time_s" in clean_line.lower() or "passengers" in clean_line.lower():
        logger.info(f"Detected header row: {clean_line}")
        return None

    parts = [p.strip() for p in clean_line.split(",")]
    if len(parts) < 5:
        logger.warning(f"Malformed row (expected 5 fields, got {len(parts)}): {clean_line}")
        return None

    try:
        time_s = float(parts[0])
        entries = int(parts[1])
        exits = int(parts[2])
        passengers = int(parts[3])
        occupancy_pct = float(parts[4])
    except ValueError as e:
        logger.warning(f"Type conversion failed for row '{clean_line}': {e}")
        return None

    # Sanity checks
    if passengers < 0 or passengers > 40:
        logger.error(f"Passenger count out of bounds [0, 40]: {passengers}")
        return None

    if entries < 0 or exits < 0 or time_s < 0:
        logger.error(f"Negative values detected in row: {clean_line}")
        return None

    expected_pct = round((passengers / 40.0) * 100.0, 1)
    if abs(occupancy_pct - expected_pct) > 2.0:
        logger.warning(f"Occupancy % mismatch: reported {occupancy_pct}%, calculated {expected_pct}%. Using calculated.")
        occupancy_pct = expected_pct

    return {
        "time_s": time_s,
        "entries": entries,
        "exits": exits,
        "passengers": passengers,
        "occupancy_pct": occupancy_pct,
        "source": "wokwi"
    }


def send_to_backend(payload: dict, url: str) -> bool:
    try:
        response = requests.post(url, json=payload, timeout=4.0)
        if response.status_code in (200, 201):
            logger.info(f"Ingested successfully: {payload['passengers']}/40 ({payload['occupancy_pct']}%) from time_s={payload['time_s']}")
            return True
        else:
            logger.warning(f"Backend returned HTTP {response.status_code}: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to communicate with backend ({url}): {e}")
        return False


def run_file_simulation(filepath: str, url: str, interval: float):
    """Fallback playback mode when physical or virtual serial port is not connected."""
    logger.info(f"Starting simulated serial playback from file: {filepath} (interval: {interval}s)")
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        payload = parse_and_validate_row(line)
        if payload:
            send_to_backend(payload, url)
            time.sleep(interval)

    logger.info("Simulation playback complete.")


def run_serial_listener(port: str, baud: int, url: str):
    """Connects to real or virtual serial port with auto-reconnection."""
    try:
        import serial
    except ImportError:
        logger.error("pyserial package not installed. Run 'pip install pyserial'")
        return

    logger.info(f"Connecting to ESP32 on port {port} at {baud} baud...")
    while True:
        try:
            with serial.Serial(port, baud, timeout=2.0) as ser:
                logger.info(f"Serial port {port} connected and streaming.")
                while True:
                    raw_line = ser.readline().decode("utf-8", errors="replace")
                    if raw_line:
                        payload = parse_and_validate_row(raw_line)
                        if payload:
                            send_to_backend(payload, url)
        except serial.SerialException as e:
            logger.warning(f"Serial connection error on {port}: {e}. Retrying in 5 seconds...")
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Serial bridge stopped by user.")
            break


def main():
    parser = argparse.ArgumentParser(description="SmartBus AI Serial Ingestion Bridge")
    parser.add_argument("--port", default=DEFAULT_PORT, help="Serial port (e.g., COM3, /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD, help="Baud rate (default: 115200)")
    parser.add_argument("--url", default=DEFAULT_URL, help="Backend ingestion endpoint")
    parser.add_argument("--simulate-file", default=None, help="Path to CSV file to simulate stream instead of serial port")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval between rows in simulated playback")

    args = parser.parse_args()

    if args.simulate_file:
        run_file_simulation(args.simulate_file, args.url, args.interval)
    else:
        run_serial_listener(args.port, args.baud, args.url)


if __name__ == "__main__":
    main()
