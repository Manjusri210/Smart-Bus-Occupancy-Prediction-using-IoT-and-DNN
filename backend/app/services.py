import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from backend.app.config import Config
from backend.app.models import (
    OccupancyObservation, AlertEvent, DataImport, SystemSetting, utc_now
)


def validate_observation(data: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates occupancy data fields and enforces physical bus bounds.
    """
    try:
        passengers = int(data.get("passengers", 0))
    except (ValueError, TypeError):
        return False, "Invalid 'passengers' value: must be an integer", {}

    if passengers < 0:
        return False, f"Passenger count cannot be negative (received {passengers})", {}

    if passengers > Config.BUS_CAPACITY:
        return False, f"Passenger count ({passengers}) exceeds bus capacity of {Config.BUS_CAPACITY}", {}

    try:
        entries = int(data.get("entries", 0))
        exits = int(data.get("exits", 0))
    except (ValueError, TypeError):
        return False, "Entries and exits must be integers", {}

    if entries < 0 or exits < 0:
        return False, "Cumulative entries and exits cannot be negative", {}

    try:
        time_s = float(data.get("time_s", 0.0))
    except (ValueError, TypeError):
        return False, "time_s must be a valid number", {}

    if time_s < 0:
        return False, "time_s cannot be negative", {}

    expected_pct = round((passengers / float(Config.BUS_CAPACITY)) * 100.0, 1)
    given_pct = data.get("occupancy_pct")
    if given_pct is not None:
        try:
            given_pct = float(given_pct)
            # Check consistency with 2% tolerance
            if abs(given_pct - expected_pct) > 2.0:
                # Use mathematically consistent percentage
                occupancy_pct = expected_pct
            else:
                occupancy_pct = round(given_pct, 1)
        except (ValueError, TypeError):
            occupancy_pct = expected_pct
    else:
        occupancy_pct = expected_pct

    source = str(data.get("source", "simulation")).strip()
    if source not in ["wokwi", "csv", "synthetic", "live_device", "simulation"]:
        source = "simulation"

    validated = {
        "time_s": time_s,
        "entries": entries,
        "exits": exits,
        "passengers": passengers,
        "occupancy_pct": occupancy_pct,
        "source": source,
        "raw_data": str(data.get("raw_data", ""))[:500] if data.get("raw_data") else None
    }
    return True, "", validated


def check_and_generate_alerts(db: Session, observation: OccupancyObservation):
    """
    Generates alerts when occupancy reaches or transitions into HIGH (>=75%, >=30 passengers).
    Prevents duplicate alerts within 5 minutes unless severity escalates to CRITICAL (>=38).
    """
    passengers = observation.passengers
    occupancy_pct = observation.occupancy_pct

    # Determine status
    if occupancy_pct < 40.0:
        status = "LOW"
    elif occupancy_pct < 75.0:
        status = "MODERATE"
    else:
        status = "HIGH"

    if status == "HIGH":
        severity = "CRITICAL" if passengers >= 38 else "HIGH"
        five_mins_ago = utc_now() - timedelta(minutes=5)
        
        # Check for recent active unacknowledged alert of same severity
        existing_alert = db.query(AlertEvent).filter(
            AlertEvent.acknowledged == False,
            AlertEvent.timestamp >= five_mins_ago,
            AlertEvent.severity == severity
        ).first()

        if not existing_alert:
            msg = (
                f"High occupancy warning: Bus is at {occupancy_pct}% capacity "
                f"({passengers}/{Config.BUS_CAPACITY} passengers)."
            )
            if severity == "CRITICAL":
                msg = (
                    f"CRITICAL CAPACITY ALERT: Bus is near absolute maximum at "
                    f"{occupancy_pct}% ({passengers}/{Config.BUS_CAPACITY} passengers)!"
                )

            alert = AlertEvent(
                timestamp=utc_now(),
                severity=severity,
                message=msg,
                passenger_count=passengers,
                occupancy_pct=occupancy_pct,
                acknowledged=False
            )
            db.add(alert)
            db.commit()


def ingest_observation(db: Session, data: Dict[str, Any]) -> Tuple[bool, str, OccupancyObservation | None]:
    valid, err_msg, validated_data = validate_observation(data)
    if not valid:
        return False, err_msg, None

    obs = OccupancyObservation(
        timestamp=utc_now(),
        time_s=validated_data["time_s"],
        entries=validated_data["entries"],
        exits=validated_data["exits"],
        passengers=validated_data["passengers"],
        occupancy_pct=validated_data["occupancy_pct"],
        source=validated_data["source"],
        raw_data=validated_data["raw_data"]
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)

    # Check alert rules
    check_and_generate_alerts(db, obs)

    return True, "", obs


def simulate_step(db: Session, action: str) -> Tuple[bool, str, OccupancyObservation | None]:
    """
    Simulate manual passenger entry (+1) or exit (-1).
    """
    latest = db.query(OccupancyObservation).order_by(desc(OccupancyObservation.id)).first()
    
    if latest:
        current_p = latest.passengers
        entries = latest.entries
        exits = latest.exits
        time_s = latest.time_s + 5.0
    else:
        current_p = 0
        entries = 0
        exits = 0
        time_s = 0.0

    if action == "entry":
        if current_p >= Config.BUS_CAPACITY:
            return False, f"Cannot board: bus is at maximum capacity ({Config.BUS_CAPACITY})", None
        current_p += 1
        entries += 1
    elif action == "exit":
        if current_p <= 0:
            return False, "Cannot alight: bus passenger count is already 0", None
        current_p -= 1
        exits += 1
    else:
        return False, f"Unknown action: '{action}'. Must be 'entry' or 'exit'", None

    payload = {
        "time_s": time_s,
        "entries": entries,
        "exits": exits,
        "passengers": current_p,
        "occupancy_pct": round((current_p / float(Config.BUS_CAPACITY)) * 100.0, 1),
        "source": "simulation"
    }
    return ingest_observation(db, payload)


def process_csv_import(db: Session, file_content: str, filename: str) -> Dict[str, Any]:
    """
    Parses, validates, and imports a CSV stream into the database.
    Required columns: time_s,entries,exits,passengers,occupancy_pct
    """
    reader = csv.DictReader(io.StringIO(file_content))
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
    required = ["time_s", "entries", "exits", "passengers", "occupancy_pct"]

    missing = [c for c in required if c not in fieldnames]
    if missing:
        import_record = DataImport(
            filename=filename,
            row_count=0,
            source="csv",
            status="failed",
            error_details=f"Missing required columns: {', '.join(missing)}"
        )
        db.add(import_record)
        db.commit()
        return {
            "success": False,
            "error": f"Missing required columns: {', '.join(missing)}",
            "imported_rows": 0,
            "rejected_rows": 0
        }

    imported_count = 0
    rejected_count = 0
    errors = []
    observations_to_add = []

    last_time_s = None

    for row_idx, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
        valid, err, val_data = validate_observation({
            "time_s": row.get("time_s"),
            "entries": row.get("entries"),
            "exits": row.get("exits"),
            "passengers": row.get("passengers"),
            "occupancy_pct": row.get("occupancy_pct"),
            "source": "csv",
            "raw_data": str(raw_row)
        })

        if not valid:
            rejected_count += 1
            if len(errors) < 10:
                errors.append(f"Row {row_idx}: {err}")
            continue

        # Optional monotonicity check warning
        if last_time_s is not None and val_data["time_s"] < last_time_s:
            # We still allow it but record note
            pass
        last_time_s = val_data["time_s"]

        obs = OccupancyObservation(
            timestamp=utc_now(),
            time_s=val_data["time_s"],
            entries=val_data["entries"],
            exits=val_data["exits"],
            passengers=val_data["passengers"],
            occupancy_pct=val_data["occupancy_pct"],
            source="csv",
            raw_data=val_data["raw_data"]
        )
        observations_to_add.append(obs)
        imported_count += 1

    if observations_to_add:
        db.bulk_save_objects(observations_to_add)
        db.commit()

        # Check alert on the latest observation
        latest = observations_to_add[-1]
        check_and_generate_alerts(db, latest)

    status = "success" if rejected_count == 0 else ("partial" if imported_count > 0 else "failed")
    import_record = DataImport(
        filename=filename,
        row_count=imported_count,
        source="csv",
        status=status,
        error_details="; ".join(errors) if errors else None
    )
    db.add(import_record)
    db.commit()

    return {
        "success": imported_count > 0,
        "imported_rows": imported_count,
        "rejected_rows": rejected_count,
        "errors": errors,
        "status": status
    }


def compute_analytics(db: Session, hours: int | None = None) -> Dict[str, Any]:
    query = db.query(OccupancyObservation)
    if hours:
        since = utc_now() - timedelta(hours=hours)
        query = query.filter(OccupancyObservation.timestamp >= since)

    observations = query.order_by(OccupancyObservation.id.asc()).all()
    total_count = len(observations)

    if total_count == 0:
        return {
            "total_observations": 0,
            "peak_passengers": 0,
            "peak_occupancy_pct": 0.0,
            "avg_passengers": 0.0,
            "avg_occupancy_pct": 0.0,
            "low_count": 0,
            "moderate_count": 0,
            "high_count": 0,
            "low_pct": 0.0,
            "moderate_pct": 0.0,
            "high_pct": 0.0,
            "total_entries": 0,
            "total_exits": 0,
            "first_timestamp": None,
            "last_timestamp": None,
            "sources": {}
        }

    passengers_list = [o.passengers for o in observations]
    pct_list = [o.occupancy_pct for o in observations]

    peak_p = max(passengers_list)
    peak_pct = max(pct_list)
    avg_p = round(sum(passengers_list) / float(total_count), 1)
    avg_pct = round(sum(pct_list) / float(total_count), 1)

    low_count = sum(1 for p in pct_list if p < 40.0)
    moderate_count = sum(1 for p in pct_list if 40.0 <= p < 75.0)
    high_count = sum(1 for p in pct_list if p >= 75.0)

    # Sources breakdown
    sources_count = {}
    for o in observations:
        sources_count[o.source] = sources_count.get(o.source, 0) + 1

    latest = observations[-1]
    first = observations[0]

    return {
        "total_observations": total_count,
        "peak_passengers": peak_p,
        "peak_occupancy_pct": round(peak_pct, 1),
        "avg_passengers": avg_p,
        "avg_occupancy_pct": avg_pct,
        "low_count": low_count,
        "moderate_count": moderate_count,
        "high_count": high_count,
        "low_pct": round((low_count / total_count) * 100.0, 1),
        "moderate_pct": round((moderate_count / total_count) * 100.0, 1),
        "high_pct": round((high_count / total_count) * 100.0, 1),
        "total_entries": latest.entries,
        "total_exits": latest.exits,
        "first_timestamp": first.timestamp.isoformat() if first.timestamp else None,
        "last_timestamp": latest.timestamp.isoformat() if latest.timestamp else None,
        "sources": sources_count
    }
