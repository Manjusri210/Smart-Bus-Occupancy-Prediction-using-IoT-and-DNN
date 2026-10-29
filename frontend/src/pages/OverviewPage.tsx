import React from 'react';
import {
  Users,
  Percent,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Radio,
  Cpu,
  BarChart3,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import {
  OccupancyObservation,
  PredictionResult,
  AlertEvent,
  SystemStatus
} from '../types';
import { StatCard } from '../components/StatCard';
import { OccupancyGauge } from '../components/OccupancyGauge';
import { StatusBadge } from '../components/StatusBadge';
import { PageId } from '../components/Navbar';

interface OverviewPageProps {
  currentObs: OccupancyObservation | null;
  history: OccupancyObservation[];
  latestPrediction: PredictionResult | null;
  recentAlerts: AlertEvent[];
  systemStatus: SystemStatus | null;
  onAcknowledgeAlert: (id: number) => void;
  setActivePage: (page: PageId) => void;
  onRequestPrediction: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  currentObs,
  history,
  latestPrediction,
  recentAlerts,
  systemStatus,
  onAcknowledgeAlert,
  setActivePage,
  onRequestPrediction
}) => {
  const passengers = currentObs?.passengers ?? 0;
  const occupancyPct = currentObs?.occupancy_pct ?? 0.0;
  const status = currentObs?.status ?? 'LOW';
  const entries = currentObs?.entries ?? 0;
  const exits = currentObs?.exits ?? 0;

  // Format chart data (recent 30 observations)
  const chartData = history.slice(-30).map((h, i) => ({
    name: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `t+${i * 5}s`,
    passengers: h.passengers,
    occupancy_pct: h.occupancy_pct,
    capacity: 40,
    high_threshold: 30
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if High Occupancy */}
      {status === 'HIGH' && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center justify-between text-rose-200 shadow-lg animate-pulse">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">High Capacity Warning</p>
              <p className="text-xs text-rose-300/80">
                Occupancy has reached {occupancyPct}% ({passengers}/40 passengers). Capacity limit is near.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePage('alerts')}
            className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-xs font-semibold text-rose-200 border border-rose-500/40 transition"
          >
            View Alerts
          </button>
        </div>
      )}

      {/* Primary KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Passengers"
          value={`${passengers} / 40`}
          sublabel={`Bus is at ${occupancyPct}% capacity`}
          icon={<Users className="w-5 h-5" />}
          badge={<StatusBadge status={status} size="sm" />}
          accentColor={status === 'HIGH' ? 'rose' : status === 'MODERATE' ? 'blue' : 'emerald'}
        />

        <StatCard
          title="Occupancy Percentage"
          value={`${occupancyPct}%`}
          sublabel={`Status: ${status}`}
          icon={<Percent className="w-5 h-5" />}
          accentColor="cyan"
        />

        <StatCard
          title="AI Forecast (5 min)"
          value={
            latestPrediction && !latestPrediction.error
              ? `${latestPrediction.predicted_passengers} pass`
              : 'Standby'
          }
          sublabel={
            latestPrediction && !latestPrediction.error
              ? `Est. ${latestPrediction.predicted_occupancy_pct}% (${latestPrediction.model_name})`
              : 'Click to compute AI horizon'
          }
          icon={<TrendingUp className="w-5 h-5" />}
          badge={
            <button
              onClick={onRequestPrediction}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition"
            >
              Predict
            </button>
          }
          accentColor="purple"
        />

        <StatCard
          title="Passenger Flux"
          value={`${entries} in / ${exits} out`}
          sublabel={`Net aboard: ${passengers} riders`}
          icon={<ArrowUpRight className="w-5 h-5" />}
          accentColor="amber"
        />
      </div>

      {/* Mid Section: Occupancy Gauge & Main Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Occupancy Gauge Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white tracking-wide">Live Occupancy Status</h3>
              <StatusBadge status={currentObs?.source || 'EMPTY'} size="sm" />
            </div>

            <OccupancyGauge
              passengers={passengers}
              capacity={40}
              percentage={occupancyPct}
            />

            <div className="space-y-2 mt-4 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Available Seats:</span>
                <span className="font-semibold text-white">{Math.max(0, 40 - passengers)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Elapsed Seconds:</span>
                <span className="font-mono text-slate-200">{currentObs?.time_s ?? 0}s</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Last Telemetry:</span>
                <span className="text-slate-300 text-[11px]">
                  {currentObs?.timestamp ? new Date(currentObs.timestamp).toLocaleTimeString() : 'No records yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex gap-2">
            <button
              onClick={() => setActivePage('live')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Radio className="w-3.5 h-3.5" /> Live Monitor
            </button>
            <button
              onClick={() => setActivePage('prediction')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" /> AI Prediction
            </button>
          </div>
        </div>

        {/* Right: Passenger Occupancy Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Passenger Occupancy Trajectory
              </h3>
              <p className="text-xs text-slate-400">
                Real-time passenger count vs high alert threshold (30) and capacity (40)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Count
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-0.5 bg-rose-500" /> High (30)
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="passengerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                  <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Capacity 40', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'High 75%', fill: '#f59e0b', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="passengers"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#passengerGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Database className="w-8 h-8 mb-2 opacity-40" />
                <p>No telemetry observations stored yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Import a CSV file or start live simulator.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Points displayed: {chartData.length}</span>
            <span className="font-mono text-slate-500">Max limit: 40 seats</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Observations & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Telemetry Observations */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> Recent Occupancy Observations
            </h3>
            <button
              onClick={() => setActivePage('analytics')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Analytics &rarr;
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/50">
                <tr>
                  <th className="py-2 px-3">Time (s)</th>
                  <th className="py-2 px-3">Passengers</th>
                  <th className="py-2 px-3">Occupancy</th>
                  <th className="py-2 px-3">Entries</th>
                  <th className="py-2 px-3">Exits</th>
                  <th className="py-2 px-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.slice(-5).reverse().map((item, idx) => (
                  <tr key={item.id ?? idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-300">{item.time_s}s</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{item.passengers}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-400">{item.occupancy_pct}%</td>
                    <td className="py-2.5 px-3 text-slate-400">+{item.entries}</td>
                    <td className="py-2.5 px-3 text-slate-400">-{item.exits}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.source} size="sm" />
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No observations recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Critical & High Alerts
            </h3>
            <button
              onClick={() => setActivePage('alerts')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              All Alerts &rarr;
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {recentAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex items-center justify-between transition ${
                  alert.acknowledged
                    ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                    : 'bg-rose-950/20 border-rose-800/60 text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={alert.severity} size="sm" />
                    <span className="text-[11px] text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{alert.message}</p>
                </div>

                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="ml-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition whitespace-nowrap"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}

            {recentAlerts.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active threshold alerts. Occupancy is normal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
