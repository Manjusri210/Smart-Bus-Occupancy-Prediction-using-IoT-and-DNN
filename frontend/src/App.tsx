import React, { useState, useEffect, useRef } from 'react';
import {
  Navbar,
  PageId
} from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { PredictionPage } from './pages/PredictionPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AlertsPage } from './pages/AlertsPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { SystemStatusPage } from './pages/SystemStatusPage';

import {
  OccupancyObservation,
  PredictionResult,
  AlertEvent,
  SystemStatus,
  DataSourceMode
} from './types';

import {
  fetchStatus,
  fetchCurrentOccupancy,
  fetchOccupancyHistory,
  fetchAlerts,
  acknowledgeAlert,
  requestPrediction
} from './services/api';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [currentObs, setCurrentObs] = useState<OccupancyObservation | null>(null);
  const [history, setHistory] = useState<OccupancyObservation[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertEvent[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<PredictionResult | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const [pollingInterval, setPollingInterval] = useState<number>(5);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  const timerRef = useRef<any>(null);

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, []);

  // Polling cycle
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPolling) {
      timerRef.current = setInterval(() => {
        pollTick();
      }, pollingInterval * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollingInterval, isPolling]);

  const pollTick = async () => {
    try {
      const [obs, alertsData] = await Promise.all([
        fetchCurrentOccupancy(),
        fetchAlerts('all')
      ]);

      setCurrentObs(obs);
      setRecentAlerts(alertsData);
      setLastUpdate(new Date());
      setBackendOnline(true);

      // Append to local history buffer if new observation ID or time
      setHistory((prev) => {
        if (!obs || obs.is_empty) return prev;
        const exists = prev.some((p) => p.id === obs.id);
        if (!exists && obs.id) {
          return [...prev.slice(-99), obs];
        }
        return prev;
      });
    } catch (err) {
      console.warn('Poll tick failed:', err);
      setBackendOnline(false);
    }
  };

  const refreshAllData = async () => {
    try {
      const [status, obs, hist, alertsData] = await Promise.all([
        fetchStatus(),
        fetchCurrentOccupancy(),
        fetchOccupancyHistory(100),
        fetchAlerts('all')
      ]);

      setSystemStatus(status);
      setCurrentObs(obs);
      setHistory(hist);
      setRecentAlerts(alertsData);
      setLastUpdate(new Date());
      setBackendOnline(true);
    } catch (err) {
      console.error('Initial refresh failed:', err);
      setBackendOnline(false);
    }
  };

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setRecentAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleRequestPrediction = async () => {
    try {
      const result = await requestPrediction(5, currentObs?.passengers);
      setLatestPrediction(result);
    } catch (err) {
      console.error('Prediction request error:', err);
    }
  };

  const dataSourceMode: DataSourceMode = systemStatus?.data_source_mode || (currentObs?.source ? (currentObs.source.toUpperCase() as DataSourceMode) : 'EMPTY');
  const activeAlertsCount = recentAlerts.filter((a) => !a.acknowledged).length;
  const isModelReady = systemStatus?.model_status?.ready ?? false;

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        dataSourceMode={dataSourceMode}
        activeAlertsCount={activeAlertsCount}
        modelReady={isModelReady}
        backendOnline={backendOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activePage === 'overview' && (
          <OverviewPage
            currentObs={currentObs}
            history={history}
            latestPrediction={latestPrediction}
            recentAlerts={recentAlerts}
            systemStatus={systemStatus}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            setActivePage={setActivePage}
            onRequestPrediction={handleRequestPrediction}
          />
        )}

        {activePage === 'live' && (
          <LiveMonitoringPage
            currentObs={currentObs}
            history={history}
            pollingInterval={pollingInterval}
            setPollingInterval={setPollingInterval}
            isPolling={isPolling}
            setIsPolling={setIsPolling}
            lastUpdate={lastUpdate}
            dataSourceMode={dataSourceMode}
            backendOnline={backendOnline}
            onRefresh={pollTick}
            onSimulatedChange={pollTick}
          />
        )}

        {activePage === 'prediction' && (
          <PredictionPage
            currentObs={currentObs}
            systemStatus={systemStatus}
            onRefreshStatus={refreshAllData}
          />
        )}

        {activePage === 'analytics' && (
          <AnalyticsPage history={history} />
        )}

        {activePage === 'alerts' && (
          <AlertsPage
            alerts={recentAlerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onRefresh={refreshAllData}
          />
        )}

        {activePage === 'data' && (
          <DataManagementPage onDataImported={refreshAllData} />
        )}

        {activePage === 'system' && (
          <SystemStatusPage
            systemStatus={systemStatus}
            backendOnline={backendOnline}
            onRefresh={refreshAllData}
          />
        )}
      </main>

      {/* Modern Dark Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#070d1e]/80 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-400">SmartBus AI</span> &mdash; Intelligent Bus Occupancy Prediction and Monitoring System
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>ESP32 Wokwi Simulation</span>
            <span>&bull;</span>
            <span>Deep Neural Network (DNN)</span>
            <span>&bull;</span>
            <span>Flask REST API</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
