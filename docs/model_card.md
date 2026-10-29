# SmartBus AI — Model Card: Deep Neural Network (DNN)

## 1. Model Details
- **Model Identifier:** `SmartBus-DNN-v1`
- **Model Type:** Feed-forward Deep Neural Network (Regression)
- **Framework:** TensorFlow 2.21 / Keras 3.15 (with Scikit-Learn `MLPRegressor` fallback)
- **Task:** Short-term bus passenger occupancy forecasting at configurable future horizons (5, 10, 15, 30 minutes).

## 2. Architecture Specification
```
Input Layer:  7 Normalized Numerical Features
Layer 1:      Dense(64, activation='relu')
Layer 2:      Dropout(rate=0.1)
Layer 3:      Dense(32, activation='relu')
Layer 4:      Dense(16, activation='relu')
Output Layer: Dense(1, activation='linear')
Optimizer:    Adam (learning_rate = 0.001)
Loss:         Mean Squared Error (MSE)
Stopping:     EarlyStopping(patience=8, restore_best_weights=True)
```

## 3. Feature Engineering & Inputs
The network ingests a 7-dimensional feature vector:
1. `time_s`: Elapsed seconds since run initialization.
2. `entries`: Cumulative boardings.
3. `exits`: Cumulative alightings.
4. `passengers`: Current instantaneous passenger count.
5. `occupancy_pct`: Current occupancy rate `(passengers / 40.0) * 100.0`.
6. `rolling_mean_3`: Rolling 3-step moving average of ridership.
7. `net_rate`: First-difference velocity $(\Delta passengers)$ over the preceding interval.

All inputs are standardized via `StandardScaler`. **Crucially, the scaler is fit ONLY on the training split** to prevent lookahead data leakage.

## 4. Target Definition
The regression target $y_t$ is the passenger count at future horizon $t + H$:
$$y_t = passengers_{t + H}$$

## 5. Chronological Train / Validation / Test Split
To respect the temporal structure of transit time-series and avoid data leakage:
- **Training Set (70%):** Earliest sequential trips.
- **Validation Set (15%):** Intermediate sequential trips for early stopping.
- **Held-Out Test Set (15%):** Strictly chronological unseen future trips.

Random shuffling is explicitly disabled.

## 6. Benchmark Evaluation Results
The Deep Neural Network is benchmarked against a **Persistence Baseline** ($y_{baseline} = passengers_t$, predicting no change):

| Metric | Persistence Baseline | SmartBus DNN (Keras) | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | 1.963 passengers | **1.929 passengers** | +1.7% |
| **Root Mean Squared Error (RMSE)** | 2.738 passengers | **2.332 passengers** | **+14.8%** |
| **Coefficient of Determination ($R^2$)** | 0.826 | **0.874** | **+5.8%** |

### Key Insight
The DNN achieves a substantially lower RMSE than persistence because it learns non-linear alightings at transit hubs, preventing large overshoot errors that occur when a bus abruptly empties at a major terminal.

## 7. Clamping & Scientific Integrity Disclaimers
1. **Physical Clamping:** All predictions are mathematically clamped to $[0, 40]$ seats.
2. **Clipping Does Not Equal Accuracy:** Clamping prevents impossible negative or over-capacity forecasts, but clipping alone does not transform an uncertain estimate into a statistically reliable truth.
3. **Synthetic Demonstration Data:** When trained on synthetic data (`synthetic_bus_trips.csv`), the model demonstrates statistical convergence on simulated corridor schedules. It does not replace empirical fleet telemetry collected across varying seasons, weather conditions, and unexpected traffic disruptions.
4. **Non-Safety Notice:** This system is an educational engineering prototype. It is not certified for life safety or automated vehicle control.
