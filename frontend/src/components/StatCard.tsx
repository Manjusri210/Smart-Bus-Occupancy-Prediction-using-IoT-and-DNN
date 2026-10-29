import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  accentColor?: 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  sublabel,
  icon,
  badge,
  accentColor = 'blue'
}) => {
  const borderAccents = {
    blue: 'hover:border-blue-500/50',
    cyan: 'hover:border-cyan-500/50',
    emerald: 'hover:border-emerald-500/50',
    amber: 'hover:border-amber-500/50',
    rose: 'hover:border-rose-500/50',
    purple: 'hover:border-purple-500/50'
  };

  const iconColors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <div className={`relative bg-slate-900/80 backdrop-blur-md rounded-xl p-5 border border-slate-800 transition-all duration-200 shadow-lg ${borderAccents[accentColor]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg border ${iconColors[accentColor]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
        {badge && <div>{badge}</div>}
      </div>
      {sublabel && (
        <div className="mt-2 text-xs text-slate-400 truncate">{sublabel}</div>
      )}
    </div>
  );
};
