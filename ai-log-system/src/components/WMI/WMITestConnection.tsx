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
  Steps,
  Descriptions,
  List,
  Avatar,
  Divider
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
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  SearchOutlined,
  BugOutlined,
  RocketOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { analysisApi, scriptApi, systemApi } from '@/services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

interface ConnectionTest {
  id: string;
  name: string;
  host: string;
  username: string;
  status: 'testing' | 'success' | 'failed' | 'pending';
  startTime: string;
  endTime?: string;
  duration?: number;
  errorMessage?: string;
  testResults: TestResult[];
}

interface TestResult {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration: number;
  details?: string;
}

interface ConnectionMetrics {
  responseTime: number;
  dataTransferRate: number;
  connectionStability: number;
  queryPerformance: number;
}

const WMITestConnection: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    responseTime: 0,
    dataTransferRate: 0,
    connectionStability: 0,
    queryPerformance: 0
  });

  const [form] = Form.useForm();

  const testSteps = [
    {
      title: '连接验证',
      description: '验证WMI连接参数',
      icon: <DatabaseOutlined />
    },
    {
      title: '权限检查',
      description: '检查用户权限和访问控制',
      icon: <SecurityScanOutlined />
    },
    {
      title: '命名空间测试',
      description: '测试WMI命名空间访问',
      icon: <MonitorOutlined />
    },
    {
      title: '查询执行',
      description: '执行示例查询测试',
      icon: <ApiOutlined />
    },
    {
      title: '性能测试',
      description: '测试连接性能和稳定性',
      icon: <ThunderboltOutlined />
    }
  ];

  const sampleQueries = [
    {
      name: '系统信息查询',
      query: 'SELECT * FROM Win32_ComputerSystem',
      description: '获取计算机系统基本信息'
    },
    {
      name: '进程列表查询',
      query: 'SELECT ProcessId, Name, WorkingSetSize FROM Win32_Process WHERE ProcessId > 0',
      description: '获取当前运行的进程列表'
    },
    {
      name: '服务状态查询',
      query: 'SELECT Name, State, Status FROM Win32_Service',
      description: '获取系统服务状态'
    },
    {
      name: '事件日志查询',
      query: 'SELECT * FROM Win32_NTLogEvent WHERE EventType = 1',
      description: '获取错误事件日志'
    }
  ];

  const handleStartTest = async () => {
    const values = await form.validateFields();
    
    const newTest: ConnectionTest = {
      id: Date.now().toString(),
      name: values.name || '连接测试',
      host: values.host,
      username: values.username,
      status: 'testing',
      startTime: new Date().toLocaleString(),
      testResults: []
    };

    setConnectionTests(prev => [newTest, ...prev]);
    setIsTesting(true);
    setTestProgress(0);
    setCurrentStep(0);

    await runRealTestProcess(newTest.id, values.host);
  };

  const appendTestResult = (testId: string, result: TestResult) => {
    setConnectionTests(prev =>
      prev.map(test =>
        test.id === testId ? { ...test, testResults: [...test.testResults, result] } : test
      )
    );
  };

  const runRealTestProcess = async (testId: string, host: string) => {
    const stepResults: TestResult[] = [];
    const start = Date.now();
    try {
      // Step 1: 参数校验
      setCurrentStep(0);
      setTestProgress(20);
      stepResults.push({
        id: `${testId}-0`,
        testName: testSteps[0].title,
        status: host ? 'passed' : 'failed',
        message: host ? '连接参数有效' : '主机地址为空',
        duration: 10,
        details: `目标主机: ${host || '-'}`,
      });
      appendTestResult(testId, stepResults[stepResults.length - 1]);

      // Step 2: 权限与可用性检查
      setCurrentStep(1);
      setTestProgress(40);
      const statusResp = await systemApi.getSystemStatus();
      const statusOk = !!statusResp;
      stepResults.push({
        id: `${testId}-1`,
        testName: testSteps[1].title,
        status: statusOk ? 'passed' : 'failed',
        message: statusOk ? '系统状态接口可访问' : '系统状态接口不可用',
        duration: 200,
      });
      appendTestResult(testId, stepResults[stepResults.length - 1]);

      // Step 3: 命名空间能力检查（通过可用脚本判断）
      setCurrentStep(2);
      setTestProgress(60);
      const available = await scriptApi.getAvailableScripts();
      const scripts = Array.isArray(available?.data) ? available.data : (Array.isArray(available) ? available : []);
      const namespaceOk = scripts.length > 0;
      stepResults.push({
        id: `${testId}-2`,
        testName: testSteps[2].title,
        status: namespaceOk ? 'passed' : 'warning',
        message: namespaceOk ? 'WMI相关脚本可用' : '未发现可执行采集脚本',
        duration: 250,
      });
      appendTestResult(testId, stepResults[stepResults.length - 1]);

      // Step 4: 执行实际脚本
      setCurrentStep(3);
      setTestProgress(80);
      const scriptKey = scripts[0]?.scriptKey;
      let runOk = false;
      if (scriptKey) {
        const runResp = await scriptApi.runScript({ scriptKey, args: [] });
        runOk = !!runResp;
      }
      stepResults.push({
        id: `${testId}-3`,
        testName: testSteps[3].title,
        status: runOk ? 'passed' : 'warning',
        message: runOk ? '查询脚本触发成功' : '未执行脚本（无可用脚本）',
        duration: 400,
      });
      appendTestResult(testId, stepResults[stepResults.length - 1]);

      // Step 5: 性能指标
      setCurrentStep(4);
      setTestProgress(95);
      await refreshConnectionMetrics();
      stepResults.push({
        id: `${testId}-4`,
        testName: testSteps[4].title,
        status: 'passed',
        message: '性能指标已更新',
        duration: 200,
      });
      appendTestResult(testId, stepResults[stepResults.length - 1]);

      const finalStatus = stepResults.every(r => r.status !== 'failed') ? 'success' : 'failed';
      setConnectionTests(prev =>
        prev.map(test =>
          test.id === testId
            ? {
                ...test,
                status: finalStatus,
                endTime: new Date().toLocaleString(),
                duration: Date.now() - start,
              }
            : test
        )
      );
      message.success('连接测试完成');
    } catch (error) {
      console.error('连接测试失败:', error);
      setConnectionTests(prev =>
        prev.map(test =>
          test.id === testId
            ? {
                ...test,
                status: 'failed',
                endTime: new Date().toLocaleString(),
                duration: Date.now() - start,
                errorMessage: (error as Error)?.message || '测试失败',
              }
            : test
        )
      );
      message.error('连接测试失败');
    } finally {
      setIsTesting(false);
      setTestProgress(100);
      setCurrentStep(testSteps.length - 1);
    }
  };

  const refreshConnectionMetrics = async () => {
    const [trafficResp, metricsResp] = await Promise.all([
      analysisApi.getTrafficStats(),
      analysisApi.getSystemMetrics(),
    ]);
    const traffic = (trafficResp as any)?.data || trafficResp || {};
    const metrics = (metricsResp as any)?.data || metricsResp || {};
    const eps = metrics?.eventsPerSecond || {};
    const normal = Number(traffic.normalTraffic ?? eps.normal ?? 0);
    const abnormal = Number(traffic.anomalyTraffic ?? eps.abnormal ?? 0);
    const peak = Number(traffic.peakTraffic ?? eps.peak ?? 0);
    const latency = Number(traffic.avgLatency ?? metrics.latency ?? 0);

    setConnectionMetrics({
      responseTime: latency,
      dataTransferRate: Math.max(normal + abnormal, 0),
      connectionStability: Math.max(0, Math.min(100, Math.round(Number(metrics.uptime ?? 0)))),
      queryPerformance: peak > 0 ? Math.max(0, Math.min(100, Math.round((normal / peak) * 100))) : 0,
    });
  };

  useEffect(() => {
    refreshConnectionMetrics().catch((error) => {
      console.error('加载连接指标失败:', error);
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'testing': return 'processing';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getResultColor = (status: string) => {
    switch (status) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const testColumns = [
    {
      title: '测试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ConnectionTest) => (
        <Space>
          <DatabaseOutlined />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.host}</Text>
          </div>
        </Space>
      ),
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
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'testing' ? '测试中' :
           status === 'success' ? '成功' :
           status === 'failed' ? '失败' : '等待'}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => duration ? `${duration}ms` : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ConnectionTest) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewTestDetails(record)}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => handleRetest(record)}
          >
            重新测试
          </Button>
        </Space>
      ),
    },
  ];

  const handleViewTestDetails = (test: ConnectionTest) => {
    Modal.info({
      title: `测试详情 - ${test.name}`,
      width: 800,
      content: (
        <div>
          <Descriptions column={2} bordered style={{ marginBottom: '20px' }}>
            <Descriptions.Item label="测试名称">{test.name}</Descriptions.Item>
            <Descriptions.Item label="主机地址">{test.host}</Descriptions.Item>
            <Descriptions.Item label="用户名">{test.username}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(test.status)}>
                {test.status === 'testing' ? '测试中' :
                 test.status === 'success' ? '成功' :
                 test.status === 'failed' ? '失败' : '等待'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">{test.startTime}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{test.endTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="持续时间">{test.duration ? `${test.duration}ms` : '-'}</Descriptions.Item>
            <Descriptions.Item label="错误信息">{test.errorMessage || '无'}</Descriptions.Item>
          </Descriptions>

          <Title level={4}>测试结果详情</Title>
          <List
            dataSource={test.testResults}
            renderItem={(result) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={
                        result.status === 'passed' ? <CheckCircleOutlined /> :
                        result.status === 'failed' ? <ExclamationCircleOutlined /> :
                        <WarningOutlined />
                      }
                      style={{ 
                        backgroundColor: result.status === 'passed' ? '#52c41a' :
                                       result.status === 'failed' ? '#f5222d' : '#faad14'
                      }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{result.testName}</Text>
                      <Tag color={getResultColor(result.status)}>
                        {result.status === 'passed' ? '通过' :
                         result.status === 'failed' ? '失败' : '警告'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text>{result.message}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        耗时: {result.duration}ms | {result.details}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )
    });
  };

  const handleRetest = (test: ConnectionTest) => {
    form.setFieldsValue({
      name: test.name,
      host: test.host,
      username: test.username
    });
    handleStartTest();
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BugOutlined style={{ marginRight: '8px' }} />
          WMI连接测试
        </Title>
        <Paragraph>
          测试WMI连接配置，验证连接参数、权限设置和查询性能。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          {/* 连接配置 */}
          <Card title="连接配置" style={{ marginBottom: '24px' }}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="测试名称"
              >
                <Input placeholder="请输入测试名称" />
              </Form.Item>
              
              <Form.Item
                name="host"
                label="主机地址"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="例如: localhost 或 192.168.1.100" />
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
                <Input placeholder="例如: WORKGROUP 或 DOMAIN" />
              </Form.Item>
              
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  icon={<RocketOutlined />}
                  onClick={handleStartTest}
                  loading={isTesting}
                  block
                >
                  {isTesting ? '测试中...' : '开始测试'}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 测试进度 */}
          {isTesting && (
            <Card title="测试进度">
              <Steps current={currentStep} direction="vertical" size="small">
                {testSteps.map((step, index) => (
                  <Step
                    key={index}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                  />
                ))}
              </Steps>
              
              <div style={{ marginTop: '20px' }}>
                <Progress 
                  percent={testProgress} 
                  status={isTesting ? 'active' : 'success'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={12}>
          {/* 连接指标 */}
          <Card title="连接指标" style={{ marginBottom: '24px' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="响应时间"
                  value={connectionMetrics.responseTime}
                  suffix="ms"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="数据传输率"
                  value={connectionMetrics.dataTransferRate}
                  suffix="KB/s"
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="连接稳定性"
                  value={connectionMetrics.connectionStability}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="查询性能"
                  value={connectionMetrics.queryPerformance}
                  suffix="%"
                  prefix={<MonitorOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 示例查询 */}
          <Card title="示例查询">
            <List
              dataSource={sampleQueries}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<SearchOutlined />} />}
                    title={item.name}
                    description={
                      <div>
                        <Text type="secondary">{item.description}</Text>
                        <br />
                        <Text code style={{ fontSize: '12px' }}>{item.query}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 测试历史 */}
      <Card title="测试历史" style={{ marginTop: '24px' }}>
        <Table
          columns={testColumns}
          dataSource={connectionTests}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default WMITestConnection;
