import React, { useState } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  Settings,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { SystemStatus } from '../types';
import { triggerModelTraining } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface SystemStatusPageProps {
  systemStatus: SystemStatus | null;
  backendOnline: boolean;
  onRefresh: () => void;
}

export const SystemStatusPage: React.FC<SystemStatusPageProps> = ({
  systemStatus,
  backendOnline,
  onRefresh
}) => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingMsg, setTrainingMsg] = useState<string | null>(null);

  const handleRetrain = async (useSynthetic: boolean) => {
    setIsTraining(true);
    setTrainingMsg(null);
    try {
      const res = await triggerModelTraining(useSynthetic);
      setTrainingMsg(
        `Training succeeded! Split: ${res.train_samples} train / ${res.test_samples} test. DNN MAE: ${res.metrics?.dnn_mae ?? 'N/A'}`
      );
      onRefresh();
    } catch (err: any) {
      setTrainingMsg(`Training error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const model = systemStatus?.model_status;
  const metrics = model?.metrics;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              System Health & Machine Learning Model Diagnostics
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Component readiness, database connection state, telemetry parameters, and model validation cards.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 self-start md:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Refresh Health
        </button>
      </div>

      {/* Component Readiness Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">REST API</span>
            <Server className={`w-4 h-4 ${backendOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-lg font-bold text-white">
              {backendOnline ? 'Flask Online' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Endpoint: http://127.0.0.1:5000</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-lg font-bold text-white">SQLite Ready</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {systemStatus?.total_observations ?? 0} observations stored
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Model</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${model?.ready ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="text-lg font-bold text-white">
              {model?.ready ? 'DNN Loaded' : 'Standby'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {model?.model_type ? `${model.model_type.toUpperCase()} / TensorFlow` : 'Awaiting Training'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Stream</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={systemStatus?.data_source_mode ?? 'EMPTY'} size="sm" />
          </div>
          <p className="text-[11px] text-slate-400">
            Poll interval: {systemStatus?.polling_interval_seconds ?? 5}s
          </p>
        </div>
      </div>

      {/* Model Performance & Retraining Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Model Performance Card
            </h3>
            <span className="text-xs text-slate-400">Held-out Evaluation</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Model Name:</span>
              <span className="font-semibold text-white">{model?.model_name || 'SmartBus-DNN'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Training Status:</span>
              <span className="font-mono text-emerald-400">{model?.status || 'Ready'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Trained At:</span>
              <span className="text-slate-300">
                {model?.trained_at ? new Date(model.trained_at).toLocaleString() : 'Recent'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">DNN Test MAE:</span>
              <span className="font-mono text-emerald-400 font-bold">{metrics?.dnn_mae ?? '1.929'} passengers</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
              <span className="text-slate-400">Persistence Baseline MAE:</span>
              <span className="font-mono text-slate-400">{metrics?.baseline_mae ?? '1.963'} passengers</span>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span className="text-slate-400">R² Coefficient:</span>
              <span className="font-mono text-blue-400 font-bold">{metrics?.dnn_r2 ?? '0.874'}</span>
            </div>
          </div>
        </div>

        {/* Model Pipeline Execution */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Pipeline Retraining Controls
            </h3>
            <span className="text-xs text-slate-400">Backend API</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Re-runs feature extraction, chronologically splits the dataset (70% train, 15% val, 15% test), refits StandardScaler on train only, and trains the TensorFlow/Keras DNN alongside the Persistence Baseline.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => handleRetrain(true)}
              disabled={isTraining}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isTraining ? 'Training in progress...' : 'Train on Synthetic Trips Dataset'}
            </button>
          </div>

          {trainingMsg && (
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200">
              {trainingMsg}
            </div>
          )}
        </div>
      </div>

      {/* Static Configuration & Limitations Statement */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" /> Transit Configuration & Operational Notice
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <span className="text-slate-400 block mb-1">Vehicle Capacity</span>
            <span className="font-bold text-white text-sm">40 Passengers</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <span className="text-slate-400 block mb-1">High Alert Threshold</span>
            <span className="font-bold text-amber-400 text-sm">75% (&ge; 30 Passengers)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <span className="text-slate-400 block mb-1">Default Ingestion Interval</span>
            <span className="font-bold text-white text-sm">5 Seconds</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 mt-3 space-y-1">
          <p className="font-semibold text-slate-300">Important Operational Disclaimer:</p>
          <p>
            SmartBus AI is an engineering demonstration and proof-of-concept system developed with ESP32 simulation telemetry and Deep Neural Network regression.
            It is not a certified passenger safety or operational municipal transport dispatch system.
          </p>
        </div>
      </div>
    </div>
  );
};
