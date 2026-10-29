export type OccupancyStatus = 'LOW' | 'MODERATE' | 'HIGH';
export type DataSourceMode = 'LIVE' | 'CSV' | 'DEMO' | 'EMPTY';
export type AlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface OccupancyObservation {
  id?: number;
  timestamp?: string | null;
  time_s: number;
  entries: number;
  exits: number;
  passengers: number;
  occupancy_pct: number;
  source: string;
  capacity?: number;
  status?: OccupancyStatus;
  is_empty?: boolean;
}

export interface PredictionResult {
  id?: number;
  timestamp?: string | null;
  horizon_minutes: number;
  predicted_passengers: number;
  raw_predicted_passengers?: number;
  predicted_occupancy_pct: number;
  model_name: string;
  actual_passengers?: number | null;
  mae_estimate?: number | null;
  clamped?: boolean;
  disclaimer?: string;
  error?: string;
  status?: string;
}

export interface AlertEvent {
  id: number;
  timestamp: string;
  severity: AlertSeverity;
  message: string;
  passenger_count: number;
  occupancy_pct: number;
  acknowledged: boolean;
  acknowledged_at?: string | null;
}

export interface SystemStatus {
  backend_health: string;
  database_available: boolean;
  total_observations: number;
  active_alerts_count: number;
  data_source_mode: DataSourceMode;
  bus_capacity: number;
  polling_interval_seconds: number;
  model_status: {
    ready: boolean;
    status: string;
    message: string;
    model_name?: string;
    model_type?: string;
    horizon_minutes?: number;
    metrics?: {
      dnn_mae: number;
      dnn_rmse: number;
      dnn_r2: number;
      baseline_mae: number;
      baseline_rmse: number;
      baseline_r2: number;
    };
    trained_at?: string;
    model_card?: any;
  };
  latest_update?: string | null;
}

export interface AnalyticsSummary {
  total_observations: number;
  peak_passengers: number;
  peak_occupancy_pct: number;
  avg_passengers: number;
  avg_occupancy_pct: number;
  low_count: number;
  moderate_count: number;
  high_count: number;
  low_pct: number;
  moderate_pct: number;
  high_pct: number;
  total_entries: number;
  total_exits: number;
  first_timestamp: string | null;
  last_timestamp: string | null;
  sources: Record<string, number>;
}
