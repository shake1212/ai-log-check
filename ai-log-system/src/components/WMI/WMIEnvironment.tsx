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
  const [connections, setConnections] = useState<WMIConnection[]>([
    {
      id: '1',
      name: '本地服务器',
      host: 'localhost',
      username: 'Administrator',
      domain: 'WORKGROUP',
      status: 'connected',
      lastConnected: '2024-01-15 14:30:25',
      responseTime: 45
    },
    {
      id: '2',
      name: '测试服务器',
      host: '192.168.1.100',
      username: 'admin',
      domain: 'DOMAIN',
      status: 'disconnected',
      lastConnected: '2024-01-15 13:45:10',
      responseTime: 0,
      errorMessage: '连接超时'
    }
  ]);

  const [queries, setQueries] = useState<WMIQuery[]>([
    {
      id: '1',
      name: '系统进程监控',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_Process',
      description: '监控系统运行进程',
      enabled: true,
      interval: 30,
      lastRun: '2024-01-15 14:30:25',
      resultCount: 156
    },
    {
      id: '2',
      name: '服务状态检查',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_Service WHERE State = "Running"',
      description: '检查运行中的服务',
      enabled: true,
      interval: 60,
      lastRun: '2024-01-15 14:29:45',
      resultCount: 89
    },
    {
      id: '3',
      name: '事件日志监控',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_NTLogEvent WHERE EventType = 1',
      description: '监控错误事件日志',
      enabled: false,
      interval: 300,
      lastRun: '2024-01-15 14:25:10',
      resultCount: 23
    }
  ]);

  const [environmentStatus, setEnvironmentStatus] = useState<WMIEnvironmentStatus>({
    totalConnections: 2,
    activeConnections: 1,
    totalQueries: 3,
    runningQueries: 2,
    dataPoints: 268,
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

  const handleTestConnection = async (connection: WMIConnection) => {
    message.loading('正在测试连接...', 2);
    
    // 模拟连接测试
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      if (isSuccess) {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connection.id 
              ? { ...conn, status: 'connected', responseTime: Math.floor(Math.random() * 100) + 20 }
              : conn
          )
        );
        message.success('连接测试成功');
      } else {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connection.id 
              ? { ...conn, status: 'error', errorMessage: '连接失败' }
              : conn
          )
        );
        message.error('连接测试失败');
      }
    }, 2000);
  };

  const handleReconnect = async (connection: WMIConnection) => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === connection.id 
          ? { ...conn, status: 'connecting' }
          : conn
      )
    );
    
    message.loading('正在重新连接...', 2);
    
    setTimeout(() => {
      const isSuccess = Math.random() > 0.4;
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connection.id 
            ? { 
                ...conn, 
                status: isSuccess ? 'connected' : 'error',
                responseTime: isSuccess ? Math.floor(Math.random() * 100) + 20 : 0,
                errorMessage: isSuccess ? undefined : '重连失败'
              }
            : conn
        )
      );
      
      if (isSuccess) {
        message.success('重连成功');
      } else {
        message.error('重连失败');
      }
    }, 3000);
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
    message.loading('正在执行查询...', 2);
    
    setTimeout(() => {
      setQueries(prev => 
        prev.map(q => 
          q.id === query.id 
            ? { 
                ...q, 
                lastRun: new Date().toLocaleString(),
                resultCount: Math.floor(Math.random() * 200) + 50
              }
            : q
        )
      );
      message.success('查询执行完成');
    }, 2000);
  };

  // 模拟实时更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 更新环境状态
      setEnvironmentStatus(prev => ({
        ...prev,
        dataPoints: prev.dataPoints + Math.floor(Math.random() * 10)
      }));
      
      // 更新查询结果
      setQueries(prev => 
        prev.map(query => 
          query.enabled 
            ? {
                ...query,
                resultCount: query.resultCount + Math.floor(Math.random() * 5),
                lastRun: new Date().toLocaleString()
              }
            : query
        )
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
