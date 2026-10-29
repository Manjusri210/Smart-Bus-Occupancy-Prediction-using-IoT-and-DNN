import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Cpu,
  BarChart3,
  AlertTriangle,
  Database,
  Activity,
  Bus
} from 'lucide-react';
import { DataSourceMode } from '../types';
import { StatusBadge } from './StatusBadge';

export type PageId =
  | 'overview'
  | 'live'
  | 'prediction'
  | 'analytics'
  | 'alerts'
  | 'data'
  | 'system';

interface NavbarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  dataSourceMode: DataSourceMode;
  activeAlertsCount: number;
  modelReady: boolean;
  backendOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  dataSourceMode,
  activeAlertsCount,
  modelReady,
  backendOnline
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'live', label: 'Live Monitor', icon: <Radio className="w-4 h-4" /> },
    { id: 'prediction', label: 'AI Forecast', icon: <Cpu className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined
    },
    { id: 'data', label: 'Data Management', icon: <Database className="w-4 h-4" /> },
    { id: 'system', label: 'System & Model', icon: <Activity className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070d1e]/90 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage('overview')}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SmartBus <span className="text-blue-400 font-extrabold">AI</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-0.5">
                Occupancy Intelligence
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status Badges */}
          <div className="flex items-center space-x-3">
            {/* Source Status */}
            <div className="hidden sm:flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400">Source:</span>
              <StatusBadge status={dataSourceMode} size="sm" />
            </div>

            {/* Model Pill */}
            <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs border border-slate-800 bg-slate-900/60">
              <span className={`w-2 h-2 rounded-full ${modelReady ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-slate-300 text-[11px]">
                {modelReady ? 'DNN Ready' : 'Model Standby'}
              </span>
            </div>

            {/* Backend Heartbeat */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs border border-slate-800 bg-slate-900/60">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 text-[11px] hidden sm:inline">
                {backendOnline ? 'API Online' : 'API Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto space-x-1 pb-2 pt-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-900/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
