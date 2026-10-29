import io
import csv
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import desc
from backend.app.config import Config
from backend.app.database import SessionLocal
from backend.app.models import (
    OccupancyObservation, PredictionRecord, AlertEvent, DataImport, ModelTrainingRun, utc_now
)
from backend.app.services import (
    ingest_observation, simulate_step, process_csv_import, compute_analytics
)
from backend.app.ml_service import MLService

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/health", methods=["GET"])
def health():
    db = SessionLocal()
    db_ok = False
    try:
        db.execute(OccupancyObservation.__table__.select().limit(1))
        db_ok = True
    except Exception:
        db_ok = False
    finally:
        db.close()

    ml = MLService.get_instance()
    return jsonify({
        "status": "healthy" if db_ok else "degraded",
        "timestamp": utc_now().isoformat(),
        "database_connected": db_ok,
        "model_ready": ml.is_ready(),
        "version": "1.0.0"
    }), 200 if db_ok else 500


@api_bp.route("/status", methods=["GET"])
def system_status():
    db = SessionLocal()
    try:
        total_obs = db.query(OccupancyObservation).count()
        latest = db.query(OccupancyObservation).order_by(desc(OccupancyObservation.id)).first()
        active_alerts_count = db.query(AlertEvent).filter(AlertEvent.acknowledged == False).count()
        
        # Determine source status: DEMO, CSV, or LIVE
        source_status = "EMPTY"
        if latest:
            if latest.source in ["wokwi", "live_device"]:
                source_status = "LIVE"
            elif latest.source == "csv":
                source_status = "CSV"
            else:
                source_status = "DEMO"

        ml = MLService.get_instance()
        return jsonify({
            "backend_health": "online",
            "database_available": True,
            "total_observations": total_obs,
            "active_alerts_count": active_alerts_count,
            "data_source_mode": source_status,
            "bus_capacity": Config.BUS_CAPACITY,
            "polling_interval_seconds": Config.POLLING_INTERVAL_SECONDS,
            "model_status": ml.get_status(),
            "latest_update": latest.timestamp.isoformat() if latest else None
        }), 200
    finally:
        db.close()


@api_bp.route("/occupancy/current", methods=["GET"])
def get_current_occupancy():
    db = SessionLocal()
    try:
        latest = db.query(OccupancyObservation).order_by(desc(OccupancyObservation.id)).first()
        if not latest:
            return jsonify({
                "passengers": 0,
                "capacity": Config.BUS_CAPACITY,
                "occupancy_pct": 0.0,
                "status": "LOW",
                "entries": 0,
                "exits": 0,
                "time_s": 0.0,
                "timestamp": None,
                "source": "EMPTY",
                "is_empty": True
            }), 200

        pct = latest.occupancy_pct
        if pct < 40.0:
            status = "LOW"
        elif pct < 75.0:
            status = "MODERATE"
        else:
            status = "HIGH"

        return jsonify({
            **latest.to_dict(),
            "capacity": Config.BUS_CAPACITY,
            "status": status,
            "is_empty": False
        }), 200
    finally:
        db.close()


@api_bp.route("/occupancy/history", methods=["GET"])
def get_occupancy_history():
    db = SessionLocal()
    try:
        limit = min(int(request.args.get("limit", 100)), 1000)
        offset = max(int(request.args.get("offset", 0)), 0)
        source = request.args.get("source")

        query = db.query(OccupancyObservation)
        if source:
            query = query.filter(OccupancyObservation.source == source)

        total = query.count()
        # Order by id ascending for natural time-series charts
        records = query.order_by(OccupancyObservation.id.asc()).offset(offset).limit(limit).all()

        return jsonify({
            "total": total,
            "count": len(records),
            "limit": limit,
            "offset": offset,
            "data": [r.to_dict() for r in records]
        }), 200
    finally:
        db.close()


@api_bp.route("/occupancy/ingest", methods=["POST"])
def ingest_data():
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    db = SessionLocal()
    try:
        success, err_msg, obs = ingest_observation(db, payload)
        if not success:
            return jsonify({"error": err_msg}), 422
        return jsonify({
            "message": "Observation ingested successfully",
            "data": obs.to_dict()
        }), 201
    finally:
        db.close()


@api_bp.route("/occupancy/simulate", methods=["POST"])
def simulate_occupancy():
    payload = request.get_json(silent=True) or {}
    action = payload.get("action", "").lower().strip()
    if action not in ["entry", "exit"]:
        return jsonify({"error": "Action must be 'entry' or 'exit'"}), 400

    db = SessionLocal()
    try:
        success, err_msg, obs = simulate_step(db, action)
        if not success:
            return jsonify({"error": err_msg}), 400
        return jsonify({
            "message": f"Simulated passenger {action} successfully",
            "data": obs.to_dict()
        }), 200
    finally:
        db.close()


@api_bp.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    horizon_minutes = int(payload.get("horizon_minutes", 5))

    db = SessionLocal()
    try:
        # If parameters not provided in payload, fetch the latest observation from DB
        latest = db.query(OccupancyObservation).order_by(desc(OccupancyObservation.id)).first()

        passengers = payload.get("passengers", latest.passengers if latest else 0)
        occupancy_pct = payload.get("occupancy_pct", latest.occupancy_pct if latest else 0.0)
        entries = payload.get("entries", latest.entries if latest else 0)
        exits = payload.get("exits", latest.exits if latest else 0)
        time_s = payload.get("time_s", latest.time_s if latest else 0.0)

        # Retrieve recent observations for sequence context
        recent = db.query(OccupancyObservation).order_by(desc(OccupancyObservation.id)).limit(10).all()
        recent_history = [r.to_dict() for r in reversed(recent)]

        ml = MLService.get_instance()
        success, err, pred_result = ml.predict(
            passengers=passengers,
            occupancy_pct=occupancy_pct,
            entries=entries,
            exits=exits,
            time_s=time_s,
            horizon_minutes=horizon_minutes,
            recent_history=recent_history
        )

        if not success:
            return jsonify({
                "error": err,
                "status": "model_not_ready",
                "ready": False
            }), 503

        # Record prediction in DB
        record = PredictionRecord(
            timestamp=utc_now(),
            horizon_minutes=horizon_minutes,
            predicted_passengers=pred_result["predicted_passengers"],
            predicted_occupancy_pct=pred_result["predicted_occupancy_pct"],
            model_name=pred_result["model_name"],
            mae_estimate=pred_result.get("mae_estimate")
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return jsonify({
            **record.to_dict(),
            "raw_predicted_passengers": pred_result["raw_predicted_passengers"],
            "clamped": pred_result["clamped"],
            "disclaimer": pred_result["disclaimer"]
        }), 200
    finally:
        db.close()


@api_bp.route("/predictions/history", methods=["GET"])
def get_predictions_history():
    db = SessionLocal()
    try:
        limit = min(int(request.args.get("limit", 20)), 100)
        records = db.query(PredictionRecord).order_by(desc(PredictionRecord.id)).limit(limit).all()
        return jsonify({
            "count": len(records),
            "data": [r.to_dict() for r in records]
        }), 200
    finally:
        db.close()


@api_bp.route("/analytics/summary", methods=["GET"])
def get_analytics():
    hours = request.args.get("hours")
    hours_int = int(hours) if hours and hours.isdigit() else None

    db = SessionLocal()
    try:
        summary = compute_analytics(db, hours_int)
        return jsonify(summary), 200
    finally:
        db.close()


@api_bp.route("/alerts", methods=["GET"])
def get_alerts():
    ack_param = request.args.get("acknowledged")
    limit = min(int(request.args.get("limit", 50)), 200)

    db = SessionLocal()
    try:
        query = db.query(AlertEvent)
        if ack_param is not None and ack_param.lower() != "all":
            ack_bool = ack_param.lower() in ["true", "1", "yes"]
            query = query.filter(AlertEvent.acknowledged == ack_bool)

        alerts = query.order_by(desc(AlertEvent.id)).limit(limit).all()
        return jsonify({
            "count": len(alerts),
            "data": [a.to_dict() for a in alerts]
        }), 200
    finally:
        db.close()


@api_bp.route("/alerts/<int:alert_id>/acknowledge", methods=["POST"])
def acknowledge_alert(alert_id: int):
    db = SessionLocal()
    try:
        alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
        if not alert:
            return jsonify({"error": f"Alert with ID {alert_id} not found"}), 404

        alert.acknowledged = True
        alert.acknowledged_at = utc_now()
        db.commit()
        db.refresh(alert)
        return jsonify({
            "message": "Alert acknowledged successfully",
            "data": alert.to_dict()
        }), 200
    finally:
        db.close()


@api_bp.route("/data/import", methods=["POST"])
def import_csv():
    # Support both file upload form-data and raw json
    file_content = ""
    filename = "imported_data.csv"

    if "file" in request.files:
        uploaded_file = request.files["file"]
        filename = uploaded_file.filename or filename
        file_bytes = uploaded_file.read()
        if len(file_bytes) > Config.MAX_CSV_UPLOAD_BYTES:
            return jsonify({"error": f"File exceeds maximum allowed size of {Config.MAX_CSV_UPLOAD_BYTES // (1024*1024)}MB"}), 413
        file_content = file_bytes.decode("utf-8", errors="replace")
    else:
        json_payload = request.get_json(silent=True) or {}
        file_content = json_payload.get("csv_content", "")
        filename = json_payload.get("filename", filename)

    if not file_content.strip():
        return jsonify({"error": "No CSV content provided"}), 400

    db = SessionLocal()
    try:
        result = process_csv_import(db, file_content, filename)
        status_code = 200 if result["success"] else 400
        return jsonify(result), status_code
    finally:
        db.close()


@api_bp.route("/data/export", methods=["GET"])
def export_csv():
    db = SessionLocal()
    try:
        records = db.query(OccupancyObservation).order_by(OccupancyObservation.id.asc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["time_s", "entries", "exits", "passengers", "occupancy_pct", "source", "timestamp"])

        for r in records:
            writer.writerow([
                r.time_s,
                r.entries,
                r.exits,
                r.passengers,
                r.occupancy_pct,
                r.source,
                r.timestamp.isoformat() if r.timestamp else ""
            ])

        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=smartbus_observations.csv"}
        )
    finally:
        db.close()


@api_bp.route("/data/template", methods=["GET"])
def get_csv_template():
    template = (
        "time_s,entries,exits,passengers,occupancy_pct\n"
        "0,0,0,0,0.0\n"
        "5,1,0,1,2.5\n"
        "10,2,0,2,5.0\n"
        "15,3,1,2,5.0\n"
        "20,4,1,3,7.5\n"
    )
    return Response(
        template,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=bus_occupancy_template.csv"}
    )


@api_bp.route("/model/status", methods=["GET"])
def get_model_status():
    ml = MLService.get_instance()
    return jsonify(ml.get_status()), 200


@api_bp.route("/model/train", methods=["POST"])
def trigger_training():
    if not Config.ENABLE_MODEL_TRAINING_ENDPOINT:
        return jsonify({"error": "Model training endpoint is disabled in production settings."}), 403

    payload = request.get_json(silent=True) or {}
    use_synthetic = payload.get("use_synthetic", False)

    try:
        from ml.train_model import run_training_pipeline
        result = run_training_pipeline(use_synthetic=use_synthetic)

        # Reload ML service in-memory
        MLService.get_instance().reload()

        db = SessionLocal()
        try:
            if result.get("trained"):
                m_run = ModelTrainingRun(
                    model_name=result.get("model_name", "SmartBus-DNN"),
                    training_samples=result.get("train_samples", 0),
                    val_samples=result.get("val_samples", 0),
                    test_samples=result.get("test_samples", 0),
                    dnn_mae=result.get("metrics", {}).get("dnn_mae"),
                    dnn_rmse=result.get("metrics", {}).get("dnn_rmse"),
                    dnn_r2=result.get("metrics", {}).get("dnn_r2"),
                    baseline_mae=result.get("metrics", {}).get("baseline_mae"),
                    baseline_rmse=result.get("metrics", {}).get("baseline_rmse"),
                    status="trained",
                    horizon_minutes=result.get("horizon_minutes", 5),
                    notes="Trained via API"
                )
            else:
                m_run = ModelTrainingRun(
                    model_name="SmartBus-DNN",
                    status="insufficient_data",
                    notes=result.get("message", "Insufficient observations to train regression model.")
                )
            db.add(m_run)
            db.commit()
        finally:
            db.close()

        status_code = 200 if result.get("trained") else 422
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500
