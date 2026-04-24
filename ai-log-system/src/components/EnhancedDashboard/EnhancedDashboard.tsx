import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Result, Button, Typography, Spin } from 'antd';
import {
  ReloadOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNotification } from '../../hooks/useNotification';
import { useWebSocket } from '@/services/websocket';
import { logApi, alertApi } from '@/services/api';
import DashboardTopBar from './DashboardTopBar';
import OverviewPage from './pages/OverviewPage';
import NotificationPanel from '../NotificationPanel';
import {
  SecurityEvent,
} from './types/dashboard';

const { Paragraph } = Typography;

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
    return upper === 'ERROR' ? 'HIGH' : 'LOW';
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

    setLoading(true);
    setFetchError(null);

    try {
      const [statsResult, alertsResult, recentLogsResult] = await Promise.allSettled([
        logApi.getStatistics(),
        alertApi.getUnhandledAlerts(),
        logApi.getRecentLogs(100),
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
        .slice(0, 100);
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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '70vh',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Spin size="large" style={{ color: 'white' }} />
        </div>
        <Typography.Title level={4} style={{ margin: 0 }}>加载安全监控数据...</Typography.Title>
        <Paragraph type="secondary">正在获取实时安全指标和威胁情报</Paragraph>
      </div>
    );
  }

  if (!loading && fetchError) {
    return (
      <div style={{ padding: '80px 20px' }}>
        <Result
          icon={<ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: '64px' }} />}
          title="无法连接监控系统"
          subTitle={fetchError || '请检查网络连接或系统状态'}
          extra={
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={loadInitialData}
                size="large"
                style={{ padding: '0 32px', height: '48px' }}
              >
                重新连接
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={reconnect}
                size="large"
                style={{ padding: '0 32px', height: '48px' }}
              >
                检测网络
              </Button>
              <Button
                icon={<QuestionCircleOutlined />}
                size="large"
                style={{ padding: '0 32px', height: '48px' }}
              >
                获取帮助
              </Button>
            </div>
          }
        />
      </div>
    );
  }

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
