import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import '../styles/responsive.less';
import { useNotification } from '../hooks/useNotification';
import NotificationPanel from './NotificationPanel';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Space, 
  Switch, 
  Tooltip, 
  Dropdown, 
  Menu, 
  Spin,
  Badge,
  Progress,
  Alert,
  List,
  Tag,
  Timeline,
  Avatar,
  Divider,
  Typography,
  Result
} from 'antd';

import {
  CheckCircleOutlined,
  AlertOutlined,
  SyncOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CodeOutlined
} from '@ant-design/icons';
import LineChart from './Charts/LineChart';
import PieChart from './Charts/PieChart';
import BarChart from './Charts/BarChart';
import { useWebSocket } from '@/services/websocket';
import { logApi, alertApi } from '@/services/api';
import { exportToExcel, exportToCSV, exportToJSON, generateReport } from '../utils/exportUtils';
import type { SecurityLog, SecurityAlert, Statistics } from '@/types';

type SecurityEventLevel = SecurityAlert['alertLevel'];
type SecurityEventStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

interface SecurityEvent {
  id: string;
  timestamp: string;
  level: SecurityEventLevel;
  source?: string;
  type?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  confidence?: number;
  status: SecurityEventStatus;
  tags?: string[];
}

type DashboardStatistics = Statistics & {
  systemHealth?: 'healthy' | 'warning' | 'critical';
  anomalyCount?: number;
  highRiskCount?: number;
  activeUsers?: number;
  responseTime?: number;
  throughput?: number;
};

const EVENT_LEVELS: Array<SecurityEventLevel | 'ALL'> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const { Text } = Typography;

const EnhancedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<SecurityEventLevel | 'ALL'>('ALL');
  const [eventLoading, setEventLoading] = useState(true);
  const [logStream, setLogStream] = useState<SecurityLog[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // 使用 ref 跟踪组件挂载状态
  const isMounted = useRef(true);
  
  // 通知系统
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

    if (socketLogs && socketLogs.length > 0) {
      setLogStream(socketLogs);
    }

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
      setStats(statistics);
      setLoading(false);
    }
  }, [socketLogs, socketAlerts, statistics, isPaused]);

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
      const [statRes, logsRes, alertsRes] = await Promise.all([
        logApi.getStatistics(),
        logApi.getRecentLogs(100),
        alertApi.getUnhandledAlerts(),
      ]);

      if (!isMounted.current) {
        return;
      }

      const statisticsPayload = (statRes?.data || statRes) as DashboardStatistics;
      setStats(statisticsPayload);

      const logPayload = (logsRes?.data || logsRes || []) as SecurityLog[];
      setLogStream(logPayload);

      const alertPayload = (alertsRes?.data || alertsRes || []) as SecurityAlert[];
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

  // 导出功能
  const handleExport = (format: 'excel' | 'csv' | 'json' | 'report') => {
    // ...
  };

  const exportMenuItems = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: '导出Excel',
    },
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: '导出PDF',
    },
    {
      key: 'json',
      icon: <CodeOutlined />,
      label: '导出JSON',
    },
  ];

  // 如果组件已卸载，不渲染任何内容
  if (!isMounted.current) {
    return null;
  }

  // 所有 useMemo hooks 移动到这里确保它们始终被调用
  const threatLevels = stats?.threatLevels || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const totalLogs = stats ? (stats.totalLogs ?? stats.dailyCounts?.reduce((sum, [, count]) => sum + count, 0) ?? 0) : 0;
  const securityEvents = stats ? (stats.securityEvents ?? (threatLevels.MEDIUM + threatLevels.HIGH + threatLevels.CRITICAL)) : 0;
  const highRiskCount = stats ? (stats.highRiskCount ?? (threatLevels.HIGH ?? 0) + (threatLevels.CRITICAL ?? 0)) : 0;
  const systemHealth = stats ? (stats.systemHealth ?? (highRiskCount > securityEvents * 0.4 ? 'critical' : highRiskCount > securityEvents * 0.2 ? 'warning' : 'healthy')) : 'healthy';
  const systemHealthText = systemHealth === 'critical' ? '告警' : systemHealth === 'warning' ? '预警' : '正常';
  const systemHealthPercent = systemHealth === 'critical' ? 45 : systemHealth === 'warning' ? 70 : 95;
  const anomalyCount = stats ? (stats.anomalyCount ?? securityEvents) : 0;
  const derivedThroughput = stats ? (stats.throughput ?? Math.max(1, Math.round(totalLogs / Math.max(stats.dailyCounts?.length || 1, 1)))) : 0;
  const derivedResponseTime = stats ? (stats.responseTime ?? Math.max(40, 200 - Math.min(160, highRiskCount * 5))) : 0;
  const derivedActiveUsers = stats ? (stats.activeUsers ?? Math.max(1, Math.round(totalLogs / Math.max(securityEvents || 1, 1)))) : 0;

  const lineChartData = useMemo(() => (
    logStream.slice(0, 200).map(log => ({
      time: log.eventTime,
      value: log.eventId ?? 0,
      type: log.threatLevel === 'LOW' ? 'normal' : 'anomaly'
    }))
  ), [logStream]);

  const bruteForceChartData = useMemo(() => (
    (stats?.bruteForceAttempts || []).map(([source, count]) => ({
      name: source,
      value: count,
    }))
  ), [stats?.bruteForceAttempts]);

  const eventTypeChartData = useMemo(() => (
    (stats?.eventCounts || []).map(([type, count]) => ({
      name: `事件 ${type}`,
      value: count,
    }))
  ), [stats?.eventCounts]);

  const eventStats = useMemo(() => ({
    total: events.length,
    critical: events.filter(e => e.level === 'CRITICAL').length,
    high: events.filter(e => e.level === 'HIGH').length,

    newEvents: events.filter(e => e.status === 'NEW').length,
    investigating: events.filter(e => e.status === 'INVESTIGATING').length,
  }), [events]);

  const filteredEvents = useMemo(() => (
    eventFilter === 'ALL'
      ? events
      : events.filter(event => event.level === eventFilter)
  ), [eventFilter, events]);

  const hasCriticalAlert = useMemo(() => eventStats.critical >= 3, [eventStats.critical]);

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>正在加载数据...</p>
        </div>
      );
    }

    if (!stats) {
      return (
        <Result
          status="warning"
          title="暂时无法获取仪表盘数据"
          subTitle={fetchError || '请检查网络或稍后重试'}
          extra={
            <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={loadInitialData}>重新加载</Button>
              <Button icon={<SyncOutlined />} onClick={reconnect}>尝试重连</Button>
            </Space>
          }
        />
      );
    }

    return (
      <div className="responsive-container animate-fade-in-up" style={{ padding: '16px' }}>
        {/* 通知面板 */}
        <NotificationPanel 
          visible={notificationPanelVisible}
          onClose={() => setNotificationPanelVisible(false)}
        />

        {/* 页面标题和操作栏 */}
        <div className="header-content" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              AI安全日志异常检测系统
            </h1>
            <p style={{ margin: '2px 0 0 0', color: '#666', fontSize: '12px' }}>
              实时监控 · 智能分析 · 预警防护
            </p>
          </div>
          <div className="header-actions">
            <Space wrap size="small">
              <Tooltip title={isPaused ? '继续实时更新' : '暂停实时更新'}>
                <Switch
                  checked={!isPaused}
                  onChange={(checked) => setIsPaused(!checked)}
                  checkedChildren={<PlayCircleOutlined />}
                  unCheckedChildren={<PauseCircleOutlined />}
                  className="animate-pulse"
                  size="small"
                />
              </Tooltip>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadInitialData}
                loading={loading}
                type="primary"
                ghost
                size="small"
              >
                刷新数据
              </Button>
              <Tooltip title="重新连接实时通道">
                <Button 
                  icon={<SyncOutlined spin={!connected} />} 
                  onClick={reconnect}
                  disabled={connected}
                  size="small"
                >
                  重连 WebSocket
                </Button>
              </Tooltip>

              <Badge count={unreadCount} size="small">
                <Button 
                  icon={<BellOutlined />} 
                  onClick={() => setNotificationPanelVisible(true)}
                  type="primary"
                  ghost
                  size="small"
                >
                  通知
                </Button>
              </Badge>
              <Dropdown
                menu={{
                  items: exportMenuItems,
                  onClick: ({ key }) => handleExport(key as any),
                }}
                placement="bottomRight"
              >
                <Button icon={<ExportOutlined />} type="primary" size="small">
                  导出数据 <MoreOutlined />
                </Button>
              </Dropdown>
            </Space>
          </div>
        </div>

        {fetchError && (
          <Alert
            type="error"
            showIcon
            message={fetchError}
            action={<Button size="small" onClick={loadInitialData}>重试</Button>}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 统计卡片 */}
        <div className="statistics-grid animate-fade-in-up" style={{ marginBottom: '16px' }}>
          <div className="statistic-card responsive-card">
            <Card hoverable size="small">
              <Statistic
                title="系统状态"
                value={systemHealthText}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: systemHealth === 'critical' ? '#cf1322' : systemHealth === 'warning' ? '#fa8c16' : '#3f8600', fontSize: '16px' }}
                titleStyle={{ fontSize: '12px' }}
              />
              <Progress 
                percent={systemHealthPercent} 
                size="small" 
                status={systemHealth === 'critical' ? 'exception' : systemHealth === 'warning' ? 'active' : 'success'}
                style={{ marginTop: '4px' }}
              />
            </Card>
          </div>
          <div className="statistic-card responsive-card">
            <Card hoverable size="small">
              <Statistic
                title="总日志数"
                value={totalLogs}
                valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                titleStyle={{ fontSize: '12px' }}
                suffix="条"
              />
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#666' }}>
                最近 24 小时: {stats.dailyCounts?.length || 0} 个时间点
              </div>
            </Card>
          </div>
          <div className="statistic-card responsive-card">
            <Card hoverable size="small">
              <Statistic
                title="安全事件"
                value={anomalyCount}
                prefix={<AlertOutlined />}
                valueStyle={{ color: '#cf1322', fontSize: '16px' }}
                titleStyle={{ fontSize: '12px' }}
                suffix="条"
              />
              <Badge 
                count={highRiskCount} 
                style={{ backgroundColor: '#ff4d4f', marginTop: '4px' }}
                size="small"
              >
                <span style={{ fontSize: '10px', color: '#666' }}>高风险事件</span>
              </Badge>
            </Card>
          </div>
          <div className="statistic-card responsive-card">
            <Card hoverable size="small">
              <Statistic
                title="未处理告警"
                value={stats.unhandledAlerts}
                prefix={<BellOutlined />}
                valueStyle={{ color: stats.unhandledAlerts ? '#faad14' : '#3f8600', fontSize: '16px' }}
                titleStyle={{ fontSize: '12px' }}
                suffix="条"
              />
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#666' }}>
                告警总数: {stats.totalAlerts}
              </div>
            </Card>
          </div>
        </div>

        {hasCriticalAlert && (
          <Alert
            type="error"
            showIcon
            message={`检测到 ${eventStats.critical} 个严重安全事件`}
            description="请立即查看实时事件流并执行响应策略"
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" danger href="#/alerts">
                前往告警中心
              </Button>
            }
          />
        )}

        {/* 图表区域 */}
        <div className="responsive-grid animate-fade-in-up" style={{ marginBottom: '16px' }}>
          <div className="chart-container">
            <Card size="small" title="实时日志流" style={{ height: '100%' }}>
              <LineChart 
                data={lineChartData}
                title="" 
                height={200}
              />
            </Card>
          </div>
          <div className="chart-container">
            <Card size="small" title="威胁等级分布" style={{ height: '100%' }}>
              <PieChart 
                data={[
                  { name: '低', value: threatLevels.LOW || 0 },
                  { name: '中', value: threatLevels.MEDIUM || 0 },
                  { name: '高', value: threatLevels.HIGH || 0 },
                  { name: '严重', value: threatLevels.CRITICAL || 0 },
                ]}
                title="" 
                height={200}
              />
            </Card>
          </div>
        </div>

        {/* 实时风险与系统运行态 */}
        <Row gutter={12} className="animate-fade-in-up" style={{ marginBottom: '16px' }}>
          <Col xs={24} xl={16}>
            <Card
              size="small"
              title="实时安全事件"
              extra={
                <Space size="small">
                  <Badge status={!isPaused ? 'processing' : 'default'} text={!isPaused ? '实时更新中' : '已暂停'} />
                  <Tooltip title={isPaused ? '继续实时更新' : '暂停实时更新'}>
                    <Switch
                      checked={!isPaused}
                      onChange={(checked) => setIsPaused(!checked)}
                      checkedChildren={<PlayCircleOutlined />}
                      unCheckedChildren={<PauseCircleOutlined />}
                      size="small"
                    />
                  </Tooltip>
                </Space>
              }
              style={{ height: '100%' }}
            >
              <Space wrap style={{ marginBottom: 8 }} size="small">
                {EVENT_LEVELS.map(level => (
                  <Button
                    key={level}
                    size="small"
                    type={eventFilter === level ? 'primary' : 'default'}
                    onClick={() => setEventFilter(level as SecurityEventLevel | 'ALL')}
                  >
                    {level === 'ALL' ? '全部' : level}
                  </Button>
                ))}
              </Space>
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Statistic title="总事件" value={eventStats.total} prefix={<ThunderboltOutlined />} valueStyle={{ fontSize: '16px' }} titleStyle={{ fontSize: '12px' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="严重" value={eventStats.critical} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#cf1322', fontSize: '16px' }} titleStyle={{ fontSize: '12px' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="高危" value={eventStats.high} prefix={<WarningOutlined />} valueStyle={{ color: '#fa8c16', fontSize: '16px' }} titleStyle={{ fontSize: '12px' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="调查中" value={eventStats.investigating} prefix={<EyeOutlined />} valueStyle={{ color: '#13c2c2', fontSize: '16px' }} titleStyle={{ fontSize: '12px' }} />
                </Col>
              </Row>
              <div style={{ height: 150, overflow: 'auto' }}>
                <List
                  loading={eventLoading}
                  dataSource={filteredEvents}
                  pagination={{ pageSize: 2, showSizeChanger: false, size: 'small' }}
                  locale={{ emptyText: '暂无实时事件' }}
                  size="small"
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button type="link" size="small" key="details">查看详情</Button>,
                        <Button type="link" size="small" key="handle">处理</Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            style={{
                              backgroundColor: item.level === 'CRITICAL' ? '#ff4d4f' : item.level === 'HIGH' ? '#fa8c16' : '#1890ff'
                            }}
                            size="small"
                            icon={item.level === 'CRITICAL' ? <ExclamationCircleOutlined /> : item.level === 'HIGH' ? <WarningOutlined /> : <InfoCircleOutlined />}
                          />
                        }
                        title={
                          <Space wrap size="small">
                            {(() => {
                              const config = {
                                CRITICAL: { color: 'red', text: '严重', icon: <ExclamationCircleOutlined /> },
                                HIGH: { color: 'orange', text: '高', icon: <WarningOutlined /> },
                                MEDIUM: { color: 'gold', text: '中', icon: <InfoCircleOutlined /> },
                                LOW: { color: 'blue', text: '低', icon: <InfoCircleOutlined /> },
                              } as const;

                              const current = item.level ? config[item.level] : { color: 'default', text: '未知', icon: <InfoCircleOutlined /> };
                              return <Tag color={current.color} icon={current.icon} style={{ fontSize: '10px' }}>{current.text}</Tag>;
                            })()}
                            <Text strong style={{ fontSize: '12px' }}>{item.type}</Text>
                            <Text type="secondary" style={{ fontSize: '10px' }}>来源 {item.source}</Text>
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: 2 }}>
                              <Text style={{ fontSize: '12px' }}>{item.message}</Text>
                            </div>
                            <Space size="small" wrap>
                              <Text type="secondary" style={{ fontSize: '10px' }}>{new Date(item.timestamp).toLocaleString()}</Text>
                              {item.ipAddress && <Text type="secondary" style={{ fontSize: '10px' }}>IP: {item.ipAddress}</Text>}
                              <Text type="secondary" style={{ fontSize: '10px' }}>置信度 {item.confidence}%</Text>
                              {(() => {
                                const config = {
                                  NEW: { color: 'red', text: '新事件' },
                                  INVESTIGATING: { color: 'processing', text: '调查中' },
                                  RESOLVED: { color: 'success', text: '已解决' },
                                  FALSE_POSITIVE: { color: 'default', text: '误报' },
                                } as const;

                                return <Tag color={config[item.status].color} style={{ fontSize: '10px' }}>{config[item.status].text}</Tag>;
                              })()}
                              {item.tags?.map(tag => (
                                <Tag key={`${item.id}-${tag}`} size="small" style={{ fontSize: '10px' }}>{tag}</Tag>
                              ))}
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card size="small" title="事件时间线" style={{ marginBottom: 8, height: '48%' }}>
              <div style={{ height: '100%', overflow: 'auto' }}>
                <Timeline
                  items={filteredEvents.slice(0, 2).map(event => ({
                    dot: event.level === 'CRITICAL'
                      ? <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                      : event.level === 'HIGH'
                        ? <WarningOutlined style={{ color: '#fa8c16', fontSize: '12px' }} />
                        : <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />,
                    children: (
                      <div>
                        <Text strong style={{ fontSize: '12px' }}>{event.type}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '10px' }}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
                      </div>
                    ),
                  }))}
                />
              </div>
            </Card>
            <Card size="small" title="系统健康状态" style={{ height: '48%' }}>
              <div style={{ height: '100%', overflow: 'auto' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '12px' }}>事件处理效率</Text>
                  <Progress percent={Math.min(95, 80 + highRiskCount)} strokeColor="#52c41a" size="small" />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '12px' }}>系统吞吐量 (req/s)</Text>
                  <Progress percent={Math.min(99, derivedThroughput)} strokeColor="#1890ff" size="small" />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '12px' }}>平均响应时间 (ms)</Text>
                  <Progress percent={Math.max(10, 100 - derivedResponseTime / 2)} strokeColor="#fa8c16" size="small" />
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Text strong style={{ fontSize: '12px' }}>最新系统信息</Text>
                  <Text type="secondary" style={{ fontSize: '10px' }}>• 当前吞吐量 {derivedThroughput} req/s</Text>
                  <Text type="secondary" style={{ fontSize: '10px' }}>• 活跃用户 {derivedActiveUsers} 人</Text>
                  <Text type="secondary" style={{ fontSize: '10px' }}>• 平均响应 {derivedResponseTime} ms</Text>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        <div className="responsive-grid animate-fade-in-up">
          <div className="chart-container">
            <Card 
              size="small"
              title={bruteForceChartData.length ? '可疑暴力破解来源' : '事件类型统计'} 
              style={{ height: '100%' }}
            >
              <BarChart 
                data={(bruteForceChartData.length ? bruteForceChartData : eventTypeChartData).slice(0, 4).map(item => ({
                  name: item.name,
                  value: item.value,
                })) || [{ name: '暂无数据', value: 0 }]}
                title="" 
                height={150}
                yAxisName={bruteForceChartData.length ? '次数' : '数量'}
              />
            </Card>
          </div>

          <div>
            <Card 
              size="small"
              title="最近异常日志" 
              extra={<Button type="link" size="small">查看全部</Button>}
              hoverable
              className="responsive-card"
              style={{ height: '100%' }}
            >
              <div className="custom-scrollbar" style={{ height: '100%', overflow: 'auto' }}>
                {logStream
                  .filter(item => item.threatLevel !== 'LOW')
                  .slice(0, 2)
                  .map((item, index) => (
                    <div 
                      key={index} 
                      className="animate-fade-in-left"
                      style={{ 
                        padding: '6px 0', 
                        borderBottom: index < 1 ? '1px solid #f0f0f0' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        animationDelay: `${index * 0.1}s`
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                          {new Date(item.eventTime).toLocaleTimeString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          {item.computerName} - 事件 {item.eventId}
                        </div>
                      </div>
                      <Badge 
                        status={item.threatLevel === 'CRITICAL' ? 'error' : item.threatLevel === 'HIGH' ? 'warning' : 'processing'}
                        text={item.threatLevel}
                        size="small"
                      />
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default EnhancedDashboard;