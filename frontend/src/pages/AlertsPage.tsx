import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Bell,
  Check,
  Filter,
  ShieldAlert,
  Clock,
  Info
} from 'lucide-react';
import { AlertEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface AlertsPageProps {
  alerts: AlertEvent[];
  onAcknowledgeAlert: (id: number) => void;
  onRefresh: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onAcknowledgeAlert,
  onRefresh
}) => {
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');
  const [justAcknowledged, setJustAcknowledged] = useState<number | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unacknowledged') return !a.acknowledged;
    return true;
  });

  const handleAck = (id: number) => {
    setJustAcknowledged(id);
    onAcknowledgeAlert(id);
    setTimeout(() => setJustAcknowledged(null), 3000);
  };

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header and Threshold Policy Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Capacity Alerts & Incident Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated threshold violation detection with duplicate flood suppression.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('unacknowledged')}
            className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'unacknowledged'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            Active ({unackCount})
          </button>
        </div>
      </div>

      {/* Threshold Policies Reference Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">LOW Occupancy</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Below 40% (&lt;16 passengers)</p>
            <p className="text-[10px] text-emerald-400 mt-1">Normal operating conditions.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">MODERATE Occupancy</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">40% to 74.9% (16 to 29 passengers)</p>
            <p className="text-[10px] text-blue-400 mt-1">Balanced ridership.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">HIGH / CRITICAL Alert</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">&ge;75% (&ge;30 passengers up to 40)</p>
            <p className="text-[10px] text-rose-400 mt-1">Triggers alert. Suppressed 5 min against duplicate spam.</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">Incident Feed</h3>
          <span className="text-xs text-slate-400">Showing {filteredAlerts.length} events</span>
        </div>

        <div className="space-y-3 pt-1">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                alert.acknowledged
                  ? 'bg-slate-900/30 border-slate-800/80 text-slate-400'
                  : 'bg-rose-950/20 border-rose-800/60 text-slate-200 shadow-md'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={alert.severity} size="sm" />
                  <span className="text-xs font-semibold text-white">
                    {alert.passenger_count}/40 Seats ({alert.occupancy_pct}%)
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{alert.message}</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {alert.acknowledged ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Acknowledged
                  </span>
                ) : (
                  <button
                    onClick={() => handleAck(alert.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-xs font-semibold text-rose-200 border border-rose-500/40 transition shadow-sm"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p>No alerts in this view. Bus operations within safe thresholds.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
