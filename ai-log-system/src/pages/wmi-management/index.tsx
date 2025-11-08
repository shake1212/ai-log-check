// WMIManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Alert, 
  Spin, 
  Button, 
  Space,
  message,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag
} from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  MonitorOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { 
  wmiApiService, 
  WmiStatistics, 
  PerformanceMetrics, 
  WMIConnection, 
  WMIQuery,
  WMIQueryResult,
  WMIConnectionStatus 
} from '../../services/WMIService';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const WMIManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('environment');
  const [statistics, setStatistics] = useState<WmiStatistics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [connections, setConnections] = useState<WMIConnection[]>([]);
  const [queries, setQueries] = useState<WMIQuery[]>([]);
  const [queryResults, setQueryResults] = useState<WMIQueryResult[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, WMIConnectionStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<WMIQuery | null>(null);
  const [connectionForm] = Form.useForm();
  const [queryForm] = Form.useForm();

  // 加载所有数据
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [stats, metrics, conns, qrs, results] = await Promise.all([
        wmiApiService.getStatistics(),
        wmiApiService.getPerformanceMetrics(),
        wmiApiService.getAllConnections(),
        wmiApiService.getAllQueries(),
        wmiApiService.getQueryResults()
      ]);
      
      setStatistics(stats);
      setPerformanceMetrics(metrics);
      setConnections(conns);
      setQueries(qrs);
      setQueryResults(results);

      // 加载连接状态
      const statusMap = new Map<string, WMIConnectionStatus>();
      for (const conn of conns) {
        const status = await wmiApiService.getConnectionStatus(conn.id);
        if (status) {
          statusMap.set(conn.id, status);
        }
      }
      setConnectionStatuses(statusMap);

    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // 每30秒自动刷新数据
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 处理添加连接
  const handleAddConnection = async (values: any) => {
    try {
      const newConnection: WMIConnection = {
        id: `conn-${Date.now()}`,
        ...values,
        port: values.port || 135,
        timeout: values.timeout || 30000
      };
      const success = await wmiApiService.addConnection(newConnection);
      if (success) {
        message.success('添加连接成功');
        setConnectionModalVisible(false);
        connectionForm.resetFields();
        await loadData();
      } else {
        message.error('添加连接失败');
      }
    } catch (error) {
      message.error('添加连接失败');
    }
  };

  // 处理测试连接
  const handleTestConnection = async (connectionId: string) => {
    try {
      const status = await wmiApiService.testConnection(connectionId);
      if (status.connected) {
        message.success(`连接测试成功 - 响应时间: ${status.responseTime}ms`);
      } else {
        message.error(`连接测试失败: ${status.errorMessage}`);
      }
      await loadData();
    } catch (error) {
      message.error('连接测试失败');
    }
  };

  // 处理删除连接
  const handleDeleteConnection = async (connectionId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个连接吗？',
      onOk: async () => {
        try {
          const success = await wmiApiService.deleteConnection(connectionId);
          if (success) {
            message.success('删除连接成功');
            await loadData();
          } else {
            message.error('删除连接失败');
          }
        } catch (error) {
          message.error('删除连接失败');
        }
      }
    });
  };

  // 处理添加查询
  const handleAddQuery = async (values: any) => {
    try {
      const newQuery: WMIQuery = {
        id: `query-${Date.now()}`,
        ...values,
        enabled: true,
        interval: values.interval || 60
      };
      await wmiApiService.addQuery(newQuery);
      message.success('添加查询成功');
      setQueryModalVisible(false);
      queryForm.resetFields();
      await loadData();
    } catch (error) {
      message.error('添加查询失败');
    }
  };

  // 处理执行查询
  const handleExecuteQuery = async (queryId: string) => {
    if (connections.length === 0) {
      message.warning('请先添加WMI连接');
      return;
    }
    
    try {
      const connectionId = connections[0].id; // 使用第一个连接
      const result = await wmiApiService.executeQuery(queryId, connectionId);
      message.success(`查询执行成功，返回 ${result.recordCount} 条记录`);
      await loadData();
    } catch (error) {
      message.error('查询执行失败');
    }
  };

  // 处理切换查询状态
  const handleToggleQuery = async (queryId: string, enabled: boolean) => {
    try {
      await wmiApiService.updateQuery(queryId, { enabled });
      message.success(`${enabled ? '启用' : '禁用'}查询成功`);
      await loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 处理删除查询
  const handleDeleteQuery = async (queryId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个查询吗？',
      onOk: async () => {
        try {
          const success = await wmiApiService.deleteQuery(queryId);
          if (success) {
            message.success('删除查询成功');
            await loadData();
          } else {
            message.error('删除查询失败');
          }
        } catch (error) {
          message.error('删除查询失败');
        }
      }
    });
  };

  // 查看查询结果
  const handleViewResults = (query: WMIQuery) => {
    setSelectedQuery(query);
    setResultsModalVisible(true);
  };

  // 获取系统状态提示
  const getSystemStatus = () => {
    if (!statistics) {
      return { 
        type: 'info' as const, 
        message: '正在加载系统状态...',
        description: '系统初始化中，请稍候...'
      };
    }

    const { systemStatus, totalConnections, activeQueries } = statistics;

    if (systemStatus === 'error' || totalConnections === 0) {
      return {
        type: 'error' as const,
        message: '系统异常',
        description: 'WMI连接异常，请检查连接配置和网络状态。'
      };
    } else if (systemStatus === 'warning' || activeQueries === 0) {
      return {
        type: 'warning' as const,
        message: '系统警告',
        description: '系统运行正常，但没有活跃的查询任务。建议配置数据采集任务。'
      };
    } else {
      return {
        type: 'success' as const,
        message: '系统运行正常',
        description: '所有WMI连接稳定，数据采集任务正常运行。'
      };
    }
  };

  // 获取连接状态标签
  const getConnectionStatusTag = (connectionId: string) => {
    const status = connectionStatuses.get(connectionId);
    if (!status) {
      return <Tag color="default">未知</Tag>;
    }
    return status.connected ? (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        已连接 {status.responseTime && `(${status.responseTime}ms)`}
      </Tag>
    ) : (
      <Tag color="red" icon={<CloseCircleOutlined />}>
        未连接
      </Tag>
    );
  };

  const statusInfo = getSystemStatus();

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" tip="加载WMI系统数据..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          WMI管理系统
          <Button 
            type="link" 
            icon={<ReloadOutlined />} 
            loading={refreshing}
            onClick={loadData}
            style={{ marginLeft: '16px' }}
          >
            刷新
          </Button>
        </Title>
        <Paragraph>
          Windows Management Instrumentation (WMI) 是一个用于管理Windows系统的核心接口。
          通过WMI可以监控系统性能、收集日志数据、管理服务等。
        </Paragraph>
      </div>

      {/* 系统概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="WMI连接数"
              value={statistics?.totalConnections || 0}
              prefix={<CloudServerOutlined />}
              valueStyle={{ 
                color: (statistics?.totalConnections || 0) > 0 ? '#1890ff' : '#d9d9d9' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据源数量"
              value={statistics?.totalDataSources || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ 
                color: (statistics?.totalDataSources || 0) > 0 ? '#52c41a' : '#d9d9d9' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃查询"
              value={statistics?.activeQueries || 0}
              prefix={<MonitorOutlined />}
              valueStyle={{ 
                color: (statistics?.activeQueries || 0) > 0 ? '#faad14' : '#d9d9d9' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据点总数"
              value={statistics?.totalDataPoints || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: (statistics?.totalDataPoints || 0) > 0 ? '#722ed1' : '#d9d9d9' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能指标 */}
     {performanceMetrics && (
  <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
    <Col xs={24} sm={12} md={6}>
      <Card size="small">
        <Statistic
          title="活跃连接"
          value={performanceMetrics.activeConnections}
          valueStyle={{ color: '#1890ff' }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card size="small">
        <Statistic
          title="CPU使用率"
          value={Number(performanceMetrics.cpuUsage || 0).toFixed(1)}
          suffix="%"
          valueStyle={{ 
            color: Number(performanceMetrics.cpuUsage || 0) > 80 ? '#f5222d' : '#52c41a' 
          }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card size="small">
        <Statistic
          title="内存使用"
          value={Number(performanceMetrics.memoryUsage || 0).toFixed(0)}
          suffix="MB"
          valueStyle={{ 
            color: Number(performanceMetrics.memoryUsage || 0) > 400 ? '#f5222d' : '#faad14' 
          }}
        />
      </Card>
    </Col>
    <Col xs={24} sm={12} md={6}>
      <Card size="small">
        <Statistic
          title="采集速率"
          value={Number(performanceMetrics.collectionRate || 0).toFixed(1)}
          suffix="条/小时"
          valueStyle={{ color: '#722ed1' }}
        />
      </Card>
    </Col>
  </Row>
)}

      {/* 系统状态提示 */}
      <Alert
        message={statusInfo.message}
        description={statusInfo.description}
        type={statusInfo.type}
        showIcon
        style={{ marginBottom: '24px' }}
        action={
          <Space>
            <Button 
              size="small" 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setConnectionModalVisible(true)}
            >
              添加连接
            </Button>
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={loadData}
            >
              刷新状态
            </Button>
          </Space>
        }
      />

      {/* 功能模块 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="环境配置" key="environment">
            {/* 连接管理 */}
            <Card 
              title="WMI连接管理" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setConnectionModalVisible(true)}
                >
                  添加连接
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              {connections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <DatabaseOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>暂无WMI连接</div>
                  <Button 
                    type="primary" 
                    style={{ marginTop: '16px' }}
                    onClick={() => setConnectionModalVisible(true)}
                  >
                    添加第一个连接
                  </Button>
                </div>
              ) : (
                <Row gutter={[16, 16]}>
                  {connections.map(connection => (
                    <Col xs={24} sm={12} md={8} key={connection.id}>
                      <Card 
                        size="small" 
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{connection.name}</span>
                            {getConnectionStatusTag(connection.id)}
                          </div>
                        }
                        extra={
                          <Space>
                            <Button 
                              size="small" 
                              type="link"
                              onClick={() => handleTestConnection(connection.id)}
                            >
                              测试
                            </Button>
                            <Button 
                              size="small" 
                              danger 
                              type="link"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteConnection(connection.id)}
                            />
                          </Space>
                        }
                      >
                        <div style={{ marginBottom: 8 }}>
                          <strong>主机:</strong> {connection.host}:{connection.port || 135}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>用户:</strong> {connection.username}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>域:</strong> {connection.domain || 'WORKGROUP'}
                        </div>
                        {connectionStatuses.get(connection.id)?.lastConnected && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            最后连接: {new Date(connectionStatuses.get(connection.id)!.lastConnected!).toLocaleString()}
                          </div>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>

            {/* 查询管理 */}
            <Card 
              title="WMI查询管理" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setQueryModalVisible(true)}
                >
                  添加查询
                </Button>
              }
            >
              {queries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <MonitorOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>暂无WMI查询</div>
                  <Button 
                    type="primary" 
                    style={{ marginTop: '16px' }}
                    onClick={() => setQueryModalVisible(true)}
                  >
                    添加第一个查询
                  </Button>
                </div>
              ) : (
                <Row gutter={[16, 16]}>
                  {queries.map(query => (
                    <Col xs={24} sm={12} md={8} key={query.id}>
                      <Card 
                        size="small" 
                        title={query.name}
                        extra={
                          <Space>
                            <Switch
                              size="small"
                              checked={query.enabled}
                              onChange={(checked) => handleToggleQuery(query.id, checked)}
                            />
                            <Button 
                              size="small" 
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewResults(query)}
                            />
                            <Button 
                              size="small" 
                              type="link"
                              onClick={() => handleExecuteQuery(query.id)}
                            >
                              执行
                            </Button>
                            <Button 
                              size="small" 
                              danger 
                              type="link"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteQuery(query.id)}
                            />
                          </Space>
                        }
                      >
                        <div style={{ marginBottom: 8 }}>
                          <strong>命名空间:</strong> {query.namespace}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>描述:</strong> {query.description}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>间隔:</strong> {query.interval}秒
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <strong>状态:</strong> 
                          <Tag 
                            color={query.enabled ? 'green' : 'red'} 
                            style={{ marginLeft: 8 }}
                          >
                            {query.enabled ? '运行中' : '已停止'}
                          </Tag>
                        </div>
                        {query.lastRun && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            最后执行: {new Date(query.lastRun).toLocaleString()}
                          </div>
                        )}
                        {query.resultCount !== undefined && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            结果数量: {query.resultCount}
                          </div>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane tab="数据流管理" key="dataflow">
            <Card title="数据采集统计">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card type="inner" title="最近查询结果">
                    {queryResults.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <ThunderboltOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                        <div>暂无查询结果</div>
                        <div style={{ fontSize: '12px', marginTop: '8px' }}>
                          请先执行WMI查询来查看结果
                        </div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                        {queryResults.slice(-10).reverse().map(result => {
                          const query = queries.find(q => q.id === result.queryId);
                          return (
                            <Card 
                              key={result.id} 
                              size="small" 
                              style={{ marginBottom: 8 }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <strong>{query?.name || '未知查询'}</strong>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {new Date(result.timestamp).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <span style={{ 
                                    color: result.error ? '#f5222d' : '#52c41a'
                                  }}>
                                    {result.error ? '失败' : `成功 (${result.recordCount}条)`}
                                  </span>
                                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                                    {result.executionTime}ms
                                  </div>
                                </div>
                              </div>
                              {result.error && (
                                <div style={{ color: '#f5222d', fontSize: '12px', marginTop: 8 }}>
                                  {result.error}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>
          </Tabs.TabPane>

          <Tabs.TabPane tab="连接测试" key="test">
            <Card title="连接测试工具">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Alert
                    message="连接测试说明"
                    description="选择要测试的WMI连接，系统将验证连接状态和权限。"
                    type="info"
                    style={{ marginBottom: 16 }}
                  />
                </Col>
                {connections.length === 0 ? (
                  <Col span={24}>
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      <CloudServerOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <div>暂无WMI连接</div>
                      <Button 
                        type="primary" 
                        style={{ marginTop: '16px' }}
                        onClick={() => setConnectionModalVisible(true)}
                      >
                        添加连接进行测试
                      </Button>
                    </div>
                  </Col>
                ) : (
                  connections.map(connection => {
                    const status = connectionStatuses.get(connection.id);
                    return (
                      <Col xs={24} sm={12} key={connection.id}>
                        <Card 
                          title={connection.name}
                          extra={
                            <Button 
                              type="primary"
                              onClick={() => handleTestConnection(connection.id)}
                              loading={refreshing}
                            >
                              测试连接
                            </Button>
                          }
                        >
                          <div style={{ marginBottom: 8 }}>
                            <strong>连接信息:</strong> {connection.host}:{connection.port || 135}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>用户名:</strong> {connection.username}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>域:</strong> {connection.domain || 'WORKGROUP'}
                          </div>
                          <div>
                            <strong>测试结果:</strong>
                            {status ? (
                              <div style={{ marginTop: 8 }}>
                                <Tag color={status.connected ? 'green' : 'red'}>
                                  {status.connected ? '连接成功' : '连接失败'}
                                </Tag>
                                {status.connected && status.responseTime && (
                                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                                    响应时间: {status.responseTime}ms
                                  </div>
                                )}
                                {status.errorMessage && (
                                  <div style={{ marginTop: 4, color: '#f5222d', fontSize: '12px' }}>
                                    错误信息: {status.errorMessage}
                                  </div>
                                )}
                                {status.lastConnected && (
                                  <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                                    最后连接: {new Date(status.lastConnected).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#999', marginLeft: 8 }}>
                                未测试
                              </span>
                            )}
                          </div>
                        </Card>
                      </Col>
                    );
                  })
                )}
              </Row>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 添加连接模态框 */}
      <Modal
        title="添加WMI连接"
        open={connectionModalVisible}
        onCancel={() => setConnectionModalVisible(false)}
        onOk={() => connectionForm.submit()}
        width={600}
      >
        <Form 
          form={connectionForm} 
          layout="vertical" 
          onFinish={handleAddConnection}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="连接名称" rules={[{ required: true, message: '请输入连接名称' }]}>
                <Input placeholder="输入连接名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="host" label="主机地址" rules={[{ required: true, message: '请输入主机地址' }]}>
                <Input placeholder="localhost 或 IP地址" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="输入密码" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="domain" label="域">
                <Input placeholder="WORKGROUP" defaultValue="WORKGROUP" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="port" label="端口">
                <Input type="number" defaultValue={135} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="timeout" label="超时时间(毫秒)">
            <Input type="number" defaultValue={30000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加查询模态框 */}
      <Modal
        title="添加WMI查询"
        open={queryModalVisible}
        onCancel={() => setQueryModalVisible(false)}
        onOk={() => queryForm.submit()}
        width={700}
      >
        <Form 
          form={queryForm} 
          layout="vertical" 
          onFinish={handleAddQuery}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="查询名称" rules={[{ required: true, message: '请输入查询名称' }]}>
                <Input placeholder="输入查询名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请输入命名空间' }]}>
                <Input placeholder="root\\cimv2" defaultValue="root\\cimv2" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="query" label="WQL查询语句" rules={[{ required: true, message: '请输入查询语句' }]}>
            <Input.TextArea 
              rows={4} 
              placeholder="SELECT * FROM Win32_Process WHERE ProcessId > 0"
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="输入查询描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="interval" label="执行间隔(秒)">
                <Input type="number" defaultValue={60} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 查看结果模态框 */}
      <Modal
        title={`查询结果 - ${selectedQuery?.name}`}
        open={resultsModalVisible}
        onCancel={() => setResultsModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setResultsModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedQuery && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>查询语句:</strong> {selectedQuery.query}
            </div>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {queryResults
                .filter(result => result.queryId === selectedQuery.id)
                .slice(-5)
                .reverse()
                .map(result => (
                  <Card key={result.id} size="small" style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>执行时间:</strong> {new Date(result.timestamp).toLocaleString()}
                      <span style={{ marginLeft: 16 }}>
                        <strong>记录数:</strong> {result.recordCount}
                      </span>
                      <span style={{ marginLeft: 16 }}>
                        <strong>耗时:</strong> {result.executionTime}ms
                      </span>
                    </div>
                    {result.error ? (
                      <div style={{ color: '#f5222d' }}>
                        <strong>错误:</strong> {result.error}
                      </div>
                    ) : (
                      <div>
                        <strong>数据预览:</strong>
                        <pre style={{ 
                          background: '#f5f5f5', 
                          padding: 8, 
                          borderRadius: 4,
                          fontSize: '12px',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(result.data.slice(0, 3), null, 2)}
                        </pre>
                      </div>
                    )}
                  </Card>
                ))
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WMIManagement;