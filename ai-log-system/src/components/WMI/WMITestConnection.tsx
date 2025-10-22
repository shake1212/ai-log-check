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

    // 模拟测试过程
    await simulateTestProcess(newTest.id);
  };

  const simulateTestProcess = async (testId: string) => {
    for (let i = 0; i < testSteps.length; i++) {
      setCurrentStep(i);
      setTestProgress((i / testSteps.length) * 100);

      // 模拟每个测试步骤
      const testResult: TestResult = {
        id: `${testId}-${i}`,
        testName: testSteps[i].title,
        status: Math.random() > 0.2 ? 'passed' : 'failed',
        message: Math.random() > 0.2 ? '测试通过' : '测试失败',
        duration: Math.floor(Math.random() * 2000) + 500,
        details: `执行${testSteps[i].title}测试`
      };

      setConnectionTests(prev => 
        prev.map(test => 
          test.id === testId 
            ? { ...test, testResults: [...test.testResults, testResult] }
            : test
        )
      );

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // 完成测试
    const finalStatus = connectionTests.find(t => t.id === testId)?.testResults.every(r => r.status === 'passed') ? 'success' : 'failed';
    
    setConnectionTests(prev => 
      prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: finalStatus,
              endTime: new Date().toLocaleString(),
              duration: Date.now() - parseInt(testId)
            }
          : test
      )
    );

    setIsTesting(false);
    setTestProgress(100);
    setCurrentStep(testSteps.length - 1);

    // 更新连接指标
    setConnectionMetrics({
      responseTime: Math.floor(Math.random() * 100) + 50,
      dataTransferRate: Math.floor(Math.random() * 1000) + 500,
      connectionStability: Math.floor(Math.random() * 20) + 80,
      queryPerformance: Math.floor(Math.random() * 30) + 70
    });

    message.success('连接测试完成');
  };

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
