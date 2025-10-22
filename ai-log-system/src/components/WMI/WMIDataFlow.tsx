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
  DownloadOutlined,
  FilterOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface WMIDataSource {
  id: string;
  name: string;
  type: 'event_log' | 'system_info' | 'process_monitor' | 'service_status' | 'performance';
  namespace: string;
  query: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate: string;
  dataCount: number;
  errorCount: number;
  description: string;
}

interface DataFlowStep {
  id: string;
  name: string;
  type: 'collect' | 'process' | 'transform' | 'store' | 'analyze';
  status: 'running' | 'stopped' | 'error';
  inputData: number;
  outputData: number;
  processingTime: number;
  errorRate: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  details?: string;
  category: string;
}

const WMIDataFlow: React.FC = () => {
  const [dataSources, setDataSources] = useState<WMIDataSource[]>([
    {
      id: '1',
      name: '系统事件日志',
      type: 'event_log',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_NTLogEvent WHERE EventType = 1 OR EventType = 2',
      status: 'active',
      lastUpdate: '2024-01-15 14:30:25',
      dataCount: 1256,
      errorCount: 12,
      description: '采集系统错误和警告事件'
    },
    {
      id: '2',
      name: '系统信息监控',
      type: 'system_info',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_ComputerSystem',
      status: 'active',
      lastUpdate: '2024-01-15 14:30:20',
      dataCount: 89,
      errorCount: 0,
      description: '监控系统基本信息'
    },
    {
      id: '3',
      name: '进程监控',
      type: 'process_monitor',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_Process WHERE ProcessId > 0',
      status: 'active',
      lastUpdate: '2024-01-15 14:30:15',
      dataCount: 234,
      errorCount: 2,
      description: '监控系统运行进程'
    },
    {
      id: '4',
      name: '服务状态检查',
      type: 'service_status',
      namespace: 'root\\cimv2',
      query: 'SELECT * FROM Win32_Service',
      status: 'inactive',
      lastUpdate: '2024-01-15 14:25:10',
      dataCount: 67,
      errorCount: 5,
      description: '检查系统服务状态'
    }
  ]);

  const [dataFlowSteps, setDataFlowSteps] = useState<DataFlowStep[]>([
    {
      id: '1',
      name: '数据采集',
      type: 'collect',
      status: 'running',
      inputData: 0,
      outputData: 1646,
      processingTime: 120,
      errorRate: 0.5
    },
    {
      id: '2',
      name: '数据预处理',
      type: 'process',
      status: 'running',
      inputData: 1646,
      outputData: 1580,
      processingTime: 85,
      errorRate: 1.2
    },
    {
      id: '3',
      name: '数据转换',
      type: 'transform',
      status: 'running',
      inputData: 1580,
      outputData: 1580,
      processingTime: 45,
      errorRate: 0.8
    },
    {
      id: '4',
      name: '数据存储',
      type: 'store',
      status: 'running',
      inputData: 1580,
      outputData: 1580,
      processingTime: 200,
      errorRate: 0.2
    },
    {
      id: '5',
      name: '数据分析',
      type: 'analyze',
      status: 'running',
      inputData: 1580,
      outputData: 156,
      processingTime: 300,
      errorRate: 0.1
    }
  ]);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: '2024-01-15 14:30:25',
      level: 'info',
      source: 'WMI采集器',
      message: '成功采集系统事件日志数据',
      details: '采集到1256条事件记录',
      category: '数据采集'
    },
    {
      id: '2',
      timestamp: '2024-01-15 14:30:20',
      level: 'warning',
      source: '数据处理引擎',
      message: '检测到异常数据格式',
      details: '12条记录格式不正确，已跳过',
      category: '数据处理'
    },
    {
      id: '3',
      timestamp: '2024-01-15 14:30:15',
      level: 'info',
      source: '存储服务',
      message: '数据存储完成',
      details: '成功存储1580条记录到数据库',
      category: '数据存储'
    },
    {
      id: '4',
      timestamp: '2024-01-15 14:30:10',
      level: 'error',
      source: 'WMI连接器',
      message: '连接远程服务器失败',
      details: '192.168.1.100:135 连接超时',
      category: '连接管理'
    }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<WMIDataSource | null>(null);
  const [form] = Form.useForm();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event_log': return <SecurityScanOutlined />;
      case 'system_info': return <CloudServerOutlined />;
      case 'process_monitor': return <MonitorOutlined />;
      case 'service_status': return <DatabaseOutlined />;
      case 'performance': return <ThunderboltOutlined />;
      default: return <ApiOutlined />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event_log': return 'red';
      case 'system_info': return 'blue';
      case 'process_monitor': return 'green';
      case 'service_status': return 'orange';
      case 'performance': return 'purple';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'blue';
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'debug': return 'gray';
      default: return 'default';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <InfoCircleOutlined />;
      case 'warning': return <ExclamationCircleOutlined />;
      case 'error': return <WarningOutlined />;
      case 'debug': return <SearchOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const dataSourceColumns = [
    {
      title: '数据源名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WMIDataSource) => (
        <Space>
          {getTypeIcon(record.type)}
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type === 'event_log' ? '事件日志' :
           type === 'system_info' ? '系统信息' :
           type === 'process_monitor' ? '进程监控' :
           type === 'service_status' ? '服务状态' : '性能监控'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'active' ? '活跃' : 
           status === 'inactive' ? '非活跃' : '错误'}
        </Tag>
      ),
    },
    {
      title: '数据量',
      dataIndex: 'dataCount',
      key: 'dataCount',
      render: (count: number, record: WMIDataSource) => (
        <Space>
          <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
          {record.errorCount > 0 && (
            <Badge count={record.errorCount} style={{ backgroundColor: '#f5222d' }} />
          )}
        </Space>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
    },
    {
      title: '操作',
      key: 'action',
      render: (record: WMIDataSource) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => handleRefreshDataSource(record)}
          >
            刷新
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<SettingOutlined />}
            onClick={() => handleEditDataSource(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const handleViewDetails = (dataSource: WMIDataSource) => {
    Modal.info({
      title: `数据源详情 - ${dataSource.name}`,
      width: 700,
      content: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="数据源名称">{dataSource.name}</Descriptions.Item>
          <Descriptions.Item label="类型">
            <Tag color={getTypeColor(dataSource.type)}>
              {dataSource.type === 'event_log' ? '事件日志' :
               dataSource.type === 'system_info' ? '系统信息' :
               dataSource.type === 'process_monitor' ? '进程监控' :
               dataSource.type === 'service_status' ? '服务状态' : '性能监控'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="命名空间" span={2}>
            <Text code>{dataSource.namespace}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="查询语句" span={2}>
            <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
              {dataSource.query}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={getStatusColor(dataSource.status)}>
              {dataSource.status === 'active' ? '活跃' : 
               dataSource.status === 'inactive' ? '非活跃' : '错误'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="数据量">{dataSource.dataCount}</Descriptions.Item>
          <Descriptions.Item label="错误数">{dataSource.errorCount}</Descriptions.Item>
          <Descriptions.Item label="最后更新">{dataSource.lastUpdate}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{dataSource.description}</Descriptions.Item>
        </Descriptions>
      )
    });
  };

  const handleRefreshDataSource = async (dataSource: WMIDataSource) => {
    message.loading('正在刷新数据源...', 2);
    
    setTimeout(() => {
      setDataSources(prev => 
        prev.map(ds => 
          ds.id === dataSource.id 
            ? { 
                ...ds, 
                lastUpdate: new Date().toLocaleString(),
                dataCount: ds.dataCount + Math.floor(Math.random() * 50),
                errorCount: Math.floor(Math.random() * 5)
              }
            : ds
        )
      );
      message.success('数据源刷新完成');
    }, 2000);
  };

  const handleEditDataSource = (dataSource: WMIDataSource) => {
    setEditingDataSource(dataSource);
    form.setFieldsValue(dataSource);
    setModalVisible(true);
  };

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 更新数据流步骤
      setDataFlowSteps(prev => 
        prev.map(step => ({
          ...step,
          inputData: step.type === 'collect' ? 0 : prev[prev.findIndex(s => s.id === step.id) - 1]?.outputData || 0,
          outputData: step.type === 'analyze' ? Math.floor(Math.random() * 200) + 100 : step.outputData + Math.floor(Math.random() * 10),
          processingTime: step.processingTime + Math.floor(Math.random() * 20) - 10,
          errorRate: Math.max(0, step.errorRate + (Math.random() - 0.5) * 0.5)
        }))
      );

      // 更新日志条目
      if (Math.random() > 0.7) {
        const newLogEntry: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as any,
          source: ['WMI采集器', '数据处理引擎', '存储服务', '分析引擎'][Math.floor(Math.random() * 4)],
          message: '系统运行正常',
          category: ['数据采集', '数据处理', '数据存储', '数据分析'][Math.floor(Math.random() * 4)]
        };
        
        setLogEntries(prev => [newLogEntry, ...prev.slice(0, 19)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          WMI数据流架构
        </Title>
        <Paragraph>
          设计和管理WMI数据采集流程，实现从数据源到存储的完整数据流处理。
        </Paragraph>
      </div>

      <Tabs defaultActiveKey="datasources">
        <TabPane tab="数据源管理" key="datasources">
          <Card 
            title="WMI数据源" 
            extra={
              <Button type="primary" icon={<SettingOutlined />} onClick={() => setModalVisible(true)}>
                添加数据源
              </Button>
            }
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={dataSourceColumns}
              dataSource={dataSources}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>

          {/* 数据源统计 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
                  <div>活跃数据源</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {dataSources.filter(ds => ds.status === 'active').length}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }} />
                  <div>非活跃数据源</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {dataSources.filter(ds => ds.status === 'inactive').length}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: '24px', color: '#f5222d', marginBottom: '8px' }} />
                  <div>错误数据源</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {dataSources.filter(ds => ds.status === 'error').length}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <MonitorOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
                  <div>总数据量</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {dataSources.reduce((sum, ds) => sum + ds.dataCount, 0)}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="数据流处理" key="dataflow">
          <Card title="数据处理流程" style={{ marginBottom: '24px' }}>
            <Timeline>
              {dataFlowSteps.map((step, index) => (
                <Timeline.Item 
                  key={step.id}
                  color={step.status === 'running' ? 'green' : step.status === 'error' ? 'red' : 'gray'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>{step.name}</Text>
                      <br />
                      <Text type="secondary">
                        输入: {step.inputData} | 输出: {step.outputData} | 处理时间: {step.processingTime}ms
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Tag color={step.status === 'running' ? 'success' : step.status === 'error' ? 'error' : 'default'}>
                        {step.status === 'running' ? '运行中' : step.status === 'error' ? '错误' : '已停止'}
                      </Tag>
                      <br />
                      <Text type="secondary">错误率: {step.errorRate.toFixed(1)}%</Text>
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {/* 数据流统计 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="处理步骤"
                  value={dataFlowSteps.length}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="运行中"
                  value={dataFlowSteps.filter(step => step.status === 'running').length}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="总处理时间"
                  value={dataFlowSteps.reduce((sum, step) => sum + step.processingTime, 0)}
                  suffix="ms"
                  prefix={<MonitorOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均错误率"
                  value={(dataFlowSteps.reduce((sum, step) => sum + step.errorRate, 0) / dataFlowSteps.length).toFixed(1)}
                  suffix="%"
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="运行日志" key="logs">
          <Card title="系统运行日志">
            <List
              dataSource={logEntries}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={getLevelIcon(item.level)} 
                        style={{ backgroundColor: getLevelColor(item.level) }}
                      />
                    }
                    title={
                      <Space>
                        <Tag color={getLevelColor(item.level)}>
                          {item.level.toUpperCase()}
                        </Tag>
                        <Text strong>{item.source}</Text>
                        <Text type="secondary">{item.timestamp}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Text>{item.message}</Text>
                        {item.details && (
                          <div style={{ marginTop: '4px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              详情: {item.details}
                            </Text>
                          </div>
                        )}
                        <div style={{ marginTop: '4px' }}>
                          <Tag>{item.category}</Tag>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 添加数据源模态框 */}
      <Modal
        title="添加WMI数据源"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => {
          form.validateFields().then(values => {
            console.log('添加数据源:', values);
            setModalVisible(false);
            form.resetFields();
          });
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="数据源名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="请输入数据源名称" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="请选择数据类型">
              <Option value="event_log">事件日志</Option>
              <Option value="system_info">系统信息</Option>
              <Option value="process_monitor">进程监控</Option>
              <Option value="service_status">服务状态</Option>
              <Option value="performance">性能监控</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="namespace"
            label="WMI命名空间"
            rules={[{ required: true, message: '请输入WMI命名空间' }]}
          >
            <Input placeholder="例如: root\\cimv2" />
          </Form.Item>
          
          <Form.Item
            name="query"
            label="WQL查询语句"
            rules={[{ required: true, message: '请输入WQL查询语句' }]}
          >
            <Input.TextArea 
              placeholder="请输入WQL查询语句"
              rows={4}
            />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入数据源描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WMIDataFlow;
