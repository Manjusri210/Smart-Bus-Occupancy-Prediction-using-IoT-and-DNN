#!/usr/bin/env python3
"""
SmartBus AI — Machine Learning Pipeline: Model Evaluation Script
================================================================
Evaluates the trained Deep Neural Network against the Persistence Baseline on held-out test data.
Reports MAE, RMSE, and R2 side-by-side and prints actual vs predicted comparison table.

Usage:
  python evaluate_model.py
  python evaluate_model.py --csv ../data/synthetic_bus_trips.csv
"""

import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

MODEL_DIR = BASE_DIR / "ml" / "models"
MODEL_CARD_FILE = MODEL_DIR / "model_card.json"
SCALER_FILE = MODEL_DIR / "scaler.joblib"
KERAS_MODEL_FILE = MODEL_DIR / "dnn_model.keras"
MLP_MODEL_FILE = MODEL_DIR / "dnn_model.joblib"
BUS_CAPACITY = 40


def evaluate(csv_path: str = None):
    print("=" * 70)
    print(" SmartBus AI — Deep Neural Network Evaluation Report")
    print("=" * 70)

    if not SCALER_FILE.exists():
        print("[!] Scaler not found. Please train the model first with: python ml/train_model.py --use-synthetic")
        return

    scaler = joblib.load(SCALER_FILE)
    model = None
    model_type = None

    if KERAS_MODEL_FILE.exists():
        try:
            from tensorflow import keras
            model = keras.models.load_model(KERAS_MODEL_FILE)
            model_type = "keras"
        except Exception:
            model = None

    if model is None and MLP_MODEL_FILE.exists():
        model = joblib.load(MLP_MODEL_FILE)
        model_type = "mlp"

    if model is None:
        print("[!] No trained DNN model found.")
        return

    # Load dataset
    if csv_path:
        data_file = Path(csv_path)
    else:
        synth_file = BASE_DIR / "data" / "synthetic_bus_trips.csv"
        wokwi_file = BASE_DIR / "data" / "bus_occupancy.csv"
        data_file = synth_file if synth_file.exists() else wokwi_file

    if not data_file.exists():
        print(f"[!] Test data file not found: {data_file}")
        return

    df = pd.read_csv(data_file)
    from ml.train_model import prepare_features_and_targets
    X, y, clean_df = prepare_features_and_targets(df, horizon_steps=10)

    # Use the test split (final 15%)
    n_train = int(len(X) * 0.70)
    n_val = int(len(X) * 0.15)
    X_test = X[n_train + n_val:]
    y_test = y[n_train + n_val:]
    clean_test_df = clean_df.iloc[n_train + n_val:].copy()

    if len(X_test) == 0:
        print("[!] Test split is empty. Dataset may be too small.")
        return

    # Scale features
    X_test_scaled = scaler.transform(X_test)

    # 1. Baseline Predictions (Persistence)
    y_baseline = X_test[:, 3]
    b_mae = mean_absolute_error(y_test, y_baseline)
    b_rmse = np.sqrt(mean_squared_error(y_test, y_baseline))
    b_r2 = r2_score(y_test, y_baseline)

    # 2. DNN Predictions
    if model_type == "keras":
        y_dnn_raw = model.predict(X_test_scaled, verbose=0).flatten()
    else:
        y_dnn_raw = model.predict(X_test_scaled)

    y_dnn_clamped = np.clip(y_dnn_raw, 0, BUS_CAPACITY)
    d_mae = mean_absolute_error(y_test, y_dnn_clamped)
    d_rmse = np.sqrt(mean_squared_error(y_test, y_dnn_clamped))
    d_r2 = r2_score(y_test, y_dnn_clamped)

    print(f"\nEvaluation Dataset: {data_file.name} ({len(X_test)} held-out test observations)")
    print(f"Model Architecture: {model_type.upper()} Deep Neural Network")
    print("-" * 70)
    print(f"{'Metric':<20} | {'Persistence Baseline':<22} | {'SmartBus DNN':<20}")
    print("-" * 70)
    print(f"{'MAE (passengers)':<20} | {b_mae:<22.3f} | {d_mae:<20.3f}")
    print(f"{'RMSE (passengers)':<20} | {b_rmse:<22.3f} | {d_rmse:<20.3f}")
    print(f"{'R² Score':<20} | {b_r2:<22.3f} | {d_r2:<20.3f}")
    print("-" * 70)

    # Print sample comparison table
    print("\nSample Forecast Comparison (First 10 held-out observations):")
    print("-" * 75)
    print(f"{'Time (s)':<10} | {'Current Pass':<14} | {'Actual Future':<14} | {'Baseline Pred':<14} | {'DNN Pred':<12}")
    print("-" * 75)

    for i in range(min(10, len(y_test))):
        t_s = int(X_test[i, 0])
        curr = int(X_test[i, 3])
        act = int(y_test[i])
        base = int(y_baseline[i])
        dnn_p = round(float(y_dnn_clamped[i]), 1)
        print(f"{t_s:<10} | {curr:<14} | {act:<14} | {base:<14} | {dnn_p:<12}")
    print("-" * 75)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate SmartBus AI Prediction Model")
    parser.add_argument("--csv", default=None, help="Path to test CSV file")
    args = parser.parse_args()
    evaluate(csv_path=args.csv)
