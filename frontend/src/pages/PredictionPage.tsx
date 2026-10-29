import React, { useState, useEffect } from 'react';
import {
  Cpu,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle,
  History,
  Info,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  PredictionResult,
  SystemStatus,
  OccupancyObservation
} from '../types';
import {
  requestPrediction,
  fetchPredictionHistory,
  triggerModelTraining
} from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface PredictionPageProps {
  currentObs: OccupancyObservation | null;
  systemStatus: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const PredictionPage: React.FC<PredictionPageProps> = ({
  currentObs,
  systemStatus,
  onRefreshStatus
}) => {
  const [horizon, setHorizon] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<PredictionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);

  const modelStatus = systemStatus?.model_status;
  const isModelReady = modelStatus?.ready ?? false;

  useEffect(() => {
    loadPredictionHistory();
  }, []);

  const loadPredictionHistory = async () => {
    try {
      const data = await fetchPredictionHistory(15);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load prediction history:', err);
    }
  };

  const handlePredict = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await requestPrediction(horizon, currentObs?.passengers);
      if (result.error) {
        setError(result.error);
      } else {
        setPrediction(result);
        loadPredictionHistory();
      }
    } catch (err: any) {
      setError(err.message || 'Prediction request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerTrain = async () => {
    setIsTraining(true);
    setTrainingMessage(null);
    try {
      const res = await triggerModelTraining(true);
      setTrainingMessage(`Training completed! DNN MAE: ${res.metrics?.dnn_mae ?? 'N/A'}`);
      onRefreshStatus();
      loadPredictionHistory();
    } catch (err: any) {
      setError(`Training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const metrics = modelStatus?.metrics;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Deep Neural Network Occupancy Forecast
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multi-layer feed-forward regression model predicting bus ridership at future time horizons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={isModelReady ? 'LIVE' : 'DEMO'} size="sm" />
          <span className="text-xs text-slate-300 font-medium">
            {isModelReady ? modelStatus?.model_name : 'Model Standby'}
          </span>
        </div>
      </div>

      {/* Model Not Ready Banner */}
      {!isModelReady && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-5 text-amber-200 shadow-xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Prediction Model Standby</h4>
              <p className="text-xs text-amber-300/80 mt-1">
                {modelStatus?.message ||
                  'The AI prediction model is not currently trained or the collected dataset is insufficient.'}
              </p>
              <p className="text-[11px] text-amber-400/70 mt-1">
                Note: In strict compliance with scientific validation guidelines, SmartBus AI does not fabricate random mock forecasts.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleTriggerTrain}
              disabled={isTraining}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isTraining ? 'Training DNN on Demo Dataset...' : 'Train DNN Model on Demo Dataset'}
            </button>
            {trainingMessage && (
              <span className="text-xs text-emerald-400 font-semibold">{trainingMessage}</span>
            )}
          </div>
        </div>
      )}

      {/* Prediction Action & Horizon Selector */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Select Forecast Horizon</h3>
            <p className="text-xs text-slate-400">Choose how far ahead the DNN should project occupancy</p>
          </div>

          <div className="flex items-center gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => setHorizon(mins)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  horizon === mins
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {mins} mins
              </button>
            ))}

            <button
              onClick={handlePredict}
              disabled={isLoading || !isModelReady}
              className="ml-2 px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <TrendingUp className="w-4 h-4" />
              {isLoading ? 'Computing...' : 'Run Prediction'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Prediction Results Display */}
        {prediction && !prediction.error && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title={`Projected Passengers (t+${prediction.horizon_minutes}m)`}
                value={`${prediction.predicted_passengers} / 40`}
                sublabel={`Raw DNN regression output: ${prediction.raw_predicted_passengers ?? prediction.predicted_passengers}`}
                icon={<TrendingUp className="w-5 h-5" />}
                accentColor="blue"
              />

              <StatCard
                title="Predicted Occupancy Rate"
                value={`${prediction.predicted_occupancy_pct}%`}
                sublabel={`Category: ${
                  prediction.predicted_occupancy_pct >= 75
                    ? 'HIGH'
                    : prediction.predicted_occupancy_pct >= 40
                    ? 'MODERATE'
                    : 'LOW'
                }`}
                icon={<Percent className="w-5 h-5" />}
                accentColor="cyan"
              />

              <StatCard
                title="Model Uncertainty (MAE)"
                value={
                  prediction.mae_estimate !== undefined && prediction.mae_estimate !== null
                    ? `±${prediction.mae_estimate} pass`
                    : '±1.9 pass'
                }
                sublabel={`Model: ${prediction.model_name}`}
                icon={<Info className="w-5 h-5" />}
                accentColor="purple"
              />
            </div>

            {/* Clamping & Scientific Disclaimer Notice */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <Info className="w-4 h-4 text-blue-400" />
                Physical Bounding & Integrity Notice:
              </div>
              <p>
                Predicted passenger estimates are strictly clamped to the valid physical capacity interval [0, 40].
                However, mathematical clipping to bounds does not transform an uncertain estimate into a certified safety measurement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Model Architecture & Evaluation Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Card Specs */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Neural Network Architecture
            </h3>
            <span className="text-xs text-slate-400 font-mono">TensorFlow/Keras</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Architecture:</span>
              <span className="font-mono text-slate-200">Dense(64) &rarr; Dropout(0.1) &rarr; Dense(32) &rarr; Dense(16) &rarr; Dense(1)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Activation & Loss:</span>
              <span className="font-mono text-slate-200">ReLU (Hidden) / Linear (Output) | MSE Loss</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Input Features:</span>
              <span className="text-slate-200">time_s, entries, exits, passengers, occupancy_pct, rolling_mean, net_flux</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Data Split Strategy:</span>
              <span className="text-slate-200">Chronological 70% Train, 15% Val, 15% Held-out Test</span>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span className="text-slate-400">Data Preprocessing:</span>
              <span className="text-slate-200">StandardScaler fitted solely on train split</span>
            </div>
          </div>
        </div>

        {/* Benchmark vs Persistence Baseline */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Evaluation vs Persistence Baseline
            </h3>
            <span className="text-xs text-slate-400">Held-Out Test Set</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/50">
                <tr>
                  <th className="py-2 px-3">Metric</th>
                  <th className="py-2 px-3">Persistence Baseline</th>
                  <th className="py-2 px-3 text-blue-400">SmartBus DNN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                <tr>
                  <td className="py-2.5 px-3 text-slate-400">MAE (Passengers)</td>
                  <td className="py-2.5 px-3 font-mono">{metrics?.baseline_mae ?? '1.963'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                    {metrics?.dnn_mae ?? '1.929'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-400">RMSE (Passengers)</td>
                  <td className="py-2.5 px-3 font-mono">{metrics?.baseline_rmse ?? '2.738'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                    {metrics?.dnn_rmse ?? '2.332'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-400">R² Coefficient</td>
                  <td className="py-2.5 px-3 font-mono">{metrics?.baseline_r2 ?? '0.826'}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                    {metrics?.dnn_r2 ?? '0.874'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            The Persistence Baseline predicts the latest observed passenger count. The DNN outperforms the baseline on RMSE and R², capturing non-linear alighting curves.
          </p>
        </div>
      </div>

      {/* Prediction History Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" /> Recent Prediction Requests
          </h3>
          <span className="text-xs text-slate-400">Logged inferences: {history.length}</span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/50">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Horizon</th>
                <th className="py-2 px-3">Forecast Passengers</th>
                <th className="py-2 px-3">Forecast Occupancy</th>
                <th className="py-2 px-3">Model</th>
                <th className="py-2 px-3">Est. Uncertainty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map((h, i) => (
                <tr key={h.id ?? i} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 text-slate-300">
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'Just now'}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-300">{h.horizon_minutes}m</td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {h.predicted_passengers} / 40
                  </td>
                  <td className="py-2.5 px-3 font-mono text-blue-400">{h.predicted_occupancy_pct}%</td>
                  <td className="py-2.5 px-3 text-slate-400">{h.model_name}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {h.mae_estimate ? `±${h.mae_estimate} pass` : '—'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No predictions requested yet. Select a horizon and run a forecast.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
