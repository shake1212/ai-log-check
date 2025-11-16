// components/SystemInfoManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Statistic,
  Progress,
  Alert,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Tabs,
  List,
  Descriptions,
  Badge,
  Popconfirm,
  Empty
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

// 导入服务
import {
  systemInfoApiService,
  SystemInfoConnection,
  SystemInfoQuery,
  SystemInfoQueryResult,
  SystemInfoStatistics,
  SystemPerformanceMetrics,
  HealthCheckResult,
  RealTimeSystemInfo,
  RealTimeCpuInfo,
  RealTimeMemoryInfo,
  RealTimeDiskInfo,
  RealTimeProcessInfo
} from '../../services/SystemInfoService';

const { Option } = Select;
const { TabPane } = Tabs;

// 错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            message="组件渲染错误"
            description="系统信息管理组件出现错误，请检查控制台日志"
            type="error"
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}

const SystemInfoManagement: React.FC = () => {
  // 状态管理
  const [connections, setConnections] = useState<SystemInfoConnection[]>([]);
  const [queries, setQueries] = useState<SystemInfoQuery[]>([]);
  const [queryResults, setQueryResults] = useState<SystemInfoQueryResult[]>([]);
  const [statistics, setStatistics] = useState<SystemInfoStatistics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<SystemPerformanceMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  
  // 实时信息状态
  const [systemInfo, setSystemInfo] = useState<RealTimeSystemInfo | null>(null);
  const [cpuInfo, setCpuInfo] = useState<RealTimeCpuInfo | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<RealTimeMemoryInfo | null>(null);
  const [diskInfo, setDiskInfo] = useState<RealTimeDiskInfo | null>(null);
  const [processInfo, setProcessInfo] = useState<RealTimeProcessInfo | null>(null);

  // 模态框状态
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SystemInfoQueryResult | null>(null);

  // 加载状态和错误状态
  const [loading, setLoading] = useState({
    connections: false,
    queries: false,
    statistics: false,
    realtime: false
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [initialLoading, setInitialLoading] = useState(true);

  // 表单实例
  const [connectionForm] = Form.useForm();
  const [queryForm] = Form.useForm();

  // 加载连接列表
  const loadConnections = useCallback(async () => {
    setLoading(prev => ({ ...prev, connections: true }));
    try {
      console.log('Loading connections...');
      const data = await systemInfoApiService.getAllConnections();
      console.log('Connections loaded:', data);
      setConnections(data);
      setErrors(prev => ({ ...prev, connections: '' }));
    } catch (error) {
      console.error('Failed to load connections:', error);
      const errorMsg = '加载连接列表失败，请检查后端服务';
      setErrors(prev => ({ ...prev, connections: errorMsg }));
      message.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, connections: false }));
    }
  }, []);

  // 加载查询列表
  const loadQueries = useCallback(async () => {
    setLoading(prev => ({ ...prev, queries: true }));
    try {
      console.log('Loading queries...');
      const data = await systemInfoApiService.getAllQueries();
      console.log('Queries loaded:', data);
      setQueries(data);
      setErrors(prev => ({ ...prev, queries: '' }));
    } catch (error) {
      console.error('Failed to load queries:', error);
      const errorMsg = '加载查询列表失败，请检查后端服务';
      setErrors(prev => ({ ...prev, queries: errorMsg }));
      message.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, queries: false }));
    }
  }, []);

  // 加载查询结果
  const loadQueryResults = useCallback(async () => {
    try {
      console.log('Loading query results...');
      const data = await systemInfoApiService.getQueryResults();
      console.log('Query results loaded:', data);
      setQueryResults(data);
      setErrors(prev => ({ ...prev, queryResults: '' }));
    } catch (error) {
      console.error('Failed to load query results:', error);
      const errorMsg = '加载查询结果失败，请检查后端服务';
      setErrors(prev => ({ ...prev, queryResults: errorMsg }));
      message.error(errorMsg);
    }
  }, []);

  // 加载统计信息
  const loadStatistics = useCallback(async () => {
    setLoading(prev => ({ ...prev, statistics: true }));
    try {
      console.log('Loading statistics...');
      const [stats, metrics, health] = await Promise.allSettled([
        systemInfoApiService.getStatistics(),
        systemInfoApiService.getPerformanceMetrics(),
        systemInfoApiService.healthCheck()
      ]);

      // 处理统计信息
      if (stats.status === 'fulfilled') {
        setStatistics(stats.value);
      } else {
        console.error('Statistics load failed:', stats.reason);
        setErrors(prev => ({ ...prev, statistics: '加载统计信息失败' }));
      }

      // 处理性能指标
      if (metrics.status === 'fulfilled') {
        setPerformanceMetrics(metrics.value);
      } else {
        console.error('Performance metrics load failed:', metrics.reason);
        setErrors(prev => ({ ...prev, performanceMetrics: '加载性能指标失败' }));
      }

      // 处理健康检查
      if (health.status === 'fulfilled') {
        setHealthStatus(health.value);
      } else {
        console.error('Health check failed:', health.reason);
        setErrors(prev => ({ ...prev, healthCheck: '健康检查失败' }));
      }

    } catch (error) {
      console.error('Failed to load statistics:', error);
      setErrors(prev => ({ ...prev, statistics: '加载统计信息失败' }));
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }));
    }
  }, []);

  // 加载实时信息 - 适配新的数据结构
  const loadRealTimeInfo = useCallback(async () => {
    setLoading(prev => ({ ...prev, realtime: true }));
    try {
      console.log('Loading realtime info...');
      const [system, cpu, memory, disk, processes] = await Promise.allSettled([
        systemInfoApiService.getRealTimeSystemInfo(),
        systemInfoApiService.getRealTimeCpuInfo(),
        systemInfoApiService.getRealTimeMemoryInfo(),
        systemInfoApiService.getRealTimeDiskInfo(),
        systemInfoApiService.getRealTimeProcessInfo()
      ]);

      // 处理每个实时信息 - 适配新的数据结构
      if (system.status === 'fulfilled') {
        console.log('System info loaded:', system.value);
        setSystemInfo(system.value);
      } else {
        console.error('System info load failed:', system.reason);
      }

      if (cpu.status === 'fulfilled') {
        console.log('CPU info loaded:', cpu.value);
        setCpuInfo(cpu.value);
      } else {
        console.error('CPU info load failed:', cpu.reason);
      }

      if (memory.status === 'fulfilled') {
        console.log('Memory info loaded:', memory.value);
        setMemoryInfo(memory.value);
      } else {
        console.error('Memory info load failed:', memory.reason);
      }

      if (disk.status === 'fulfilled') {
        console.log('Disk info loaded:', disk.value);
        setDiskInfo(disk.value);
      } else {
        console.error('Disk info load failed:', disk.reason);
      }

      if (processes.status === 'fulfilled') {
        console.log('Process info loaded:', processes.value);
        setProcessInfo(processes.value);
      } else {
        console.error('Process info load failed:', processes.reason);
      }

    } catch (error) {
      console.error('Failed to load realtime info:', error);
    } finally {
      setLoading(prev => ({ ...prev, realtime: false }));
    }
  }, []);

  // 初始化加载数据
  useEffect(() => {
    const initializeData = async () => {
      console.log('Initializing system info management...');
      try {
        await Promise.allSettled([
          loadConnections(),
          loadQueries(),
          loadQueryResults(),
          loadStatistics(),
          loadRealTimeInfo()
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setInitialLoading(false);
        console.log('Initialization completed');
      }
    };

    initializeData();

    // 设置定时刷新 - 只刷新统计和实时信息
    const interval = setInterval(() => {
      loadStatistics();
      loadRealTimeInfo();
    }, 15000); // 每15秒刷新一次

    return () => clearInterval(interval);
  }, [loadConnections, loadQueries, loadQueryResults, loadStatistics, loadRealTimeInfo]);

  // 处理创建连接
  const handleCreateConnection = async (values: any) => {
    try {
      await systemInfoApiService.createConnection(values);
      message.success('连接创建成功');
      setConnectionModalVisible(false);
      connectionForm.resetFields();
      loadConnections();
    } catch (error) {
      message.error('创建连接失败，请检查后端服务');
      console.error('Failed to create connection:', error);
    }
  };

  // 处理删除连接
  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await systemInfoApiService.deleteConnection(connectionId);
      message.success('连接删除成功');
      loadConnections();
    } catch (error) {
      message.error('删除连接失败，请检查后端服务');
      console.error('Failed to delete connection:', error);
    }
  };

  // 测试连接
  const handleTestConnection = async (connectionId: string) => {
    try {
      const status = await systemInfoApiService.testConnection(connectionId);
      if (status.connected) {
        message.success('连接测试成功');
      } else {
        message.error(`连接测试失败: ${status.errorMessage}`);
      }
    } catch (error) {
      message.error('连接测试失败，请检查后端服务');
      console.error('Failed to test connection:', error);
    }
  };

  // 处理创建查询
  const handleCreateQuery = async (values: any) => {
    try {
      await systemInfoApiService.createQuery(values);
      message.success('查询创建成功');
      setQueryModalVisible(false);
      queryForm.resetFields();
      loadQueries();
    } catch (error) {
      message.error('创建查询失败，请检查后端服务');
      console.error('Failed to create query:', error);
    }
  };

  // 处理删除查询
  const handleDeleteQuery = async (queryId: string) => {
    try {
      await systemInfoApiService.deleteQuery(queryId);
      message.success('查询删除成功');
      loadQueries();
    } catch (error) {
      message.error('删除查询失败，请检查后端服务');
      console.error('Failed to delete query:', error);
    }
  };

  // 执行查询
  const handleExecuteQuery = async (queryId: string) => {
    try {
      if (connections.length === 0) {
        message.warning('请先创建连接');
        return;
      }
      const connectionId = connections[0].id;
      await systemInfoApiService.executeQuery(queryId, connectionId);
      message.success('查询执行成功');
      loadQueryResults();
    } catch (error) {
      message.error('执行查询失败，请检查后端服务');
      console.error('Failed to execute query:', error);
    }
  };

  // 查看查询结果详情
  const handleViewResult = (result: SystemInfoQueryResult) => {
    setSelectedResult(result);
    setResultModalVisible(true);
  };

  // 连接表格列定义
  const connectionColumns: ColumnsType<SystemInfoConnection> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <CloudServerOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '主机',
      dataIndex: 'host',
      key: 'host'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          local: { color: 'green', text: '本地' },
          remote_ssh: { color: 'blue', text: 'SSH远程' },
          remote_agent: { color: 'orange', text: '代理远程' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform'
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            size="small" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleTestConnection(record.id)}
          >
            测试
          </Button>
          <Popconfirm
            title="确定删除这个连接吗？"
            onConfirm={() => handleDeleteConnection(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 查询表格列定义
  const queryColumns: ColumnsType<SystemInfoQuery> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <DatabaseOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '信息类型',
      dataIndex: 'infoType',
      key: 'infoType'
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Badge 
          status={enabled ? 'success' : 'default'} 
          text={enabled ? '启用' : '禁用'} 
        />
      )
    },
    {
      title: '间隔(秒)',
      dataIndex: 'interval',
      key: 'interval'
    },
    {
      title: '最后执行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '结果数量',
      dataIndex: 'resultCount',
      key: 'resultCount',
      render: (count) => count || 0
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            size="small" 
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecuteQuery(record.id)}
          >
            执行
          </Button>
          <Popconfirm
            title="确定删除这个查询吗？"
            onConfirm={() => handleDeleteQuery(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 查询结果表格列定义
  const resultColumns: ColumnsType<SystemInfoQueryResult> = [
    {
      title: '查询ID',
      dataIndex: 'queryId',
      key: 'queryId'
    },
    {
      title: '执行时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount'
    },
    {
      title: '执行耗时(ms)',
      dataIndex: 'executionTime',
      key: 'executionTime'
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.error ? 'red' : 'green'}>
          {record.error ? '失败' : '成功'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => handleViewResult(record)}
        >
          查看
        </Button>
      )
    }
  ];

  // 渲染统计卡片
  const renderStatisticsCards = () => (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总连接数"
            value={statistics?.totalConnections || 0}
            prefix={<CloudServerOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="数据源数量"
            value={statistics?.totalDataSources || 0}
            prefix={<DatabaseOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="活跃查询"
            value={statistics?.activeQueries || 0}
            prefix={<BarChartOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="数据点总数"
            value={statistics?.totalDataPoints || 0}
            prefix={<SettingOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染性能监控 - 适配新的数据结构

const renderPerformanceMonitoring = () => {
  // 使用转换后的数据
  const cpuUsage = cpuInfo?.usage || 0;
  const memoryUsage = memoryInfo?.usage || 0;
  const diskUsage = diskInfo?.usage || 0;

  return (
    <Card title="性能监控" style={{ marginTop: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(cpuUsage)}
              format={percent => `${percent}%`}
              status={cpuUsage > 80 ? 'exception' : cpuUsage > 60 ? 'normal' : 'success'}
            />
            <div style={{ marginTop: 8, fontWeight: 'bold' }}>CPU使用率</div>
            {cpuInfo && (
              <div style={{ fontSize: 12, color: '#666' }}>
                {cpuInfo.cores} 核心
                {cpuInfo.frequency && ` | ${(cpuInfo.frequency / 1000).toFixed(1)} GHz`}
              </div>
            )}
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(memoryUsage)}
              format={percent => `${percent}%`}
              status={memoryUsage > 90 ? 'exception' : memoryUsage > 80 ? 'normal' : 'success'}
            />
            <div style={{ marginTop: 8, fontWeight: 'bold' }}>内存使用率</div>
            {memoryInfo && (
              <div style={{ fontSize: 12, color: '#666' }}>
                已用: {(memoryInfo.used / 1024 / 1024 / 1024).toFixed(1)}GB / 
                总计: {(memoryInfo.total / 1024 / 1024 / 1024).toFixed(1)}GB
              </div>
            )}
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={Math.round(diskUsage)}
              format={percent => `${percent}%`}
              status={diskUsage > 90 ? 'exception' : diskUsage > 80 ? 'normal' : 'success'}
            />
            <div style={{ marginTop: 8, fontWeight: 'bold' }}>磁盘使用率</div>
            {diskInfo && (
              <div style={{ fontSize: 12, color: '#666' }}>
                可用: {(diskInfo.available / 1024 / 1024 / 1024).toFixed(1)}GB
              </div>
            )}
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="活跃进程"
              value={processInfo?.running || 0}
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: 8 }}>
              <Statistic
                title="总进程数"
                value={processInfo?.total || 0}
                prefix={<DatabaseOutlined />}
              />
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

  // 渲染健康状态
  const renderHealthStatus = () => {
    if (!healthStatus) return null;

    const statusConfig = {
      healthy: { type: 'success', text: '健康' },
      unhealthy: { type: 'error', text: '不健康' }
    };
    
    const config = statusConfig[healthStatus.status] || { type: 'warning', text: '未知' };

    return (
      <Alert
        message={`系统状态: ${config.text}`}
        description={healthStatus.message || '系统运行正常'}
        type={config.type as any}
        showIcon
        style={{ marginTop: 16 }}
      />
    );
  };

  // 渲染错误提示
  const renderErrorAlerts = () => {
    const activeErrors = Object.entries(errors).filter(([_, value]) => value);
    if (activeErrors.length === 0) return null;

    return (
      <Alert
        message="后端服务异常"
        description={
          <div>
            <p>检测到以下问题：</p>
            <ul>
              {activeErrors.map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
            <p>请检查Python脚本路径和数据库连接配置</p>
          </div>
        }
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 安全的获取进程列表
  const getSafeProcessList = () => {
    if (!processInfo || !processInfo.processes || !Array.isArray(processInfo.processes)) {
      return [];
    }
    return processInfo.processes.slice(0, 5);
  };

  // 安全的获取进程统计信息
  const getProcessStats = () => {
    if (!processInfo) {
      return { total: '-', running: '-', sleeping: '-' };
    }
    return {
      total: processInfo.total ?? '-',
      running: processInfo.running ?? '-',
      sleeping: processInfo.sleeping ?? '-'
    };
  };

  // 渲染系统信息
  const renderSystemInfo = () => (
    <Card title="系统信息" size="small">
      {systemInfo ? (
        <Descriptions column={1} size="small">
          <Descriptions.Item label="主机名">{systemInfo.hostname}</Descriptions.Item>
          <Descriptions.Item label="平台">
            {systemInfo.platform} 
            {systemInfo.platform_version && ` (${systemInfo.platform_version})`}
          </Descriptions.Item>
          <Descriptions.Item label="架构">{systemInfo.architecture}</Descriptions.Item>
          <Descriptions.Item label="处理器">{systemInfo.processor}</Descriptions.Item>
         
          <Descriptions.Item label="在线用户">{systemInfo.users}</Descriptions.Item>
          {systemInfo.current_user && (
            <Descriptions.Item label="当前用户">{systemInfo.current_user}</Descriptions.Item>
          )}
          {systemInfo.boot_time_str && (
            <Descriptions.Item label="启动时间">
              {systemInfo.boot_time_str}
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : (
        <Empty description="系统信息加载中..." />
      )}
    </Card>
  );

  // 渲染进程信息
  const renderProcessInfo = () => (
    <Card title="进程信息" size="small">
      {processInfo ? (
        <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="总进程数">{processInfo.total}</Descriptions.Item>
            <Descriptions.Item label="运行中">{processInfo.running}</Descriptions.Item>
            <Descriptions.Item label="休眠中">{processInfo.sleeping}</Descriptions.Item>
          </Descriptions>
          <div style={{ marginTop: 16 }}>
            <h4>Top进程 (按CPU使用率)</h4>
            <List
              size="small"
              dataSource={getSafeProcessList()}
              renderItem={process => (
                <List.Item
                  actions={[
                    <Tag color="blue" key="cpu">CPU: {process.cpu.toFixed(1)}%</Tag>,
                    <Tag color="green" key="memory">内存: {process.memory.toFixed(1)}%</Tag>
                  ]}
                >
                  <List.Item.Meta
                    title={process.name}
                    description={`PID: ${process.pid} | 状态: ${process.status} ${process.user ? `| 用户: ${process.user}` : ''}`}
                  />
                </List.Item>
              )}
            />
          </div>
        </>
      ) : (
        <Empty description="进程信息加载中..." />
      )}
    </Card>
  );

  if (initialLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div>正在加载系统信息管理界面...</div>
        <Progress percent={30} status="active" style={{ marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 错误提示 */}
      {renderErrorAlerts()}

      {/* 统计信息 */}
      {renderStatisticsCards()}
      
      {/* 性能监控 */}
      {renderPerformanceMonitoring()}
      
      {/* 健康状态 */}
      {renderHealthStatus()}

      {/* 主内容区域 */}
      <Card style={{ marginTop: 16 }}>
        <Tabs defaultActiveKey="connections">
          {/* 连接管理 */}
          <TabPane tab="连接管理" key="connections">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setConnectionModalVisible(true)}
              >
                新建连接
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadConnections}
                style={{ marginLeft: 8 }}
              >
                刷新
              </Button>
            </div>
            {connections.length > 0 ? (
              <Table
                columns={connectionColumns}
                dataSource={connections}
                rowKey="id"
                loading={loading.connections}
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无连接数据" />
            )}
          </TabPane>

          {/* 查询管理 */}
          <TabPane tab="查询管理" key="queries">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setQueryModalVisible(true)}
              >
                新建查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadQueries}
                style={{ marginLeft: 8 }}
              >
                刷新
              </Button>
            </div>
            {queries.length > 0 ? (
              <Table
                columns={queryColumns}
                dataSource={queries}
                rowKey="id"
                loading={loading.queries}
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无查询数据" />
            )}
          </TabPane>

          {/* 查询结果 */}
          <TabPane tab="查询结果" key="results">
            {queryResults.length > 0 ? (
              <Table
                columns={resultColumns}
                dataSource={queryResults}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无查询结果" />
            )}
          </TabPane>

          {/* 实时信息 */}
          <TabPane tab={
            <span>
              实时信息
              {loading.realtime && <Badge dot style={{ marginLeft: 8 }} />}
            </span>
          } key="realtime">
            {loading.realtime && (
              <Alert
                message="正在加载实时数据..."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Row gutter={16}>
              <Col span={12}>
                {renderSystemInfo()}
              </Col>
              <Col span={12}>
                {renderProcessInfo()}
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 模态框 */}
      <Modal
        title="新建连接"
        open={connectionModalVisible}
        onCancel={() => setConnectionModalVisible(false)}
        footer={null}
      >
        <Form
          form={connectionForm}
          layout="vertical"
          onFinish={handleCreateConnection}
        >
          <Form.Item
            name="name"
            label="连接名称"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="输入连接名称" />
          </Form.Item>
          <Form.Item
            name="host"
            label="主机地址"
            rules={[{ required: true, message: '请输入主机地址' }]}
          >
            <Input placeholder="输入主机地址或IP" />
          </Form.Item>
          <Form.Item
            name="type"
            label="连接类型"
            rules={[{ required: true, message: '请选择连接类型' }]}
          >
            <Select placeholder="选择连接类型">
              <Option value="local">本地</Option>
              <Option value="remote_ssh">SSH远程</Option>
              <Option value="remote_agent">代理远程</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="platform"
            label="平台类型"
            rules={[{ required: true, message: '请选择平台类型' }]}
          >
            <Select placeholder="选择平台类型">
              <Option value="windows">Windows</Option>
              <Option value="linux">Linux</Option>
              <Option value="macos">macOS</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="输入连接描述（可选）" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setConnectionModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建查询"
        open={queryModalVisible}
        onCancel={() => setQueryModalVisible(false)}
        footer={null}
      >
        <Form
          form={queryForm}
          layout="vertical"
          onFinish={handleCreateQuery}
        >
          <Form.Item
            name="name"
            label="查询名称"
            rules={[{ required: true, message: '请输入查询名称' }]}
          >
            <Input placeholder="输入查询名称" />
          </Form.Item>
          <Form.Item
            name="infoType"
            label="信息类型"
            rules={[{ required: true, message: '请选择信息类型' }]}
          >
            <Select placeholder="选择信息类型">
              <Option value="cpu">CPU信息</Option>
              <Option value="memory">内存信息</Option>
              <Option value="disk">磁盘信息</Option>
              <Option value="network">网络信息</Option>
              <Option value="process">进程信息</Option>
              <Option value="system">系统信息</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="输入查询描述（可选）" />
          </Form.Item>
          <Form.Item
            name="interval"
            label="采集间隔(秒)"
            rules={[{ required: true, message: '请输入采集间隔' }]}
          >
            <InputNumber
              min={5}
              max={3600}
              placeholder="采集间隔秒数"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" defaultChecked />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setQueryModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="查询结果详情"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedResult && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="查询ID">{selectedResult.queryId}</Descriptions.Item>
              <Descriptions.Item label="执行时间">
                {dayjs(selectedResult.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="记录数">{selectedResult.recordCount}</Descriptions.Item>
              <Descriptions.Item label="执行耗时">{selectedResult.executionTime}ms</Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 16 }}>
              <h4>数据预览</h4>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto'
              }}>
                {JSON.stringify(selectedResult.data, null, 2)}
              </pre>
            </div>

            {selectedResult.error && (
              <Alert
                message="执行错误"
                description={selectedResult.error}
                type="error"
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// 用错误边界包裹导出
const SystemInfoManagementWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <SystemInfoManagement />
  </ErrorBoundary>
);

export default SystemInfoManagementWithErrorBoundary;