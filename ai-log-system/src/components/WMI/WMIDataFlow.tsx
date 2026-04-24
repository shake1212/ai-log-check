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
import { analysisApi, logApi, scriptApi } from '@/services/api';

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
  const [dataSources, setDataSources] = useState<WMIDataSource[]>([]);
  const [dataFlowSteps, setDataFlowSteps] = useState<DataFlowStep[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const loadDataFlowData = useCallback(async () => {
    try {
      const [historyResp, trafficResp, logsResp] = await Promise.all([
        scriptApi.getHistory(),
        analysisApi.getTrafficStats(),
        logApi.getRecentLogs(20),
      ]);

      const history = Array.isArray((historyResp as any)?.data) ? (historyResp as any).data : (Array.isArray(historyResp) ? historyResp : []);
      const traffic = (trafficResp as any)?.data || trafficResp || {};
      const logs = (logsResp as any)?.data || logsResp || [];
      const safeLogs = Array.isArray(logs) ? logs : [];

      const historyByScript = history.reduce((acc: Record<string, any[]>, item: any) => {
        const key = item.scriptKey || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      const sourceTypes: WMIDataSource['type'][] = ['event_log', 'system_info', 'process_monitor', 'service_status', 'performance'];
      const nextSources: WMIDataSource[] = Object.keys(historyByScript).map((scriptKey, index) => {
        const items = historyByScript[scriptKey];
        const latest = items[0] || {};
        const failedCount = items.filter((i: any) => i.status === 'FAILED').length;
        return {
          id: scriptKey,
          name: latest.scriptName || scriptKey,
          type: sourceTypes[index % sourceTypes.length] || 'event_log',
          namespace: 'root\\cimv2',
          query: `script:${scriptKey}`,
          status: latest.status === 'FAILED' ? 'error' : latest.status === 'RUNNING' ? 'active' : 'inactive',
          lastUpdate: latest.startedAt || '-',
          dataCount: items.length,
          errorCount: failedCount,
          description: '由后端脚本执行记录生成的数据源状态',
        };
      });
      setDataSources(nextSources);

      const current = Number(traffic.currentTraffic || 0);
      const normal = Number(traffic.normalTraffic || 0);
      const anomaly = Number(traffic.anomalyTraffic || 0);
      const peak = Number(traffic.peakTraffic || 0);
      const latency = Number(traffic.avgLatency || 0);
      setDataFlowSteps([
        { id: '1', name: '数据采集', type: 'collect', status: 'running', inputData: 0, outputData: current, processingTime: latency, errorRate: peak > 0 ? (anomaly / peak) * 100 : 0 },
        { id: '2', name: '数据预处理', type: 'process', status: 'running', inputData: current, outputData: normal, processingTime: Math.max(1, Math.round(latency * 0.8)), errorRate: current > 0 ? (anomaly / current) * 100 : 0 },
        { id: '3', name: '数据转换', type: 'transform', status: 'running', inputData: normal, outputData: normal, processingTime: Math.max(1, Math.round(latency * 0.6)), errorRate: 0 },
        { id: '4', name: '数据存储', type: 'store', status: 'running', inputData: normal, outputData: normal, processingTime: Math.max(1, Math.round(latency * 1.2)), errorRate: 0 },
        { id: '5', name: '数据分析', type: 'analyze', status: 'running', inputData: normal, outputData: anomaly, processingTime: Math.max(1, Math.round(latency * 1.5)), errorRate: normal > 0 ? (anomaly / normal) * 100 : 0 },
      ]);

      setLogEntries(
        safeLogs.map((item: any) => ({
          id: String(item.id ?? item.eventId ?? Date.now()),
          timestamp: item.eventTime || item.timestamp || new Date().toLocaleString(),
          level: String(item.level || 'info').toLowerCase() === 'error'
            ? 'error'
            : String(item.level || '').toLowerCase() === 'warning'
              ? 'warning'
              : 'info',
          source: item.sourceName || '日志采集',
          message: item.rawMessage || item.description || '系统运行日志',
          details: item.rawMessage || undefined,
          category: item.eventType || '数据采集',
        }))
      );
    } catch (error) {
      console.error('加载WMI数据流失败:', error);
      message.error('加载WMI数据流失败');
    }
  }, []);


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
    await loadDataFlowData();
    message.success(`数据源 ${dataSource.name} 刷新完成`);
  };

  const handleEditDataSource = (dataSource: WMIDataSource) => {
    setEditingDataSource(dataSource);
    form.setFieldsValue(dataSource);
    setModalVisible(true);
  };

  useEffect(() => {
    loadDataFlowData();
    const interval = setInterval(loadDataFlowData, 5000);

    return () => clearInterval(interval);
  }, [loadDataFlowData]);

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
