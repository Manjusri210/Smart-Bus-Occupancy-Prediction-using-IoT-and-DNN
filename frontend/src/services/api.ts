import {
  SystemStatus,
  OccupancyObservation,
  PredictionResult,
  AlertEvent,
  AnalyticsSummary
} from '../types';

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error(`Status check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchCurrentOccupancy(): Promise<OccupancyObservation> {
  const res = await fetch(`${BASE_URL}/occupancy/current`);
  if (!res.ok) throw new Error(`Current occupancy fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchOccupancyHistory(limit = 100, source?: string): Promise<OccupancyObservation[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (source) params.append('source', source);

  const res = await fetch(`${BASE_URL}/occupancy/history?${params.toString()}`);
  if (!res.ok) throw new Error(`History fetch failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function ingestObservation(data: Partial<OccupancyObservation>): Promise<OccupancyObservation> {
  const res = await fetch(`${BASE_URL}/occupancy/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to ingest observation');
  return json.data;
}

export async function simulatePassenger(action: 'entry' | 'exit'): Promise<OccupancyObservation> {
  const res = await fetch(`${BASE_URL}/occupancy/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Simulation step failed');
  return json.data;
}

export async function requestPrediction(horizon_minutes = 5, passengers?: number): Promise<PredictionResult> {
  const body: any = { horizon_minutes };
  if (passengers !== undefined) body.passengers = passengers;

  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) {
    return {
      horizon_minutes,
      predicted_passengers: 0,
      predicted_occupancy_pct: 0,
      model_name: 'SmartBus-DNN',
      error: json.error || 'Prediction unavailable',
      status: json.status || 'model_not_ready'
    };
  }
  return json;
}

export async function fetchPredictionHistory(limit = 20): Promise<PredictionResult[]> {
  const res = await fetch(`${BASE_URL}/predictions/history?limit=${limit}`);
  if (!res.ok) throw new Error(`Prediction history fetch failed`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchAnalytics(hours?: number): Promise<AnalyticsSummary> {
  const url = hours ? `${BASE_URL}/analytics/summary?hours=${hours}` : `${BASE_URL}/analytics/summary`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Analytics fetch failed');
  return res.json();
}

export async function fetchAlerts(acknowledged: string = 'all'): Promise<AlertEvent[]> {
  const res = await fetch(`${BASE_URL}/alerts?acknowledged=${acknowledged}`);
  if (!res.ok) throw new Error('Alerts fetch failed');
  const json = await res.json();
  return json.data || [];
}

export async function acknowledgeAlert(alertId: number): Promise<AlertEvent> {
  const res = await fetch(`${BASE_URL}/alerts/${alertId}/acknowledge`, {
    method: 'POST'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to acknowledge alert');
  return json.data;
}

export async function uploadCsvFile(file: File): Promise<{ success: boolean; imported_rows: number; rejected_rows: number; error?: string; errors?: string[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/data/import`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!res.ok && !json.imported_rows) {
    throw new Error(json.error || 'CSV import failed');
  }
  return json;
}

export async function triggerModelTraining(use_synthetic: boolean = false): Promise<any> {
  const res = await fetch(`${BASE_URL}/model/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ use_synthetic })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || 'Model training failed');
  return json;
}
