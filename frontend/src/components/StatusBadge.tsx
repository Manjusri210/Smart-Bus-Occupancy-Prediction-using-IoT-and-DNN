import React from 'react';
import { OccupancyStatus, DataSourceMode, AlertSeverity } from '../types';

interface StatusBadgeProps {
  status: OccupancyStatus | DataSourceMode | AlertSeverity | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (s === 'LOW') {
    colorClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
  } else if (s === 'MODERATE') {
    colorClasses = 'bg-blue-950/60 text-blue-300 border-blue-800/80';
  } else if (s === 'HIGH') {
    colorClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
  } else if (s === 'CRITICAL') {
    colorClasses = 'bg-rose-950/70 text-rose-300 border-rose-800 animate-pulse';
  } else if (s === 'LIVE') {
    colorClasses = 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60';
  } else if (s === 'CSV') {
    colorClasses = 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60';
  } else if (s === 'DEMO') {
    colorClasses = 'bg-amber-900/40 text-amber-300 border-amber-700/60';
  } else if (s === 'EMPTY') {
    colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {s}
    </span>
  );
};
