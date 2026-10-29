import React, { useState } from 'react';
import {
  Radio,
  UserPlus,
  UserMinus,
  RefreshCw,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
  Sliders,
  Bus
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { OccupancyObservation, DataSourceMode } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { simulatePassenger } from '../services/api';

interface LiveMonitoringPageProps {
  currentObs: OccupancyObservation | null;
  history: OccupancyObservation[];
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
  isPolling: boolean;
  setIsPolling: (polling: boolean) => void;
  lastUpdate: Date | null;
  dataSourceMode: DataSourceMode;
  backendOnline: boolean;
  onRefresh: () => void;
  onSimulatedChange: () => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  currentObs,
  history,
  pollingInterval,
  setPollingInterval,
  isPolling,
  setIsPolling,
  lastUpdate,
  dataSourceMode,
  backendOnline,
  onRefresh,
  onSimulatedChange
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const passengers = currentObs?.passengers ?? 0;
  const occupancyPct = currentObs?.occupancy_pct ?? 0.0;
  const status = currentObs?.status ?? 'LOW';

  // Check if data is stale (> 30s since update)
  const isStale = lastUpdate && Date.now() - lastUpdate.getTime() > 30000;

  const handleSimulate = async (action: 'entry' | 'exit') => {
    setActionError(null);
    setIsSimulating(true);
    try {
      await simulatePassenger(action);
      onSimulatedChange();
    } catch (err: any) {
      setActionError(err.message || `Failed to simulate passenger ${action}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const chartData = history.slice(-40).map((h, i) => ({
    time: h.timestamp
      ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : `${h.time_s}s`,
    passengers: h.passengers,
    occupancy_pct: h.occupancy_pct
  }));

  return (
    <div className="space-y-6">
      {/* Page Header and Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Live Occupancy Telemetry Monitor
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed streaming from ESP32 Wokwi simulation / backend bridge.
          </p>
        </div>

        {/* Polling Rate & Manual Refresh Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60">
            <Sliders className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <span className="text-xs text-slate-400 px-1">Poll:</span>
            {[2, 5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setPollingInterval(sec)}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${
                  pollingInterval === sec
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              isPolling
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/50'
            }`}
          >
            {isPolling ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isPolling ? 'Live Active' : 'Polling Paused'}
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Disconnection or Stale Warning */}
      {(!backendOnline || isStale) && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-center gap-3 text-amber-300 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
          <div className="text-xs">
            <span className="font-semibold">
              {!backendOnline ? 'Backend Disconnected: ' : 'Stale Data Detected: '}
            </span>
            {!backendOnline
              ? 'Cannot reach Python Flask API at 127.0.0.1:5000. Ensure server is running.'
              : `Last observation received at ${lastUpdate?.toLocaleTimeString() ?? 'unknown'}. No fresh hardware telemetry in the last 30 seconds.`}
          </div>
        </div>
      )}

      {/* Main Grid: Left Controls & Status, Right Live Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Current Status & Manual Testing */}
        <div className="space-y-6">
          {/* Real-time Status Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Current State</span>
              <StatusBadge status={dataSourceMode} size="sm" />
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-4xl font-extrabold text-white tracking-tight">{passengers}</span>
                <span className="text-slate-400 text-lg font-medium ml-1">/ 40</span>
              </div>
              <StatusBadge status={status} size="md" />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Occupancy</span>
                <span className="font-semibold text-white">{occupancyPct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    occupancyPct >= 75
                      ? 'bg-rose-500'
                      : occupancyPct >= 40
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, occupancyPct))}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Total Entries:</span>
                <span className="font-mono text-emerald-400">+{currentObs?.entries ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Total Exits:</span>
                <span className="font-mono text-rose-400">-{currentObs?.exits ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Elapsed Seconds:</span>
                <span className="font-mono text-slate-300">{currentObs?.time_s ?? 0}s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Last Poll:</span>
                <span className="text-slate-400">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation / Test Control */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bus className="w-4 h-4 text-blue-400" /> Interactive Test Controls
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulate passenger boarding and alighting to test capacity enforcement (0 to 40) and instant alert generation.
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
                {actionError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSimulate('entry')}
                disabled={isSimulating || passengers >= 40}
                className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" /> Board (+1)
              </button>

              <button
                onClick={() => handleSimulate('exit')}
                disabled={isSimulating || passengers <= 0}
                className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserMinus className="w-4 h-4" /> Alight (-1)
              </button>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              Note: This dashboard uses polling-based ingestion. To feed data directly from your Wokwi simulation, run the provided serial bridge script.
            </div>
          </div>
        </div>

        {/* Right Column: Continuously Updating Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Continuous Telemetry Stream</h3>
                <p className="text-xs text-slate-400">Latest 40 polling samples over time</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Stream
              </span>
            </div>

            <div className="h-80 sm:h-96 w-full mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 42]} stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Cap 40', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alert 30', fill: '#f59e0b', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="passengers"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Awaiting observations...
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
            <span>Interval: every {pollingInterval}s</span>
            <span>Total points in memory: {history.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
