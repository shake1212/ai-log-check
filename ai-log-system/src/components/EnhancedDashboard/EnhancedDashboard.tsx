import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useWebSocket } from '@/services/websocket';
import { logApi, alertApi } from '@/services/api';
import DashboardTopBar from './DashboardTopBar';
import OverviewPage from './pages/OverviewPage';
import NotificationPanel from '../NotificationPanel';
import {
  SecurityEvent,
} from './types/dashboard';

const EnhancedDashboard: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [eventLoading, setEventLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const { unreadCount } = useNotification();

  const {
    connected,
    logs: socketLogs,
    alerts: socketAlerts,
    statistics,
    reconnect,
  } = useWebSocket();

  const normalizeLevel = useCallback((level?: string): SecurityEvent['level'] => {
    const upper = (level || '').toUpperCase();
    if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
      return upper as SecurityEvent['level'];
    }
    if (upper === 'ERROR') return 'HIGH';
    if (upper === 'WARN' || upper === 'WARNING') return 'MEDIUM';
    return 'LOW';
  }, []);

  const hydrateFromSocket = useCallback(() => {
    if (!isMounted.current || isPaused) return;

    const socketAlertEvents: SecurityEvent[] = (socketAlerts || []).map(alert => ({
      id: `alert-${alert.id}`,
      timestamp: alert.createdTime,
      level: normalizeLevel(alert.alertLevel),
      type: alert.alertType,
      message: alert.description,
      status: alert.handled ? 'RESOLVED' : 'NEW',
      tags: alert.eventData ? [alert.eventData] : [],
    }));

    const socketLogEvents: SecurityEvent[] = (socketLogs || []).map((log: any) => ({
      id: `log-${log.id ?? `${log.eventId}-${log.eventTime}`}`,
      timestamp: log.eventTime || new Date().toISOString(),
      level: normalizeLevel(log.threatLevel || log.level),
      type: `事件ID ${log.eventId ?? 'UNKNOWN'}`,
      message: log.rawMessage || log.normalizedMessage || '实时日志事件',
      status: 'NEW',
      tags: ['日志'],
    }));

    const mergedSocketEvents = [...socketAlertEvents, ...socketLogEvents];
    if (mergedSocketEvents.length > 0) {
      const mapped: SecurityEvent[] = mergedSocketEvents.map(alert => ({
        id: `${alert.id}`,
        timestamp: alert.timestamp,
        level: alert.level,
        type: alert.alertType,
        message: alert.message,
        status: alert.status,
        tags: alert.tags || [],
      }));

      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newItems = mapped.filter(e => !existingIds.has(e.id));
        return [...newItems, ...prev].slice(0, 50);
      });
      setEventLoading(false);
    }

    if (statistics) {
      setLoading(false);
    }
  }, [socketAlerts, socketLogs, statistics, isPaused, normalizeLevel]);

  useEffect(() => {
    hydrateFromSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketLogs, socketAlerts]);

  const loadInitialData = useCallback(async () => {
    if (!isMounted.current) return;

    const startTime = performance.now();
    setLoading(true);
    setFetchError(null);

    try {
      // 减少初始加载数据量：从100条减少到20条
      const [statsResult, alertsResult, recentLogsResult] = await Promise.allSettled([
        logApi.getStatistics(),
        alertApi.getUnhandledAlerts(),
        logApi.getRecentLogs(20),  // 从100减少到20
      ]);

      if (!isMounted.current) return;

      const alertsRes = alertsResult.status === 'fulfilled' ? alertsResult.value : null;
      const recentLogsRes = recentLogsResult.status === 'fulfilled' ? recentLogsResult.value : null;

      const alertPayload = (alertsRes?.data || alertsRes || []) as any[];
      const logPayload = (recentLogsRes?.data || recentLogsRes || []) as any[];

      const mappedAlerts: SecurityEvent[] = alertPayload.map((alert: any) => ({
        id: `alert-${alert.id}`,
        timestamp: alert.createdTime,
        level: normalizeLevel(alert.alertLevel),
        type: alert.alertType,
        message: alert.description,
        status: alert.handled ? 'RESOLVED' : 'NEW',
        tags: alert.eventData ? [alert.eventData] : [],
      }));

      const mappedLogs: SecurityEvent[] = logPayload.map((log: any) => ({
        id: `log-${log.id ?? `${log.eventId}-${log.eventTime}`}`,
        timestamp: log.eventTime || new Date().toISOString(),
        level: normalizeLevel(log.threatLevel || log.level),
        type: `事件ID ${log.eventId ?? 'UNKNOWN'}`,
        message: log.rawMessage || log.normalizedMessage || '日志事件',
        status: 'NEW',
        tags: ['日志'],
      }));

      const merged = [...mappedAlerts, ...mappedLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);  // 从100减少到50
      setEvents(merged);
      setEventLoading(false);

      const allFailed =
        statsResult.status === 'rejected' &&
        alertsResult.status === 'rejected' &&
        recentLogsResult.status === 'rejected';
      if (allFailed && merged.length === 0) {
        setFetchError('获取实时数据失败，请稍后重试');
      } else {
        setFetchError(null);
      }

      // 性能监控日志
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      console.log(`✅ 仪表盘数据加载完成，耗时: ${loadTime}ms`);
      console.log(`📊 加载数据: ${mappedAlerts.length}条告警, ${mappedLogs.length}条日志`);
    } catch (error) {
      if (!isMounted.current) return;
      console.error('加载实时数据失败', error);
      setFetchError('获取实时数据失败，请稍后重试');
    } finally {
      if (!isMounted.current) return;
      setLoading(false);
    }
  }, [normalizeLevel]);

  useEffect(() => {
    isMounted.current = true;
    loadInitialData();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventStats = useMemo(() => events.reduce((acc, e) => {
    acc.total += 1;
    if (e.level === 'CRITICAL') acc.critical += 1;
    else if (e.level === 'HIGH') acc.high += 1;
    else if (e.level === 'MEDIUM') acc.medium += 1;
    else if (e.level === 'LOW') acc.low += 1;
    if (e.status === 'NEW') acc.newEvents += 1;
    else if (e.status === 'INVESTIGATING') acc.investigating += 1;
    return acc;
  }, { total: 0, critical: 0, high: 0, medium: 0, low: 0, newEvents: 0, investigating: 0 }), [events]);

  const hasCriticalAlert = useMemo(() => eventStats.critical >= 3, [eventStats.critical]);

  if (!isMounted.current) return null;

  return (
    <div>
      <DashboardTopBar
        connected={connected}
        reconnect={reconnect}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        unreadCount={unreadCount}
        notificationPanelVisible={notificationPanelVisible}
        setNotificationPanelVisible={setNotificationPanelVisible}
      />

      <div style={{
        padding: '32px',
        maxWidth: '1600px',
        margin: '0 auto',
        position: 'relative'
      }}>
        <NotificationPanel
          visible={notificationPanelVisible}
          onClose={() => setNotificationPanelVisible(false)}
        />

        <OverviewPage
          isPaused={isPaused}
          hasCriticalAlert={hasCriticalAlert}
          eventStats={eventStats}
          events={events}
          eventLoading={eventLoading}
          eventFilter={eventFilter}
          setEventFilter={setEventFilter}
          loadInitialData={loadInitialData}
          reconnect={reconnect}
          fetchError={fetchError}
        />
      </div>
    </div>
  );
};

export default EnhancedDashboard;
