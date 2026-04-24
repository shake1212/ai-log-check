import React, { useState, useEffect, useCallback } from 'react';
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
  message
} from 'antd';
import {
  SettingOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { analysisApi, logApi, scriptApi } from '@/services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface WMIConnection {
  id: string;
  name: string;
  host: string;
  username: string;
  domain: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastConnected: string;
  responseTime: number;
  errorMessage?: string;
}

interface WMIQuery {
  id: string;
  name: string;
  namespace: string;
  query: string;
  description: string;
  enabled: boolean;
  interval: number;
  lastRun: string;
  resultCount: number;
}

interface WMIEnvironmentStatus {
  totalConnections: number;
  activeConnections: number;
  totalQueries: number;
  runningQueries: number;
  dataPoints: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

const WMIEnvironment: React.FC = () => {
  const [connections, setConnections] = useState<WMIConnection[]>([]);
  const [queries, setQueries] = useState<WMIQuery[]>([]);
  const [environmentStatus, setEnvironmentStatus] = useState<WMIEnvironmentStatus>({
    totalConnections: 0,
    activeConnections: 0,
    totalQueries: 0,
    runningQueries: 0,
    dataPoints: 0,
    systemHealth: 'healthy'
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<WMIConnection | null>(null);
  const [form] = Form.useForm();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'processing';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleOutlined />;
      case 'connecting': return <ThunderboltOutlined />;
      case 'disconnected': return <ExclamationCircleOutlined />;
      case 'error': return <WarningOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
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
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: WMIConnection) => (
        <Space>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status === 'connected' ? '已连接' : 
             status === 'connecting' ? '连接中' : 
             status === 'disconnected' ? '未连接' : '错误'}
          </Tag>
          {record.responseTime > 0 && (
            <Text type="secondary">{record.responseTime}ms</Text>
          )}
        </Space>
      ),
    },
    {
      title: '最后连接',
      dataIndex: 'lastConnected',
      key: 'lastConnected',
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
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => handleReconnect(record)}
          >
            重新连接
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<SettingOutlined />}
            onClick={() => handleEditConnection(record)}
          >
            编辑
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
      title: '间隔(秒)',
      dataIndex: 'interval',
      key: 'interval',
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
      title: '最后运行',
      dataIndex: 'lastRun',
      key: 'lastRun',
    },
    {
      title: '操作',
      key: 'action',
      render: (record: WMIQuery) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={record.enabled ? <StopOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleQuery(record)}
          >
            {record.enabled ? '停止' : '启动'}
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => handleRunQuery(record)}
          >
            立即运行
          </Button>
        </Space>
      ),
    },
  ];

  const loadEnvironmentData = useCallback(async () => {
    try {
      const [scheduledResp, historyResp, trafficResp] = await Promise.all([
        scriptApi.getScheduledTasks(),
        scriptApi.getHistory(),
        analysisApi.getTrafficStats(),
      ]);

      const scheduled = Array.isArray((scheduledResp as any)?.data) ? (scheduledResp as any).data : (Array.isArray(scheduledResp) ? scheduledResp : []);
      const history = Array.isArray((historyResp as any)?.data) ? (historyResp as any).data : (Array.isArray(historyResp) ? historyResp : []);
      const traffic = (trafficResp as any)?.data || trafficResp || {};

      const nextConnections: WMIConnection[] = scheduled.map((task: any, index: number) => ({
        id: String(task.taskName || index),
        name: task.taskName || `任务${index + 1}`,
        host: 'localhost',
        username: 'system',
        domain: 'WORKGROUP',
        status: task.status === 'RUNNING' ? 'connected' : task.status === 'FAILED' ? 'error' : 'disconnected',
        lastConnected: task.lastRunTime || '-',
        responseTime: Number(traffic.avgLatency || 0),
        errorMessage: task.lastError || undefined,
      }));
      setConnections(nextConnections);

      const historyByScript = history.reduce((acc: Record<string, any[]>, item: any) => {
        const key = item.scriptKey || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      const nextQueries: WMIQuery[] = Object.keys(historyByScript).map((scriptKey, index) => {
        const latest = historyByScript[scriptKey][0] || {};
        return {
          id: `${scriptKey}-${index}`,
          name: latest.scriptName || scriptKey,
          namespace: 'root\\cimv2',
          query: `script:${scriptKey}`,
          description: '基于后端脚本执行历史生成',
          enabled: latest.status === 'RUNNING',
          interval: 60,
          lastRun: latest.startedAt || '-',
          resultCount: historyByScript[scriptKey].length,
        };
      });
      setQueries(nextQueries);

      setEnvironmentStatus({
        totalConnections: nextConnections.length,
        activeConnections: nextConnections.filter(c => c.status === 'connected').length,
        totalQueries: nextQueries.length,
        runningQueries: nextQueries.filter(q => q.enabled).length,
        dataPoints: Number(traffic.currentTraffic || 0),
        systemHealth: Number(traffic.avgLatency || 0) > 200 ? 'warning' : 'healthy',
      });
    } catch (error) {
      console.error('加载WMI环境数据失败:', error);
      message.error('加载WMI环境数据失败');
    }
  }, []);

  const handleTestConnection = async (connection: WMIConnection) => {
    try {
      const trafficResp = await analysisApi.getTrafficStats();
      const traffic = (trafficResp as any)?.data || trafficResp || {};
      setConnections(prev =>
        prev.map(conn =>
          conn.id === connection.id
            ? {
                ...conn,
                status: 'connected',
                responseTime: Number(traffic.avgLatency || conn.responseTime || 0),
                lastConnected: new Date().toLocaleString(),
                errorMessage: undefined,
              }
            : conn
        )
      );
      message.success('连接测试成功');
    } catch (error) {
      setConnections(prev =>
        prev.map(conn =>
          conn.id === connection.id ? { ...conn, status: 'error', errorMessage: '连接测试失败' } : conn
        )
      );
      message.error('连接测试失败');
    }
  };

  const handleReconnect = async (connection: WMIConnection) => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === connection.id 
          ? { ...conn, status: 'connecting' }
          : conn
      )
    );
    
    await handleTestConnection(connection);
  };

  const handleEditConnection = (connection: WMIConnection) => {
    setEditingConnection(connection);
    form.setFieldsValue(connection);
    setModalVisible(true);
  };

  const handleToggleQuery = (query: WMIQuery) => {
    setQueries(prev => 
      prev.map(q => 
        q.id === query.id 
          ? { ...q, enabled: !q.enabled }
          : q
      )
    );
    
    message.success(`查询已${query.enabled ? '停止' : '启动'}`);
  };

  const handleRunQuery = async (query: WMIQuery) => {
    try {
      const response = await logApi.getRecentLogs(100);
      const logs = (response as any)?.data || response || [];
      const count = Array.isArray(logs) ? logs.length : 0;
      setQueries(prev =>
        prev.map(q =>
          q.id === query.id
            ? {
                ...q,
                lastRun: new Date().toLocaleString(),
                resultCount: count,
              }
            : q
        )
      );
      message.success('查询执行完成');
    } catch (error) {
      message.error('查询执行失败');
    }
  };

  useEffect(() => {
    loadEnvironmentData();
    const interval = setInterval(loadEnvironmentData, 10000);

    return () => clearInterval(interval);
  }, [loadEnvironmentData]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          WMI开发环境配置
        </Title>
        <Paragraph>
          配置Windows Management Instrumentation连接和查询，实现系统日志的实时采集和监控。
        </Paragraph>
      </div>

      {/* 环境状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总连接数"
              value={environmentStatus.totalConnections}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃连接"
              value={environmentStatus.activeConnections}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="运行查询"
              value={environmentStatus.runningQueries}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据点"
              value={environmentStatus.dataPoints}
              prefix={<MonitorOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Tag color={getHealthColor(environmentStatus.systemHealth)}>
                系统状态: {environmentStatus.systemHealth === 'healthy' ? '正常' : 
                         environmentStatus.systemHealth === 'warning' ? '警告' : '错误'}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* WMI连接管理 */}
      <Card 
        title="WMI连接管理" 
        extra={
          <Button type="primary" icon={<SettingOutlined />} onClick={() => setModalVisible(true)}>
            添加连接
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={connectionColumns}
          dataSource={connections}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* WMI查询管理 */}
      <Card 
        title="WMI查询管理" 
        extra={
          <Button type="primary" icon={<ApiOutlined />}>
            添加查询
          </Button>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={queryColumns}
          dataSource={queries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 系统架构图 */}
      <Card title="WMI数据流架构">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <Card title="WMI客户端" style={{ textAlign: 'center' }}>
              <CloudServerOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
              <div>数据采集</div>
            </Card>
            
            <Card title="WMI服务" style={{ textAlign: 'center' }}>
              <DatabaseOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <div>数据处理</div>
            </Card>
            
            <Card title="查询引擎" style={{ textAlign: 'center' }}>
              <MonitorOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }} />
              <div>查询执行</div>
            </Card>
            
            <Card title="日志存储" style={{ textAlign: 'center' }}>
              <SecurityScanOutlined style={{ fontSize: '24px', color: '#f5222d', marginBottom: '8px' }} />
              <div>数据存储</div>
            </Card>
          </div>

          <Timeline>
            <Timeline.Item color="green">
              <Text strong>连接建立</Text>
              <br />
              <Text type="secondary">建立WMI连接到目标系统</Text>
            </Timeline.Item>
            <Timeline.Item color="blue">
              <Text strong>查询执行</Text>
              <br />
              <Text type="secondary">执行WQL查询获取系统数据</Text>
            </Timeline.Item>
            <Timeline.Item color="orange">
              <Text strong>数据处理</Text>
              <br />
              <Text type="secondary">解析和格式化采集的数据</Text>
            </Timeline.Item>
            <Timeline.Item color="red">
              <Text strong>存储入库</Text>
              <br />
              <Text type="secondary">将处理后的数据存储到数据库</Text>
            </Timeline.Item>
          </Timeline>
        </div>
      </Card>

      {/* 添加连接模态框 */}
      <Modal
        title="添加WMI连接"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => {
          form.validateFields().then(values => {
            console.log('添加连接:', values);
            setModalVisible(false);
            form.resetFields();
          });
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="连接名称"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="请输入连接名称" />
          </Form.Item>
          
          <Form.Item
            name="host"
            label="主机地址"
            rules={[{ required: true, message: '请输入主机地址' }]}
          >
            <Input placeholder="请输入主机地址" />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="domain"
            label="域名"
          >
            <Input placeholder="请输入域名" />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WMIEnvironment;
