import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Users,
  PieChart as PieIcon,
  Filter,
  Calendar,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AnalyticsSummary, OccupancyObservation } from '../types';
import { fetchAnalytics } from '../services/api';
import { StatCard } from '../components/StatCard';

interface AnalyticsPageProps {
  history: OccupancyObservation[];
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ history }) => {
  const [timeFilter, setTimeFilter] = useState<number | undefined>(undefined);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeFilter]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnalytics(timeFilter);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Occupancy Distribution Pie Data
  const distributionData = [
    { name: 'Low (<40%)', value: summary?.low_count ?? 0, color: '#10b981' },
    { name: 'Moderate (40-75%)', value: summary?.moderate_count ?? 0, color: '#3b82f6' },
    { name: 'High (>=75%)', value: summary?.high_count ?? 0, color: '#f43f5e' }
  ].filter(d => d.value > 0);

  // Time-series chart data (downsampled for readability if large)
  const sampledHistory = history.length > 60
    ? history.filter((_, idx) => idx % Math.ceil(history.length / 60) === 0)
    : history;

  const timeseriesData = sampledHistory.map((h, i) => ({
    time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${h.time_s}s`,
    passengers: h.passengers,
    occupancy_pct: h.occupancy_pct,
    entries: h.entries,
    exits: h.exits
  }));

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Historical Occupancy Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate transit metrics, distribution profiles, and passenger flux analysis.
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <span className="text-xs text-slate-400 px-1">Window:</span>
          {[
            { label: '1 Hour', hours: 1 },
            { label: '6 Hours', hours: 6 },
            { label: '24 Hours', hours: 24 },
            { label: 'All Time', hours: undefined }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setTimeFilter(item.hours)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                timeFilter === item.hours
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Peak Observed Passengers"
          value={`${summary?.peak_passengers ?? 0} / 40`}
          sublabel={`Peak occupancy: ${summary?.peak_occupancy_pct ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="rose"
        />

        <StatCard
          title="Average Occupancy"
          value={`${summary?.avg_occupancy_pct ?? 0}%`}
          sublabel={`Average riders: ${summary?.avg_passengers ?? 0} passengers`}
          icon={<Percent className="w-5 h-5" />}
          accentColor="cyan"
        />

        <StatCard
          title="Total Observations"
          value={summary?.total_observations ?? 0}
          sublabel={`From ${history.length} telemetry points recorded`}
          icon={<Database className="w-5 h-5" />}
          accentColor="blue"
        />

        <StatCard
          title="Boarding vs Alighting"
          value={`${summary?.total_entries ?? 0} / ${summary?.total_exits ?? 0}`}
          sublabel="Cumulative entries vs exits"
          icon={<Users className="w-5 h-5" />}
          accentColor="emerald"
        />
      </div>

      {/* Charts Section: Occupancy Distribution & Passenger Flux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Category Distribution */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white pb-3 border-b border-slate-800 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" /> Occupancy Distribution
            </h3>

            <div className="h-56 w-full mt-2 flex items-center justify-center">
              {distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-xs">No data for distribution</div>
              )}
            </div>

            {/* Distribution Legend & Breakdown */}
            <div className="space-y-2 mt-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low (&lt;40%):
                </span>
                <span className="font-semibold text-white">{summary?.low_pct ?? 0}% ({summary?.low_count ?? 0})</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Moderate (40-75%):
                </span>
                <span className="font-semibold text-white">{summary?.moderate_pct ?? 0}% ({summary?.moderate_count ?? 0})</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High (&ge;75%):
                </span>
                <span className="font-semibold text-white">{summary?.high_pct ?? 0}% ({summary?.high_count ?? 0})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Series: Occupancy Trend */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Occupancy Percentage Trend</h3>
              <span className="text-xs text-slate-400">Observed Values</span>
            </div>

            <div className="h-64 sm:h-72 w-full mt-4">
              {timeseriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeseriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pctGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 105]} stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="occupancy_pct"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pctGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No time-series data available.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
            <span>Range: {summary?.first_timestamp ? new Date(summary.first_timestamp).toLocaleDateString() : '—'}</span>
            <span>Sampling: downsampled to {timeseriesData.length} view intervals</span>
          </div>
        </div>
      </div>

      {/* Entry and Exit Cumulative Chart */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Passenger Flow: Boarding vs Alighting</h3>
            <p className="text-xs text-slate-400">Cumulative entries and exits over observation sequence</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entries
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Exits
            </span>
          </div>
        </div>

        <div className="h-64 w-full mt-4">
          {timeseriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="entries" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="exits" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No flow data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
