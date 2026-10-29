#!/usr/bin/env python3
"""
SmartBus AI — Machine Learning Pipeline: DNN Training & Persistence Baseline
============================================================================
Trains a Deep Neural Network (DNN) to forecast future bus occupancy count.
Features:
  - time_s (elapsed seconds)
  - entries (cumulative entries)
  - exits (cumulative exits)
  - passengers (current passenger count)
  - occupancy_pct (current occupancy percentage)
  - rolling_mean_3 (recent window passenger mean)
  - net_rate (recent net passenger flux)

Target:
  - future_passengers (passenger count at horizon t + H)

Splitting:
  - Strictly chronological split (70% Train, 15% Val, 15% Test) to prevent data leakage.
  - StandardScaler fitted ONLY on training split.
  - Compared with a naive persistence baseline (y_pred = current passengers).
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

MODEL_DIR = BASE_DIR / "ml" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

BUS_CAPACITY = 40
MIN_OBSERVATIONS_FOR_TRAINING = 50


def validate_dataset(df: pd.DataFrame) -> Tuple[bool, str, dict]:
    """
    Validates data integrity, bounds, and sufficiency.
    """
    stats = {
        "total_rows": len(df),
        "columns": list(df.columns),
        "passengers_min": None,
        "passengers_max": None,
        "variance": None,
        "is_sufficient": False
    }

    req_cols = ["time_s", "entries", "exits", "passengers", "occupancy_pct"]
    missing = [c for c in req_cols if c not in df.columns]
    if missing:
        return False, f"Missing required columns: {', '.join(missing)}", stats

    if len(df) < MIN_OBSERVATIONS_FOR_TRAINING:
        return False, f"Insufficient observations: found {len(df)} rows, minimum required is {MIN_OBSERVATIONS_FOR_TRAINING}.", stats

    # Range and physical bounds
    if (df["passengers"] < 0).any() or (df["passengers"] > BUS_CAPACITY).any():
        return False, f"Invalid passenger counts detected outside [0, {BUS_CAPACITY}].", stats

    stats["passengers_min"] = int(df["passengers"].min())
    stats["passengers_max"] = int(df["passengers"].max())
    stats["variance"] = float(df["passengers"].var())

    if stats["variance"] < 0.1:
        return False, f"Passenger variance is near zero ({stats['variance']:.4f}). Insufficient diversity for training.", stats

    stats["is_sufficient"] = True
    return True, "Dataset validation passed.", stats


def prepare_features_and_targets(df: pd.DataFrame, horizon_steps: int = 10) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    """
    Constructs time-series features and future target without lookahead leakage.
    horizon_steps: number of steps ahead (e.g. 10 steps * 5s = 50s or 5 min depending on sampling)
    """
    df = df.copy().sort_values("time_s").reset_index(drop=True)

    # Engineered temporal features
    df["rolling_mean_3"] = df["passengers"].rolling(window=3, min_periods=1).mean()
    df["net_rate"] = df["passengers"].diff().fillna(0)

    # Future target
    df["target_passengers"] = df["passengers"].shift(-horizon_steps)

    # Drop trailing rows that have no future target
    valid_df = df.dropna(subset=["target_passengers"]).copy()

    feature_cols = [
        "time_s", "entries", "exits", "passengers", "occupancy_pct",
        "rolling_mean_3", "net_rate"
    ]

    X = valid_df[feature_cols].values.astype(np.float32)
    y = valid_df["target_passengers"].values.astype(np.float32)

    return X, y, valid_df


def train_dnn_keras(X_train, y_train, X_val, y_val):
    """
    Builds and trains a feed-forward Deep Neural Network using TensorFlow / Keras.
    """
    from tensorflow import keras
    from tensorflow.keras import layers

    model = keras.Sequential([
        layers.Input(shape=(X_train.shape[1],)),
        layers.Dense(64, activation="relu"),
        layers.Dropout(0.1),
        layers.Dense(32, activation="relu"),
        layers.Dense(16, activation="relu"),
        layers.Dense(1, activation="linear")
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mse",
        metrics=["mae"]
    )

    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=8,
        restore_best_weights=True
    )

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=60,
        batch_size=32,
        callbacks=[early_stop],
        verbose=0
    )

    return model, history


def train_dnn_mlp(X_train, y_train, X_val, y_val):
    """
    Fallback feed-forward Deep Neural Network using Scikit-Learn MLPRegressor.
    """
    from sklearn.neural_network import MLPRegressor

    mlp = MLPRegressor(
        hidden_layer_sizes=(64, 32, 16),
        activation="relu",
        solver="adam",
        learning_rate_init=0.001,
        max_iter=300,
        early_stopping=True,
        validation_fraction=0.15,
        random_state=42
    )
    mlp.fit(X_train, y_train)
    return mlp


def run_training_pipeline(
    csv_path: str = None,
    use_synthetic: bool = False,
    horizon_minutes: int = 5,
    force_fallback_mlp: bool = False
) -> dict:
    print("=" * 70)
    print(" SmartBus AI — Deep Neural Network Training Pipeline")
    print("=" * 70)

    # 1. Determine dataset file
    if use_synthetic:
        data_file = BASE_DIR / "data" / "synthetic_bus_trips.csv"
        if not data_file.exists():
            print("[*] Generating synthetic demonstration dataset...")
            from ml.generate_demo_data import generate_full_synthetic_dataset
            generate_full_synthetic_dataset(num_trips=16, output_path=str(data_file))
        data_source_label = "synthetic"
    else:
        if csv_path:
            data_file = Path(csv_path)
        else:
            data_file = BASE_DIR / "data" / "bus_occupancy.csv"
        data_source_label = "wokwi_or_collected"

    if not data_file.exists():
        err_msg = f"Dataset not found at: {data_file}"
        print(f"[!] {err_msg}")
        return {"trained": False, "message": err_msg}

    print(f"[*] Reading dataset: {data_file} (Source: {data_source_label})")
    df = pd.read_csv(data_file)

    # 2. Validate
    is_valid, val_msg, stats = validate_dataset(df)
    if not is_valid:
        print(f"[!] Data Validation Failed: {val_msg}")
        print(f"    Total rows: {stats['total_rows']}, Insufficient for reliable regression.")
        
        # Save explicit model card describing insufficient data state
        card = {
            "status": "insufficient_data",
            "message": val_msg,
            "observations_found": stats["total_rows"],
            "required_observations": MIN_OBSERVATIONS_FOR_TRAINING,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "recommendation": "Collect more Wokwi simulation cycles or run with --use-synthetic for demonstration training."
        }
        with open(MODEL_DIR / "model_card.json", "w", encoding="utf-8") as f:
            json.dump(card, f, indent=2)

        return {"trained": False, "message": val_msg, "stats": stats}

    print(f"[+] Dataset validation passed: {len(df)} observations, passenger variance: {stats['variance']:.2f}")

    # 3. Create windowed features and target
    # Horizon steps: each step is ~5s. 5 minutes ~ 60 steps, or 10 steps for shorter demos
    horizon_steps = max(5, horizon_minutes * 2)
    X, y, clean_df = prepare_features_and_targets(df, horizon_steps=horizon_steps)
    total_samples = len(X)

    # 4. Chronological train/val/test split (70% / 15% / 15%)
    n_train = int(total_samples * 0.70)
    n_val = int(total_samples * 0.15)
    n_test = total_samples - n_train - n_val

    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    X_test, y_test = X[n_train + n_val:], y[n_train + n_val:]

    print(f"[*] Chronological Split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    # 5. Fit scaler on train ONLY
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    joblib.dump(scaler, MODEL_DIR / "scaler.joblib")
    print(f"[+] Saved feature scaler to: {MODEL_DIR / 'scaler.joblib'}")

    # 6. Evaluate Baseline Persistence Model on Test Set
    # Feature index 3 is 'passengers' (current passenger count)
    y_baseline_pred = X_test[:, 3]
    baseline_mae = float(mean_absolute_error(y_test, y_baseline_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, y_baseline_pred)))
    baseline_r2 = float(r2_score(y_test, y_baseline_pred))

    print(f"[>] Persistence Baseline (Predict current count):")
    print(f"    MAE: {baseline_mae:.3f} passengers | RMSE: {baseline_rmse:.3f} | R2: {baseline_r2:.3f}")

    # 7. Train DNN (Keras or MLP)
    model_type = "mlp"
    keras_model = None
    mlp_model = None

    if not force_fallback_mlp:
        try:
            print("[*] Training Deep Neural Network via TensorFlow/Keras...")
            keras_model, _ = train_dnn_keras(X_train_scaled, y_train, X_val_scaled, y_val)
            keras_model.save(MODEL_DIR / "dnn_model.keras")
            model_type = "keras"
            print(f"[+] Keras DNN saved to: {MODEL_DIR / 'dnn_model.keras'}")
        except Exception as e:
            print(f"[!] Keras training error: {e}. Falling back to MLPRegressor...")
            keras_model = None

    # Also train and save MLPRegressor as robust guaranteed fallback
    print("[*] Training Deep Neural Network via Scikit-Learn MLPRegressor...")
    mlp_model = train_dnn_mlp(X_train_scaled, y_train, X_val_scaled, y_val)
    joblib.dump(mlp_model, MODEL_DIR / "dnn_model.joblib")
    print(f"[+] MLPRegressor saved to: {MODEL_DIR / 'dnn_model.joblib'}")

    if keras_model is not None:
        y_dnn_pred = keras_model.predict(X_test_scaled, verbose=0).flatten()
    else:
        y_dnn_pred = mlp_model.predict(X_test_scaled)
        model_type = "mlp"

    # Clamping test predictions for reporting
    y_dnn_pred_clamped = np.clip(y_dnn_pred, 0, BUS_CAPACITY)

    dnn_mae = float(mean_absolute_error(y_test, y_dnn_pred_clamped))
    dnn_rmse = float(np.sqrt(mean_squared_error(y_test, y_dnn_pred_clamped)))
    dnn_r2 = float(r2_score(y_test, y_dnn_pred_clamped))

    print(f"[>] Deep Neural Network ({model_type.upper()}):")
    print(f"    MAE: {dnn_mae:.3f} passengers | RMSE: {dnn_rmse:.3f} | R2: {dnn_r2:.3f}")

    # 8. Create Model Card
    model_card = {
        "model_name": "SmartBus-DNN-v1",
        "model_type": model_type,
        "architecture": "Dense(64, ReLU) -> Dropout(0.1) -> Dense(32, ReLU) -> Dense(16, ReLU) -> Dense(1, Linear)",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "horizon_minutes": horizon_minutes,
        "data_source": data_source_label,
        "total_observations": total_samples,
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "features": [
            "time_s", "entries", "exits", "passengers", "occupancy_pct",
            "rolling_mean_3", "net_rate"
        ],
        "target": f"passengers_t+{horizon_minutes}min",
        "metrics": {
            "dnn_mae": round(dnn_mae, 3),
            "dnn_rmse": round(dnn_rmse, 3),
            "dnn_r2": round(dnn_r2, 3),
            "baseline_mae": round(baseline_mae, 3),
            "baseline_rmse": round(baseline_rmse, 3),
            "baseline_r2": round(baseline_r2, 3)
        },
        "limitations": [
            "Trained for demonstration and educational purposes.",
            "Predictions are physically clamped to [0, 40] passengers.",
            "Clipping to bounds does not transform an uncertain forecast into a certified safety measurement.",
            f"Dataset source: {data_source_label}. Real transit conditions with varying weather and schedule deviations require real fleet telemetry."
        ]
    }

    with open(MODEL_DIR / "model_card.json", "w", encoding="utf-8") as f:
        json.dump(model_card, f, indent=2)

    print(f"[+] Saved model card to: {MODEL_DIR / 'model_card.json'}")

    return {
        "trained": True,
        "model_name": "SmartBus-DNN-v1",
        "model_type": model_type,
        "horizon_minutes": horizon_minutes,
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "metrics": model_card["metrics"]
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SmartBus AI Prediction Model")
    parser.add_argument("--csv", default=None, help="Path to input CSV file")
    parser.add_argument("--use-synthetic", action="store_true", help="Use synthetic dataset for training demo model")
    parser.add_argument("--horizon", type=int, default=5, help="Prediction horizon in minutes")
    args = parser.parse_args()

    run_training_pipeline(csv_path=args.csv, use_synthetic=args.use_synthetic, horizon_minutes=args.horizon)
