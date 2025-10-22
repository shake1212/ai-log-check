import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Alert, 
  Progress, 
  Tag, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch,
  Statistic,
  Timeline,
  Badge,
  Tooltip,
  message,
  Tabs,
  List,
  Avatar,
  Divider,
  Descriptions
} from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  BugOutlined,
  RocketOutlined,
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { wmiService, WMIConnection, WMIQuery } from '../../services/WMIService';
import { securityLogParser, SecurityEvent } from '../../services/SecurityLogParser';
import { incrementalLogCollector, CollectionTask } from '../../services/IncrementalLogCollector';
import { performanceMonitor, PerformanceMetrics, PerformanceAlert, OptimizationRecommendation } from '../../services/PerformanceMonitor';
import { LogDataModelFactory } from '../../models/LogDataModel';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const WMIManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [connections, setConnections] = useState<WMIConnection[]>([]);
  const [queries, setQueries] = useState<WMIQuery[]>([]);
  const [collectionTasks, setCollectionTasks] = useState<CollectionTask[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    startRealTimeUpdates();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 加载WMI连接
      const wmiConnections = wmiService.getAllConnections();
      setConnections(wmiConnections);

      // 加载WMI查询
      const wmiQueries = wmiService.getAllQueries();
      setQueries(wmiQueries);

      // 加载采集任务
      const tasks = incrementalLogCollector.getAllTasks();
      setCollectionTasks(tasks);

      // 加载性能指标
      const metrics = performanceMonitor.getMetrics(50);
      setPerformanceMetrics(metrics);

      // 加载告警
      const performanceAlerts = performanceMonitor.getAlerts(false);
      setAlerts(performanceAlerts);

      // 加载优化建议
      const optimizationRecs = performanceMonitor.getRecommendations(false);
      setRecommendations(optimizationRecs);

    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const startRealTimeUpdates = () => {
    // 每5秒更新一次数据
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  };

  const handleTestConnection = async (connection: WMIConnection) => {
    try {
      await wmiService.testConnection(connection.id);
      message.success('连接测试成功');
      loadData();
    } catch (error) {
      message.error('连接测试失败');
    }
  };

  const handleExecuteQuery = async (query: WMIQuery, connection: WMIConnection) => {
    try {
      const result = await wmiService.executeQuery(query.id, connection.id);
      message.success(`查询执行成功，返回 ${result.recordCount} 条记录`);
      loadData();
    } catch (error) {
      message.error('查询执行失败');
    }
  };

  const handleStartCollection = async (task: CollectionTask) => {
    try {
      const success = await incrementalLogCollector.startCollectionTask(task.id);
      if (success) {
        message.success('采集任务启动成功');
        loadData();
      } else {
        message.error('采集任务启动失败');
      }
    } catch (error) {
      message.error('启动采集任务失败');
    }
  };

  const handleApplyRecommendation = async (recommendation: OptimizationRecommendation) => {
    try {
      const success = await performanceMonitor.applyRecommendation(recommendation.id);
      if (success) {
        message.success('优化建议应用成功');
        loadData();
      } else {
        message.error('应用优化建议失败');
      }
    } catch (error) {
      message.error('应用优化建议失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      case 'critical': return 'purple';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const connectionColumns = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WMIConnection) => (
        <Space>
          <DatabaseOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '主机地址',
      dataIndex: 'host',
      key: 'host',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'connected' ? '已连接' : 
           status === 'connecting' ? '连接中' : 
           status === 'disconnected' ? '未连接' : '错误'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: WMIConnection) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleTestConnection(record)}
          >
            测试连接
          </Button>
        </Space>
      ),
    },
  ];

  const queryColumns = [
    {
      title: '查询名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WMIQuery) => (
        <Space>
          <MonitorOutlined />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      render: (text: string) => <Text code style={{ fontSize: '12px' }}>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '运行中' : '已停止'}
        </Tag>
      ),
    },
    {
      title: '结果数量',
      dataIndex: 'resultCount',
      key: 'resultCount',
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: WMIQuery) => (
        <Space>
          {connections.map(conn => (
            <Button 
              key={conn.id}
              type="link" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={() => handleExecuteQuery(record, conn)}
            >
              在 {conn.name} 执行
            </Button>
          ))}
        </Space>
      ),
    },
  ];

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CollectionTask) => (
        <Space>
          <ThunderboltOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '数据源',
      dataIndex: 'sourceId',
      key: 'sourceId',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'running' ? '运行中' :
           status === 'paused' ? '已暂停' :
           status === 'error' ? '错误' : '空闲'}
        </Tag>
      ),
    },
    {
      title: '总采集量',
      dataIndex: 'totalCollected',
      key: 'totalCollected',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: '操作',
      key: 'action',
      render: (record: CollectionTask) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartCollection(record)}
          >
            启动
          </Button>
        </Space>
      ),
    },
  ];

  const alertColumns = [
    {
      title: '告警类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: PerformanceAlert) => (
        <Space>
          <Tag color={getSeverityColor(record.type)}>
            {type === 'critical' ? '严重' :
             type === 'warning' ? '警告' : '信息'}
          </Tag>
          <Text strong>{record.title}</Text>
        </Space>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text>{message}</Text>
      ),
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <Text type="secondary">{new Date(timestamp).toLocaleString()}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: PerformanceAlert) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            onClick={() => performanceMonitor.acknowledgeAlert(record.id)}
          >
            确认
          </Button>
          <Button 
            type="link" 
            size="small" 
            onClick={() => performanceMonitor.resolveAlert(record.id)}
          >
            解决
          </Button>
        </Space>
      ),
    },
  ];

  const recommendationColumns = [
    {
      title: '建议',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: OptimizationRecommendation) => (
        <Space direction="vertical" size="small">
          <Space>
            <Tag color={getPriorityColor(record.priority)}>
              {record.priority === 'high' ? '高' :
               record.priority === 'medium' ? '中' : '低'}优先级
            </Tag>
            <Text strong>{title}</Text>
          </Space>
          <Text type="secondary">{record.description}</Text>
        </Space>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '预期改善',
      dataIndex: 'estimatedImprovement',
      key: 'estimatedImprovement',
      render: (improvement: number) => (
        <Text type="success">+{improvement}%</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: OptimizationRecommendation) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => handleApplyRecommendation(record)}
        >
          应用
        </Button>
      ),
    },
  ];

  const latestMetrics = performanceMetrics[performanceMetrics.length - 1];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          WMI系统管理
        </Title>
        <Paragraph>
          综合管理WMI连接、查询执行、增量采集和性能监控的完整解决方案。
        </Paragraph>
      </div>

      {/* 系统概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="WMI连接"
              value={connections.length}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃查询"
              value={queries.filter(q => q.enabled).length}
              prefix={<MonitorOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="采集任务"
              value={collectionTasks.filter(t => t.status === 'running').length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃告警"
              value={alerts.filter(a => !a.resolved).length}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能指标卡片 */}
      {latestMetrics && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="采集速率"
                value={latestMetrics.collectionRate.toFixed(1)}
                suffix="条/秒"
                prefix={<LineChartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="处理速率"
                value={latestMetrics.processingRate.toFixed(1)}
                suffix="条/秒"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="CPU使用率"
                value={latestMetrics.cpuUsage.toFixed(1)}
                suffix="%"
                  prefix={<RiseOutlined />}
                valueStyle={{ color: latestMetrics.cpuUsage > 80 ? '#f5222d' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="内存使用"
                value={latestMetrics.memoryUsage.toFixed(0)}
                suffix="MB"
                prefix={<PieChartOutlined />}
                valueStyle={{ color: latestMetrics.memoryUsage > 1500 ? '#f5222d' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 功能模块 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="系统概览" key="overview">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="系统状态" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>WMI服务状态</Text>
                      <Tag color="success">正常</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>数据采集状态</Text>
                      <Tag color="success">运行中</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>存储服务状态</Text>
                      <Tag color="success">正常</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>分析引擎状态</Text>
                      <Tag color="warning">部分运行</Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="最近活动" size="small">
                  <Timeline>
                    <Timeline.Item color="green">
                      <Text>WMI连接测试成功</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>2分钟前</Text>
                    </Timeline.Item>
                    <Timeline.Item color="blue">
                      <Text>数据采集任务完成</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>5分钟前</Text>
                    </Timeline.Item>
                    <Timeline.Item color="orange">
                      <Text>性能优化建议生成</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>10分钟前</Text>
                    </Timeline.Item>
                  </Timeline>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="连接管理" key="connections">
            <Card 
              title="WMI连接" 
              extra={
                <Button type="primary" icon={<SettingOutlined />}>
                  添加连接
                </Button>
              }
            >
              <Table
                columns={connectionColumns}
                dataSource={connections}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
                loading={isLoading}
              />
            </Card>
          </TabPane>

          <TabPane tab="查询管理" key="queries">
            <Card 
              title="WMI查询" 
              extra={
                <Button type="primary" icon={<ApiOutlined />}>
                  添加查询
                </Button>
              }
            >
              <Table
                columns={queryColumns}
                dataSource={queries}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
                loading={isLoading}
              />
            </Card>
          </TabPane>

          <TabPane tab="采集任务" key="collection">
            <Card 
              title="增量采集任务" 
              extra={
                <Button type="primary" icon={<ThunderboltOutlined />}>
                  添加任务
                </Button>
              }
            >
              <Table
                columns={taskColumns}
                dataSource={collectionTasks}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
                loading={isLoading}
              />
            </Card>
          </TabPane>

          <TabPane tab="性能监控" key="performance">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="性能告警" size="small">
                  <Table
                    columns={alertColumns}
                    dataSource={alerts}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    scroll={{ y: 300 }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="优化建议" size="small">
                  <Table
                    columns={recommendationColumns}
                    dataSource={recommendations}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="small"
                    scroll={{ y: 300 }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default WMIManagementPage;
