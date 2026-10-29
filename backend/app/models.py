from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class OccupancyObservation(Base):
    __tablename__ = "occupancy_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    time_s = Column(Float, nullable=False)
    entries = Column(Integer, nullable=False, default=0)
    exits = Column(Integer, nullable=False, default=0)
    passengers = Column(Integer, nullable=False)
    occupancy_pct = Column(Float, nullable=False)
    source = Column(String(50), default="simulation", nullable=False)  # wokwi, csv, synthetic, live_device, simulation
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "time_s": self.time_s,
            "entries": self.entries,
            "exits": self.exits,
            "passengers": self.passengers,
            "occupancy_pct": round(self.occupancy_pct, 1),
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    horizon_minutes = Column(Integer, nullable=False, default=5)
    predicted_passengers = Column(Float, nullable=False)
    predicted_occupancy_pct = Column(Float, nullable=False)
    model_name = Column(String(100), default="dnn_v1", nullable=False)
    actual_passengers = Column(Float, nullable=True)
    mae_estimate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "horizon_minutes": self.horizon_minutes,
            "predicted_passengers": round(max(0.0, min(40.0, self.predicted_passengers)), 1),
            "raw_predicted_passengers": round(self.predicted_passengers, 2),
            "predicted_occupancy_pct": round(max(0.0, min(100.0, self.predicted_occupancy_pct)), 1),
            "model_name": self.model_name,
            "actual_passengers": self.actual_passengers,
            "mae_estimate": round(self.mae_estimate, 2) if self.mae_estimate is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AlertEvent(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    severity = Column(String(20), default="HIGH", nullable=False)  # LOW, MODERATE, HIGH, CRITICAL
    message = Column(String(255), nullable=False)
    passenger_count = Column(Integer, nullable=False)
    occupancy_pct = Column(Float, nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "severity": self.severity,
            "message": self.message,
            "passenger_count": self.passenger_count,
            "occupancy_pct": round(self.occupancy_pct, 1),
            "acknowledged": self.acknowledged,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DataImport(Base):
    __tablename__ = "data_imports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    source = Column(String(50), default="csv", nullable=False)
    status = Column(String(50), default="success", nullable=False)
    error_details = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "row_count": self.row_count,
            "source": self.source,
            "status": self.status,
            "error_details": self.error_details,
            "imported_at": self.imported_at.isoformat() if self.imported_at else None,
        }


class ModelTrainingRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(100), nullable=False)
    training_samples = Column(Integer, default=0)
    val_samples = Column(Integer, default=0)
    test_samples = Column(Integer, default=0)
    dnn_mae = Column(Float, nullable=True)
    dnn_rmse = Column(Float, nullable=True)
    dnn_r2 = Column(Float, nullable=True)
    baseline_mae = Column(Float, nullable=True)
    baseline_rmse = Column(Float, nullable=True)
    status = Column(String(50), default="trained")
    horizon_minutes = Column(Integer, default=5)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "training_samples": self.training_samples,
            "val_samples": self.val_samples,
            "test_samples": self.test_samples,
            "dnn_mae": round(self.dnn_mae, 3) if self.dnn_mae is not None else None,
            "dnn_rmse": round(self.dnn_rmse, 3) if self.dnn_rmse is not None else None,
            "dnn_r2": round(self.dnn_r2, 3) if self.dnn_r2 is not None else None,
            "baseline_mae": round(self.baseline_mae, 3) if self.baseline_mae is not None else None,
            "baseline_rmse": round(self.baseline_rmse, 3) if self.baseline_rmse is not None else None,
            "status": self.status,
            "horizon_minutes": self.horizon_minutes,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
