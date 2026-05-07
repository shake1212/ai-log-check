import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { logApi, alertApi } from '@/services/api';
import DashboardTopBar from './DashboardTopBar';
import OverviewPage from './pages/OverviewPage';
import NotificationPanel from '../NotificationPanel';
import { SecurityEvent } from './types/dashboard';

const wsEventToSecurityEvent = (wsEvent: any): SecurityEvent | null => {
  const d = wsEvent.data;
  if (wsEvent.type === 'ALERT' && d?.alertLevel) {
    return {
      id: `alert-${d.id || wsEvent.id}`,
      timestamp: d.createdTime || new Date(wsEvent.ts).toISOString(),
      level: normalizeLevel(d.alertLevel),
      type: d.alertType,
      message: d.description,
      status: 'NEW',
      tags: [],
    };
  }
  if (wsEvent.type === 'LOG') {
    const log = d?.log || d;
    if (log?.eventId || log?.id) {
      return {
        id: `log-${log.id ?? `${log.eventId}-${wsEvent.ts}`}`,
        timestamp: log.eventTime || new Date(wsEvent.ts).toISOString(),
        level: normalizeLevel(log.threatLevel || log.level),
        type: `事件ID ${log.eventId ?? 'UNKNOWN'}`,
        message: log.rawMessage || log.normalizedMessage || '实时日志事件',
        status: 'NEW',
        tags: ['日志'],
      };
    }
  }
  return null;
};

function normalizeLevel(level?: string): SecurityEvent['level'] {
  const upper = (level || '').toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
    return upper as SecurityEvent['level'];
  }
  if (upper === 'ERROR') return 'HIGH';
  if (upper === 'WARN' || upper === 'WARNING') return 'MEDIUM';
  return 'LOW';
}

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
    status: wsStatus,
    events: wsEvents,
    reconnect,
  } = useWebSocketContext();

  const connected = wsStatus === 'OPEN';

  // 首次加载：一次性 REST 获取初始事件列表
  const loadInitialData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoading(true);
    setFetchError(null);

    try {
      const [alertsResult, recentLogsResult] = await Promise.allSettled([
        alertApi.getUnhandledAlerts(),
        logApi.getRecentLogs(20),
      ]);

      if (!isMounted.current) return;

      const alertsRes = alertsResult.status === 'fulfilled' ? alertsResult.value : null;
      const recentLogsRes = recentLogsResult.status === 'fulfilled' ? recentLogsResult.value : null;

      const alertPayload = (alertsRes?.data || alertsRes || []) as any[];
      const logPayload = (recentLogsRes?.data || recentLogsRes || []) as any[];

      const mappedAlerts: SecurityEvent[] = alertPayload.map((a: any) => ({
        id: `alert-${a.id}`,
        timestamp: a.createdTime,
        level: normalizeLevel(a.alertLevel),
        type: a.alertType,
        message: a.description,
        status: a.handled ? 'RESOLVED' : 'NEW',
        tags: a.eventData ? [a.eventData] : [],
      }));

      const mappedLogs: SecurityEvent[] = logPayload.map((l: any) => ({
        id: `log-${l.id ?? `${l.eventId}-${l.eventTime}`}`,
        timestamp: l.eventTime || new Date().toISOString(),
        level: normalizeLevel(l.threatLevel || l.level),
        type: `事件ID ${l.eventId ?? 'UNKNOWN'}`,
        message: l.rawMessage || l.normalizedMessage || '日志事件',
        status: 'NEW',
        tags: ['日志'],
      }));

      const merged = [...mappedAlerts, ...mappedLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

      setEvents(merged);
      setEventLoading(false);

      const allFailed = alertsResult.status === 'rejected' && recentLogsResult.status === 'rejected';
      if (allFailed && merged.length === 0) {
        setFetchError('获取实时数据失败，请稍后重试');
      }
    } catch {
      setFetchError('获取实时数据失败，请稍后重试');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    isMounted.current = true;
    loadInitialData();
    return () => { isMounted.current = false; };
  }, [loadInitialData]);

  // WebSocket events 变化时，将新的 WSEvent 合并到 SecurityEvent 列表
  useEffect(() => {
    if (!wsEvents.length || isPaused) return;

    setEvents(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      let updated = prev;

      for (let i = 0; i < wsEvents.length; i++) {
        const se = wsEventToSecurityEvent(wsEvents[i]);
        if (se && !existingIds.has(se.id)) {
          updated = [se, ...updated];
          existingIds.add(se.id);
        }
      }

      return updated.slice(0, 50);
    });

    setEventLoading(false);
    setLoading(false);
  }, [wsEvents, isPaused]);

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
        wsStatus={wsStatus}
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
