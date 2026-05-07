import { useState, useEffect, useCallback, useRef } from 'react';
import { eventApi, analysisApi, logApi } from '@/services/api';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

export interface KpiData {
  systemHealth: number;
  uptime: number;
  latency: number;
  totalLogs: number;
  todayLogs: number;
  throughput: number;
  storageUsed: number;
  storageTotal: number;
  anomalyCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unhandledAlerts: number;
  activeUsers: number;
  currentConnections: number;
  activeSessions: number;
  lastUpdate: string;
}

const DEFAULT_KPI_DATA: KpiData = {
  systemHealth: 0,
  uptime: 0,
  latency: 0,
  totalLogs: 0,
  todayLogs: 0,
  throughput: 0,
  storageUsed: 0,
  storageTotal: 0,
  anomalyCount: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  unhandledAlerts: 0,
  activeUsers: 0,
  currentConnections: 0,
  activeSessions: 0,
  lastUpdate: '',
};

const mergeStatsIntoKpi = (kpi: KpiData, stats: any): KpiData => {
  const severityCounts = stats?.severityCounts || stats?.levelCounts || {};
  return {
    ...kpi,
    totalLogs: stats?.totalLogs || kpi.totalLogs,
    todayLogs: stats?.todayLogs || kpi.todayLogs,
    anomalyCount: stats?.anomalyCount ?? kpi.anomalyCount,
    unhandledAlerts: stats?.unhandledAlerts ?? kpi.unhandledAlerts,
    criticalCount: severityCounts.CRITICAL || kpi.criticalCount,
    highCount: severityCounts.HIGH || kpi.highCount,
    mediumCount: severityCounts.MEDIUM || kpi.mediumCount,
    lowCount: severityCounts.LOW || kpi.lowCount,
    activeUsers: stats?.activeUsers || kpi.activeUsers,
    currentConnections: stats?.currentConnections || kpi.currentConnections,
    lastUpdate: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

export const useKpiData = (isPaused: boolean) => {
  const [data, setData] = useState<KpiData>(DEFAULT_KPI_DATA);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { statistics, subscribe, status: wsStatus } = useWebSocketContext();

  // 首次加载：一次性 REST 获取全部 KPI 数据
  const fetchInitialData = useCallback(async () => {
    if (!isMountedRef.current || isPaused) return;

    setLoading(true);
    try {
      const [statsRes, metricsRes, dashboardRes, realTimeRes] = await Promise.allSettled([
        logApi.getStatistics(),
        analysisApi.getSystemMetrics(),
        eventApi.getDashboardStats(),
        eventApi.getRealTimeStats(),
      ]);

      if (!isMountedRef.current) return;

      const stats = statsRes.status === 'fulfilled' ? (statsRes.value?.data || statsRes.value) : null;
      const metrics = metricsRes.status === 'fulfilled' ? (metricsRes.value?.data || metricsRes.value) : null;
      const dashboardStats = dashboardRes.status === 'fulfilled' ? (dashboardRes.value?.data || dashboardRes.value || {}) : {};
      const realTime = realTimeRes.status === 'fulfilled' ? (realTimeRes.value?.data || realTimeRes.value) : null;

      const severityCounts = dashboardStats?.severityCounts || dashboardStats?.levelCounts || {};

      setData({
        systemHealth: Math.min(100, Math.max(0, metrics?.systemHealth || realTime?.systemHealth || 0)),
        uptime: metrics?.uptime || 0,
        latency: metrics?.latency || realTime?.responseTime || 0,
        totalLogs: dashboardStats?.totalLogs || stats?.totalLogs || 0,
        todayLogs: dashboardStats?.todayLogs || stats?.todayLogs || 0,
        throughput: metrics?.throughput?.normal || 0,
        storageUsed: (metrics?.storageUsed || 0) / 1024,
        storageTotal: (metrics?.storageTotal || 0) / 1024,
        anomalyCount: dashboardStats?.anomalyCount ?? stats?.securityEvents ?? stats?.anomalyCount ?? 0,
        criticalCount: severityCounts.CRITICAL || 0,
        highCount: severityCounts.HIGH || 0,
        mediumCount: severityCounts.MEDIUM || 0,
        lowCount: severityCounts.LOW || 0,
        unhandledAlerts: stats?.unhandledAlerts ?? 0,
        activeUsers: stats?.activeUsers || metrics?.activeUsers || 0,
        currentConnections: metrics?.currentConnections || 0,
        activeSessions: metrics?.activeSessions || 0,
        lastUpdate: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } catch {
      // 保留默认数据
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [isPaused]);

  // 首次加载只调一次
  useEffect(() => {
    isMountedRef.current = true;
    fetchInitialData();
    return () => { isMountedRef.current = false; };
  }, [fetchInitialData]);

  // WebSocket STATS 推送直接合并到 KPI，无需 REST 刷新
  useEffect(() => {
    if (!statistics || isPaused) return;
    setData(prev => mergeStatsIntoKpi(prev, statistics));
  }, [statistics, isPaused]);

  // 定时轻量刷新（5分钟一次，仅作为 WS 断线时的兜底）
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (wsStatus !== 'OPEN' && isMountedRef.current) {
        fetchInitialData();
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [isPaused, wsStatus, fetchInitialData]);

  return { data, loading, refresh: fetchInitialData };
};
