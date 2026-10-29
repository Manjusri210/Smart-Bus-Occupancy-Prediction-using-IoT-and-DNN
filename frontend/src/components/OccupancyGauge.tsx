import React from 'react';

interface OccupancyGaugeProps {
  passengers: number;
  capacity?: number;
  percentage: number;
}

export const OccupancyGauge: React.FC<OccupancyGaugeProps> = ({
  passengers,
  capacity = 40,
  percentage
}) => {
  // Clamped percentage for visual rendering
  const clampedPct = Math.max(0, Math.min(100, percentage));

  // Determine color theme based on status
  let strokeColor = '#10b981'; // LOW: emerald
  let statusText = 'Low Occupancy';
  let badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (clampedPct >= 75) {
    strokeColor = '#f43f5e'; // HIGH: rose
    statusText = 'High Occupancy';
    badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (clampedPct >= 40) {
    strokeColor = '#3b82f6'; // MODERATE: blue
    statusText = 'Moderate Occupancy';
    badgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  }

  // Semi-circle SVG gauge calculation
  const radius = 80;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-48 h-28 flex items-end justify-center">
        <svg className="w-48 h-28 overflow-visible" viewBox="0 0 200 110">
          {/* Background track arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Active occupancy arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {Math.round(clampedPct)}%
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {passengers} / {capacity} seats
          </span>
        </div>
      </div>

      <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
        {statusText}
      </div>
    </div>
  );
};
