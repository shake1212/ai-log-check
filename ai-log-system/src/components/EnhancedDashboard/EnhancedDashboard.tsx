import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Result, Button, Typography, Spin, Badge } from 'antd';
import {
  ReloadOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNotification } from '../../hooks/useNotification';
import { useWebSocket } from '@/services/websocket';
import { logApi, alertApi } from '@/services/api';
import DashboardHeader from './DashboardHeader';
import ControlBar from './ControlBar';
import OverviewPage from './pages/OverviewPage';
import AnalysisPage from './pages/AnalysisPage';
import ThreatPage from './pages/ThreatPage';
import NotificationPanel from '../NotificationPanel';
import { 
  SecurityEvent,
  EVENT_LEVELS
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
  const [activeTab, setActiveTab] = useState('overview');
  
  const isMounted = useRef(true);
  const { unreadCount } = useNotification();

  const {
    connected,
    logs: socketLogs,
    alerts: socketAlerts,
    statistics,
    reconnect,
  } = useWebSocket();

  const hydrateFromSocket = useCallback(() => {
    if (!isMounted.current || isPaused) return;

    if (socketAlerts && socketAlerts.length > 0) {
      const mapped: SecurityEvent[] = socketAlerts.map(alert => ({
        id: `${alert.id}`,
        timestamp: alert.createdTime,
        level: alert.alertLevel,
        type: alert.alertType,
        message: alert.description,
        status: alert.handled ? 'RESOLVED' : 'NEW',
        tags: alert.eventData ? [alert.eventData] : [],
      }));

      setEvents(prev => {
        const merged = [...mapped, ...prev];
        return merged.slice(0, 100);
      });
      setEventLoading(false);
    }

    if (statistics) {
      setLoading(false);
    }
  }, [socketAlerts, statistics, isPaused]);

  useEffect(() => {
    hydrateFromSocket();
  }, [hydrateFromSocket]);

  const loadInitialData = useCallback(async () => {
    if (!isMounted.current) {
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const [statsRes, alertsRes] = await Promise.all([
        logApi.getStatistics(),
        alertApi.getUnhandledAlerts(),
      ]);

      if (!isMounted.current) {
        return;
      }

      const alertPayload = (alertsRes?.data || alertsRes || []) as any[];
      const mappedAlerts: SecurityEvent[] = alertPayload.map(alert => ({
        id: `${alert.id}`,
        timestamp: alert.createdTime,
        level: alert.alertLevel,
        type: alert.alertType,
        message: alert.description,
        status: alert.handled ? 'RESOLVED' : 'NEW',
        tags: alert.eventData ? [alert.eventData] : [],
      }));
      setEvents(mappedAlerts);

      setEventLoading(false);
    } catch (error) {
      if (!isMounted.current) {
        return;
      }
      console.error('加载实时数据失败', error);
      setFetchError('获取实时数据失败，请稍后重试');
    } finally {
      if (!isMounted.current) {
        return;
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadInitialData();
    
    return () => {
      isMounted.current = false;
    };
  }, [loadInitialData]);

  const eventStats = useMemo(() => ({
    total: events.length,
    critical: events.filter(e => e.level === 'CRITICAL').length,
    high: events.filter(e => e.level === 'HIGH').length,
    medium: events.filter(e => e.level === 'MEDIUM').length,
    low: events.filter(e => e.level === 'LOW').length,
    newEvents: events.filter(e => e.status === 'NEW').length,
    investigating: events.filter(e => e.status === 'INVESTIGATING').length,
  }), [events]);

  const hasCriticalAlert = useMemo(() => eventStats.critical >= 3, [eventStats.critical]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
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
        );
      case 'analysis':
        return <AnalysisPage isPaused={isPaused} />;
      case 'threat':
        return <ThreatPage isPaused={isPaused} />;
      default:
        return (
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
        );
    }
  };

  const renderContent = () => {
    if (loading && activeTab === 'overview') {
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

    if (!loading && activeTab === 'overview' && fetchError) {
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

        <DashboardHeader connected={connected} />
        
        <ControlBar
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          connected={connected}
          reconnect={reconnect}
          unreadCount={unreadCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notificationPanelVisible={notificationPanelVisible}
          setNotificationPanelVisible={setNotificationPanelVisible}
        />
        
        {renderTabContent()}

        {/* 底部信息栏 */}
        <div style={{ 
          marginTop: '40px', 
          padding: '20px',
          textAlign: 'center', 
          color: '#666',
          fontSize: '12px',
          borderTop: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: '12px'
        }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <Typography.Text strong>系统版本</Typography.Text>
              <div>v3.2.1 Enterprise</div>
            </div>
            <div>
              <Typography.Text strong>数据延迟</Typography.Text>
              <div>&lt; 100ms</div>
            </div>
            <div>
              <Typography.Text strong>最后检查</Typography.Text>
              <div>{new Date().toLocaleString()}</div>
            </div>
            <div>
              <Typography.Text strong>系统状态</Typography.Text>
              <div>
                <Badge 
                  status={connected ? "success" : "error"} 
                  text={connected ? '运行正常' : '连接异常'} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isMounted.current) {
    return null;
  }

  return renderContent();
};

export default EnhancedDashboard; 