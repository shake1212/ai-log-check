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
  Empty,
  Typography,
  Divider,
  Tooltip
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
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  DashboardFilled,
  SyncOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  SecurityScanOutlined,
  FireOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  ExportOutlined,
  BellOutlined,
  PauseCircleOutlined,
  PlayCircleFilled,
  CodeOutlined,
  FileExcelOutlined,
  FilePdfOutlined
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
const { Text, Title, Paragraph } = Typography;

// 颜色常量
const LEVEL_COLORS = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
  INFO: '#1890ff'
};

const LEVEL_GRADIENTS = {
  CRITICAL: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  HIGH: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)',
  MEDIUM: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  LOW: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  INFO: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  HEALTHY: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  WARNING: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  CRITICAL_GRADIENT: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
};

// 错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  override componentDidCatch(error: any, errorInfo: any) {
    console.error('Component error:', error, errorInfo);
  }

  override render() {
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isPaused, setIsPaused] = useState(false);

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

  // 带超时的 Promise 包装函数
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      )
    ]);
  };

  // 加载实时信息
  const loadRealTimeInfo = useCallback(async () => {
    setLoading(prev => ({ ...prev, realtime: true }));
    try {
      console.log('Loading realtime info...');
      const [system, cpu, memory, disk, processes] = await Promise.allSettled([
        withTimeout(systemInfoApiService.getRealTimeSystemInfo(), 5000).catch(() => null),
        withTimeout(systemInfoApiService.getRealTimeCpuInfo(), 5000).catch(() => null),
        withTimeout(systemInfoApiService.getRealTimeMemoryInfo(), 5000).catch(() => null),
        withTimeout(systemInfoApiService.getRealTimeDiskInfo(), 5000).catch(() => null),
        withTimeout(systemInfoApiService.getRealTimeProcessInfo(), 5000).catch(() => null)
      ]);

      // 处理每个实时信息
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
        // 第一阶段：立即加载关键数据
        await Promise.allSettled([
          loadConnections(),
          loadQueries(),
          loadQueryResults()
        ]);
        
        // 设置初始加载完成
        setInitialLoading(false);
        console.log('Initial loading completed');

        // 第二阶段：延迟加载较慢的数据
        setTimeout(async () => {
          await Promise.allSettled([
            loadStatistics(),
            loadRealTimeInfo()
          ]);
        }, 500);
      } catch (error) {
        console.error('Initialization failed:', error);
        setInitialLoading(false);
      }
    };

    initializeData();

    // 设置定时刷新
    const interval = setInterval(() => {
      if (!isPaused) {
        loadStatistics();
        loadRealTimeInfo();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loadConnections, loadQueries, loadQueryResults, loadStatistics, loadRealTimeInfo, isPaused]);

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
      const firstConnection = connections[0];
      if (!firstConnection || !firstConnection.id) {
        message.error('连接ID无效');
        return;
      }
      const connectionId = firstConnection.id;
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

  // 渲染顶部仪表盘标题
  const renderDashboardHeader = () => (
    <div style={{
      marginBottom: '32px',
      padding: '32px',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      borderRadius: '20px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(26, 41, 128, 0.2)'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <CloudServerOutlined style={{ fontSize: '36px', color: 'white' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              智能系统资源监控
            </Title>
            <Paragraph style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '16px',
              maxWidth: '600px'
            }}>
              实时监控系统资源使用情况，智能分析性能指标，提供全方位系统健康管理
            </Paragraph>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: healthStatus?.status === 'healthy' ? '#52c41a' : '#ff4d4f',
              boxShadow: `0 0 10px ${healthStatus?.status === 'healthy' ? '#52c41a' : '#ff4d4f'}`
            }} />
            <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              {healthStatus?.status === 'healthy' ? '系统运行正常' : '系统异常'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              • 最后更新: {new Date().toLocaleTimeString()}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染顶部操作栏
  const renderControlBar = () => (
    <Card 
      style={{ 
        marginBottom: '32px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ minWidth: '300px' }}
          >
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DashboardFilled />
                  系统概览
                </span>
              } 
              key="overview" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CloudServerOutlined />
                  连接管理
                </span>
              } 
              key="connections" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DatabaseOutlined />
                  查询管理
                </span>
              } 
              key="queries" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChartOutlined />
                  实时监控
                </span>
              } 
              key="monitoring" 
            />
          </Tabs>
        </div>
        <div>
          <Space size="large" wrap>
            <Button
              type="primary"
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => setIsPaused(!isPaused)}
              shape="round"
              size="large"
              style={{
                background: isPaused ? '#1890ff' : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                padding: '0 24px',
                height: '44px'
              }}
            >
              {isPaused ? '恢复监控' : '暂停监控'}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (activeTab === 'connections') setConnectionModalVisible(true);
                else if (activeTab === 'queries') setQueryModalVisible(true);
              }}
              shape="round"
              size="large"
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                border: 'none',
                padding: '0 24px',
                height: '44px'
              }}
            >
              {activeTab === 'connections' ? '新建连接' : activeTab === 'queries' ? '新建查询' : '新建'}
            </Button>

            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                loadConnections();
                loadQueries();
                loadQueryResults();
                loadStatistics();
                loadRealTimeInfo();
              }}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              刷新数据
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );

  // 渲染核心指标卡片
  const renderCoreMetrics = () => {
    const cpuUsage = cpuInfo?.usage || 0;
    const memoryUsage = memoryInfo?.usage || 0;
    const diskUsage = diskInfo?.usage || 0;
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* CPU使用率卡片 */}
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            border: 'none',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
          }}
          bodyStyle={{ 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                CPU使用率
              </Text>
              <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: cpuUsage > 80 ? '#ff4d4f' : cpuUsage > 60 ? '#fa8c16' : '#52c41a' }}>
                {cpuUsage.toFixed(1)}%
              </Title>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: cpuUsage > 80 ? LEVEL_GRADIENTS.CRITICAL_GRADIENT :
                        cpuUsage > 60 ? LEVEL_GRADIENTS.WARNING : LEVEL_GRADIENTS.HEALTHY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ThunderboltOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
          </div>
          
          <Progress 
            percent={cpuUsage}
            strokeColor={cpuUsage > 80 ? '#ff4d4f' : cpuUsage > 60 ? '#fa8c16' : '#52c41a'}
            strokeWidth={6}
            style={{ margin: '12px 0' }}
          />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: 'auto'
          }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>核心数</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{cpuInfo?.cores || 'N/A'}</Text>
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>频率</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{cpuInfo?.frequency ? `${(cpuInfo.frequency / 1000).toFixed(1)}GHz` : 'N/A'}</Text>
            </div>
          </div>
        </Card>

        {/* 内存使用率卡片 */}
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            border: 'none',
            background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
            boxShadow: '0 6px 16px rgba(24, 144, 255, 0.12)'
          }}
          bodyStyle={{ 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                内存使用率
              </Text>
              <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: memoryUsage > 90 ? '#ff4d4f' : memoryUsage > 80 ? '#fa8c16' : '#096dd9' }}>
                {memoryUsage.toFixed(1)}%
              </Title>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: memoryUsage > 90 ? LEVEL_GRADIENTS.CRITICAL_GRADIENT :
                        memoryUsage > 80 ? LEVEL_GRADIENTS.WARNING : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DatabaseOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: '12px 0'
          }}>
            <ArrowUpOutlined style={{ color: memoryUsage > 80 ? '#ff4d4f' : '#52c41a' }} />
            <Text strong style={{ fontSize: '14px', color: memoryUsage > 80 ? '#ff4d4f' : '#389e0d' }}>
              已用 {(memoryInfo?.used || 0 / 1024 / 1024 / 1024).toFixed(1)}GB
            </Text>
            <Tag color={memoryUsage > 90 ? 'error' : memoryUsage > 80 ? 'warning' : 'success'} style={{ marginLeft: 'auto' }}>
              {memoryUsage > 80 ? '告警' : '正常'}
            </Tag>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: 'auto'
          }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>总内存</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{memoryInfo?.total ? `${(memoryInfo.total / 1024 / 1024 / 1024).toFixed(1)}GB` : 'N/A'}</Text>
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>可用</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{memoryInfo?.available ? `${(memoryInfo.available / 1024 / 1024 / 1024).toFixed(1)}GB` : 'N/A'}</Text>
            </div>
          </div>
        </Card>

        {/* 磁盘使用率卡片 */}
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            border: 'none',
            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
            boxShadow: '0 6px 16px rgba(82, 196, 26, 0.12)'
          }}
          bodyStyle={{ 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                磁盘使用率
              </Text>
              <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: diskUsage > 90 ? '#ff4d4f' : diskUsage > 80 ? '#fa8c16' : '#389e0d' }}>
                {diskUsage.toFixed(1)}%
              </Title>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: diskUsage > 90 ? LEVEL_GRADIENTS.CRITICAL_GRADIENT :
                        diskUsage > 80 ? LEVEL_GRADIENTS.WARNING : LEVEL_GRADIENTS.HEALTHY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SafetyCertificateOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
          </div>
          
          <div style={{ margin: '12px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ 
                background: 'rgba(82, 196, 26, 0.1)',
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                  {diskInfo?.available ? `${(diskInfo.available / 1024 / 1024 / 1024).toFixed(1)}` : '0'}GB
                </Text>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  可用空间
                </div>
              </div>
              <div style={{ 
                background: 'rgba(255, 77, 79, 0.1)',
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <Text strong style={{ color: '#ff4d4f', fontSize: '18px' }}>
                  {diskInfo?.used ? `${(diskInfo.used / 1024 / 1024 / 1024).toFixed(1)}` : '0'}GB
                </Text>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  已用空间
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: 'auto'
          }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>总空间</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{diskInfo?.total ? `${(diskInfo.total / 1024 / 1024 / 1024).toFixed(1)}GB` : 'N/A'}</Text>
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>使用率</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{diskUsage.toFixed(1)}%</Text>
            </div>
          </div>
        </Card>

        {/* 连接数卡片 */}
        <Card 
          hoverable
          style={{ 
            borderRadius: '16px',
            overflow: 'hidden',
            border: 'none',
            background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
            boxShadow: '0 6px 16px rgba(250, 140, 22, 0.12)'
          }}
          bodyStyle={{ 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                系统连接数
              </Text>
              <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#d46b08' }}>
                {statistics?.totalConnections || 0}
              </Title>
            </div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TeamOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: '12px 0'
          }}>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: '12px', color: '#666' }}>查询活跃度</Text>
              <Progress 
                percent={Math.min((statistics?.activeQueries || 0) * 10, 100)} 
                size="small"
                strokeColor="#fa8c16"
              />
            </div>
            <Text strong style={{ fontSize: '16px', color: '#d46b08' }}>
              {statistics?.activeQueries || 0}
            </Text>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: 'auto'
          }}>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>活跃查询</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{statistics?.activeQueries || 0}</Text>
            </div>
            <div>
              <Text style={{ fontSize: '12px', color: '#666' }}>总数据点</Text>
              <Text strong style={{ fontSize: '16px', display: 'block' }}>{statistics?.totalDataPoints || 0}</Text>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // 渲染性能监控
  const renderPerformanceMonitoring = () => {
    const cpuUsage = cpuInfo?.usage || 0;
    const memoryUsage = memoryInfo?.usage || 0;
    const diskUsage = diskInfo?.usage || 0;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LineChartOutlined />
              <Text strong style={{ fontSize: '16px' }}>系统性能监控</Text>
            </div>
          }
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag color="processing" icon={<ClockCircleOutlined />}>
                实时更新中
              </Tag>
              <Button 
                type="text" 
                icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={() => setIsPaused(!isPaused)}
                size="small"
              />
            </div>
          }
          style={{ 
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="dashboard"
                  percent={Math.round(cpuUsage)}
                  format={percent => `${percent}%`}
                  strokeColor={cpuUsage > 80 ? '#ff4d4f' : cpuUsage > 60 ? '#fa8c16' : '#52c41a'}
                  strokeWidth={10}
                  size={180}
                />
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '16px' }}>CPU使用率</div>
                {cpuInfo && (
                  <div style={{ fontSize: '12px', color: '#00000073', marginTop: '8px' }}>
                    {cpuInfo.cores} 核心
                    {cpuInfo.frequency && ` | ${(cpuInfo.frequency / 1000).toFixed(1)} GHz`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="dashboard"
                  percent={Math.round(memoryUsage)}
                  format={percent => `${percent}%`}
                  strokeColor={memoryUsage > 90 ? '#ff4d4f' : memoryUsage > 80 ? '#fa8c16' : '#1890ff'}
                  strokeWidth={10}
                  size={180}
                />
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '16px' }}>内存使用率</div>
                {memoryInfo && (
                  <div style={{ fontSize: '12px', color: '#00000073', marginTop: '8px' }}>
                    已用: {(memoryInfo.used / 1024 / 1024 / 1024).toFixed(1)} GB / 总量: {(memoryInfo.total / 1024 / 1024 / 1024).toFixed(1)} GB
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ 
            padding: '16px 24px', 
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>磁盘使用率</Text>
                <Text strong style={{ display: 'block', fontSize: '14px', color: diskUsage > 90 ? '#ff4d4f' : diskUsage > 80 ? '#fa8c16' : '#52c41a' }}>
                  {diskUsage.toFixed(1)}%
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>活跃进程</Text>
                <Text strong style={{ display: 'block', fontSize: '14px' }}>{processInfo?.running || 0}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>在线用户</Text>
                <Text strong style={{ display: 'block', fontSize: '14px' }}>{systemInfo?.users || 0}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>系统负载</Text>
                <Text strong style={{ display: 'block', fontSize: '14px' }}>
                  {cpuInfo?.load1 ? cpuInfo.load1.toFixed(2) : 'N/A'}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartOutlined />
              <Text strong style={{ fontSize: '16px' }}>系统信息概览</Text>
            </div>
          }
          style={{ 
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          {systemInfo ? (
            <Descriptions column={2} size="middle" bordered>
              <Descriptions.Item label="主机名" span={2}>
                {systemInfo.hostname}
              </Descriptions.Item>
              <Descriptions.Item label="平台">
                {systemInfo.platform} 
                {systemInfo.platform_version && ` (${systemInfo.platform_version})`}
              </Descriptions.Item>
              <Descriptions.Item label="架构">
                {systemInfo.architecture}
              </Descriptions.Item>
              <Descriptions.Item label="处理器">
                {systemInfo.processor}
              </Descriptions.Item>
              <Descriptions.Item label="在线用户">
                {systemInfo.users}
              </Descriptions.Item>
              {systemInfo.current_user && (
                <Descriptions.Item label="当前用户">
                  {systemInfo.current_user}
                </Descriptions.Item>
              )}
              {systemInfo.boot_time_str && (
                <Descriptions.Item label="启动时间" span={2}>
                  {systemInfo.boot_time_str}
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Empty description="系统信息加载中..." />
          )}
        </Card>
      </div>
    );
  };

  // 连接表格列定义
  const connectionColumns: ColumnsType<SystemInfoConnection> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudServerOutlined style={{ color: 'white', fontSize: '16px' }} />
          </div>
          <div>
            <Text strong>{text}</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.host}</div>
          </div>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          local: { color: 'green', text: '本地', gradient: LEVEL_GRADIENTS.LOW },
          remote_ssh: { color: 'blue', text: 'SSH远程', gradient: LEVEL_GRADIENTS.INFO },
          remote_agent: { color: 'orange', text: '代理远程', gradient: LEVEL_GRADIENTS.MEDIUM }
        };
        const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type, gradient: LEVEL_GRADIENTS.INFO };
        return (
          <div style={{
            padding: '4px 12px',
            background: config.gradient,
            borderRadius: '20px',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500',
            textAlign: 'center',
            display: 'inline-block'
          }}>
            {config.text}
          </div>
        );
      }
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform) => (
        <Tag color="processing">{platform}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (time) => time ? (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            {dayjs(time).format('MM-DD HH:mm')}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(time).format('YYYY')}
          </div>
        </div>
      ) : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleTestConnection(record.id)}
            style={{
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              border: 'none'
            }}
          >
            测试
          </Button>
          <Popconfirm
            title="确定删除这个连接吗？"
            description="删除后无法恢复，请谨慎操作"
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
      render: (text, record) => (
        <Space>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DatabaseOutlined style={{ color: 'white', fontSize: '16px' }} />
          </div>
          <div>
            <Text strong>{text}</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.description || '无描述'}</div>
          </div>
        </Space>
      )
    },
    {
      title: '信息类型',
      dataIndex: 'infoType',
      key: 'infoType',
      render: (type) => {
        const typeColors = {
          cpu: 'magenta',
          memory: 'blue',
          disk: 'green',
          network: 'purple',
          process: 'orange',
          system: 'cyan'
        };
        return (
          <Tag color={typeColors[type as keyof typeof typeColors] || 'default'}>
            {type}
          </Tag>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Badge 
          status={enabled ? 'success' : 'default'} 
          text={
            <div style={{
              padding: '2px 8px',
              background: enabled ? 'rgba(82, 196, 26, 0.1)' : 'rgba(0,0,0,0.06)',
              borderRadius: '12px',
              fontSize: '12px',
              color: enabled ? '#52c41a' : '#666'
            }}>
              {enabled ? '启用' : '禁用'}
            </div>
          }
        />
      )
    },
    {
      title: '最后执行',
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (time) => time ? (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            {dayjs(time).format('MM-DD HH:mm')}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs().diff(dayjs(time), 'hour') < 24 ? `${dayjs().diff(dayjs(time), 'hour')}小时前` : '更早'}
          </div>
        </div>
      ) : '从未执行'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecuteQuery(record.id)}
            style={{
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              border: 'none'
            }}
          >
            执行
          </Button>
          <Popconfirm
            title="确定删除这个查询吗？"
            description="删除后无法恢复，请谨慎操作"
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
      title: '查询名称',
      dataIndex: 'queryId',
      key: 'queryId',
      render: (queryId) => {
        const query = queries.find(q => q.id === queryId);
        return query?.name || queryId;
      }
    },
    {
      title: '执行时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            {dayjs(time).format('MM-DD HH:mm:ss')}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(time).format('YYYY')}
          </div>
        </div>
      )
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      render: (count) => (
        <Badge 
          count={count} 
          style={{ 
            backgroundColor: count > 1000 ? '#ff4d4f' : count > 100 ? '#fa8c16' : '#52c41a',
            fontSize: '12px'
          }} 
        />
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <div style={{
          padding: '4px 12px',
          background: record.error ? LEVEL_GRADIENTS.CRITICAL_GRADIENT : LEVEL_GRADIENTS.HEALTHY,
          borderRadius: '20px',
          color: 'white',
          fontSize: '12px',
          fontWeight: '500',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          {record.error ? '失败' : '成功'}
        </div>
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
          style={{
            background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
            border: 'none',
            color: 'white'
          }}
        >
          查看详情
        </Button>
      )
    }
  ];

  // 渲染进程信息
  const renderProcessInfo = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SecurityScanOutlined />
          <Text strong style={{ fontSize: '16px' }}>进程监控</Text>
          <Badge count={processInfo?.running || 0} style={{ backgroundColor: '#ff4d4f' }} />
        </div>
      }
      style={{ 
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '24px' }}>
        {processInfo ? (
          <>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <Card size="small" hoverable style={{ textAlign: 'center', borderRadius: '12px' }}>
                <Text strong style={{ fontSize: '24px', color: '#1890ff' }}>{processInfo.total || 0}</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>总进程数</div>
              </Card>
              <Card size="small" hoverable style={{ 
                textAlign: 'center', 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(82,196,26,0.1) 0%, rgba(56,158,13,0.05) 100%)'
              }}>
                <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>{processInfo.running || 0}</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>运行中</div>
              </Card>
              <Card size="small" hoverable style={{ 
                textAlign: 'center', 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(250,140,22,0.1) 0%, rgba(212,107,8,0.05) 100%)'
              }}>
                <Text strong style={{ fontSize: '24px', color: '#fa8c16' }}>{processInfo.sleeping || 0}</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>休眠中</div>
              </Card>
              <Card size="small" hoverable style={{ 
                textAlign: 'center', 
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(255,77,79,0.1) 0%, rgba(207,19,34,0.05) 100%)'
              }}>
                <Text strong style={{ fontSize: '24px', color: '#ff4d4f' }}>{processInfo.zombie || 0}</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>僵尸进程</div>
              </Card>
            </div>

            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <List
                size="small"
                dataSource={processInfo.processes?.slice(0, 10) || []}
                renderItem={process => (
                  <List.Item
                    style={{ 
                      padding: '12px 16px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: process.cpu > 10 ? LEVEL_GRADIENTS.CRITICAL_GRADIENT :
                                  process.cpu > 5 ? LEVEL_GRADIENTS.HIGH : LEVEL_GRADIENTS.LOW,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <UserOutlined style={{ color: 'white', fontSize: '18px' }} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text strong style={{ fontSize: '14px' }}>{process.name}</Text>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              PID: {process.pid} • 用户: {process.user || 'N/A'} • 状态: {process.status}
                            </div>
                          </div>
                          <div>
                            <div style={{ 
                              padding: '2px 8px',
                              background: 'rgba(24, 144, 255, 0.1)',
                              borderRadius: '10px',
                              fontSize: '11px',
                              textAlign: 'center'
                            }}>
                              CPU: {process.cpu.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <Progress 
                              percent={Math.min(process.cpu, 100)} 
                              size="small" 
                              strokeColor={process.cpu > 10 ? '#ff4d4f' : process.cpu > 5 ? '#fa8c16' : '#52c41a'}
                            />
                          </div>
                          <div style={{ 
                            padding: '2px 8px',
                            background: 'rgba(82, 196, 26, 0.1)',
                            borderRadius: '10px',
                            fontSize: '11px',
                            textAlign: 'center'
                          }}>
                            内存: {process.memory.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </>
        ) : (
          <Empty description="进程信息加载中..." />
        )}
      </div>
    </Card>
  );

  // 渲染健康状态
  const renderHealthStatus = () => {
    if (!healthStatus) return null;

    const statusConfig = {
      healthy: { type: 'success', text: '健康', gradient: LEVEL_GRADIENTS.HEALTHY, icon: <CheckCircleOutlined /> },
      unhealthy: { type: 'error', text: '异常', gradient: LEVEL_GRADIENTS.CRITICAL_GRADIENT, icon: <ExclamationCircleOutlined /> }
    };
    
    const config = statusConfig[healthStatus.status] || { 
      type: 'warning', 
      text: '未知', 
      gradient: LEVEL_GRADIENTS.WARNING,
      icon: <WarningOutlined />
    };

    return (
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: config.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {React.cloneElement(config.icon, { style: { fontSize: '20px', color: 'white' } })}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                系统健康状态: {config.text}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.65)' }}>
                {healthStatus.message || '系统运行正常'}
              </div>
            </div>
          </div>
        }
        type={config.type as any}
        showIcon={false}
        style={{ 
          marginBottom: 16,
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,249,250,0.9) 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      />
    );
  };

  // 渲染错误提示
  const renderErrorAlerts = () => {
    const activeErrors = Object.entries(errors).filter(([_, value]) => value);
    if (activeErrors.length === 0) return null;

    return (
      <Alert
        message="系统服务异常"
        description={
          <div>
            <p>检测到以下问题：</p>
            <ul>
              {activeErrors.map(([key, value]) => (
                <li key={key}>{value}</li>
              ))}
            </ul>
            <p>请检查系统连接和配置</p>
          </div>
        }
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ 
          marginBottom: 16,
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, rgba(250,173,20,0.1) 0%, rgba(250,140,22,0.05) 100%)',
          boxShadow: '0 4px 20px rgba(250, 173, 20, 0.15)'
        }}
      />
    );
  };

  const renderContent = () => {
    if (initialLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '70vh',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudServerOutlined style={{ fontSize: '36px', color: 'white' }} />
          </div>
          <Title level={4} style={{ margin: 0 }}>加载系统信息管理界面...</Title>
          <Paragraph type="secondary">正在获取系统资源和性能数据</Paragraph>
        </div>
      );
    }

    return (
      <div style={{ 
        padding: '32px',
        maxWidth: '1600px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {renderDashboardHeader()}
        {renderControlBar()}
        
        {renderErrorAlerts()}
        {renderHealthStatus()}

        {renderCoreMetrics()}
        {renderPerformanceMonitoring()}
        {renderProcessInfo()}


        {/* 底部信息栏 */}
        <div style={{ 
          marginTop: '40px', 
          padding: '20px',
          textAlign: 'center', 
          color: '#666',
          fontSize: '12px',
          borderTop: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: '12px'
        }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <Text strong>系统版本</Text>
              <div>v2.1.0 Enterprise</div>
            </div>
            <div>
              <Text strong>数据延迟</Text>
              <div>&lt; {!isPaused ? '100ms' : '已暂停' }</div>
            </div>
            <div>
              <Text strong>最后检查</Text>
              <div>{new Date().toLocaleString()}</div>
            </div>
            <div>
              <Text strong>系统状态</Text>
              <div>
                <Badge 
                  status={healthStatus?.status === 'healthy' ? "success" : "error"} 
                  text={healthStatus?.status === 'healthy' ? '运行正常' : '连接异常'} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

// 用错误边界包裹导出
const SystemInfoManagementWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <SystemInfoManagement />
  </ErrorBoundary>
);

export default SystemInfoManagementWithErrorBoundary;