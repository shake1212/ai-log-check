// components/SystemInfoManagement.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Statistic,
  Spin,
  Alert,
  Modal,
  Descriptions,
  Badge,
  Empty,
  Progress,
  List
} from 'antd';
import {
  BarChartOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  WarningOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  systemInfoApiService,
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

// 错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
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
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SystemInfoQueryResult | null>(null);

  // 加载状态
  const [loading, setLoading] = useState({
    statistics: false,
    realtime: false
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [initialLoading, setInitialLoading] = useState(true);

  const isMountedRef = useRef(true);

  // 格式化字节
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  // 加载查询结果
  const loadQueryResults = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const data = await systemInfoApiService.getQueryResults();
      if (isMountedRef.current) setQueryResults(data);
    } catch (error) {
      console.error('Failed to load query results:', error);
    }
  }, []);

  // 加载统计信息
  const loadStatistics = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(prev => ({ ...prev, statistics: true }));
    try {
      const [stats, metrics, health] = await Promise.allSettled([
        systemInfoApiService.getStatistics(),
        systemInfoApiService.getPerformanceMetrics(),
        systemInfoApiService.healthCheck()
      ]);
      if (isMountedRef.current) {
        if (stats.status === 'fulfilled') setStatistics(stats.value);
        if (metrics.status === 'fulfilled') setPerformanceMetrics(metrics.value);
        if (health.status === 'fulfilled') setHealthStatus(health.value);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      if (isMountedRef.current) setLoading(prev => ({ ...prev, statistics: false }));
    }
  }, []);

  // 加载实时信息
  const loadRealTimeInfo = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(prev => ({ ...prev, realtime: true }));
    setErrors(prev => {
      const { realtime: _, ...rest } = prev;
      return rest;
    });
    try {
      const [system, cpu, memory, disk, processes] = await Promise.allSettled([
        systemInfoApiService.getRealTimeSystemInfo(),
        systemInfoApiService.getRealTimeCpuInfo(),
        systemInfoApiService.getRealTimeMemoryInfo(),
        systemInfoApiService.getRealTimeDiskInfo(),
        systemInfoApiService.getRealTimeProcessInfo()
      ]);
      if (isMountedRef.current) {
        const newErrors: string[] = [];

        if (system.status === 'fulfilled') {
          setSystemInfo(system.value);
          if (system.value.hostname === 'localhost' && system.value.platform === 'Unknown') {
            newErrors.push('系统信息获取失败，后端可能未正确执行Python脚本');
          }
        } else {
          newErrors.push('系统信息请求失败');
        }

        if (cpu.status === 'fulfilled') {
          setCpuInfo(cpu.value);
          if (cpu.value.usage === 0 && cpu.value.cores === 1 && cpu.value.frequency === 0) {
            newErrors.push('CPU信息获取失败');
          }
        } else {
          newErrors.push('CPU信息请求失败');
        }

        if (memory.status === 'fulfilled') {
          setMemoryInfo(memory.value);
          if (memory.value.total === 0) {
            newErrors.push('内存信息获取失败');
          }
        } else {
          newErrors.push('内存信息请求失败');
        }

        if (disk.status === 'fulfilled') {
          setDiskInfo(disk.value);
          if (disk.value.total === 0) {
            newErrors.push('磁盘信息获取失败');
          }
        } else {
          newErrors.push('磁盘信息请求失败');
        }

        if (processes.status === 'fulfilled') {
          setProcessInfo(processes.value);
        } else {
          newErrors.push('进程信息请求失败');
        }

        if (newErrors.length > 0) {
          setErrors(prev => ({ ...prev, realtime: newErrors.join('; ') }));
        }
      }
    } catch (error) {
      console.error('Failed to load realtime info:', error);
      if (isMountedRef.current) {
        setErrors(prev => ({ ...prev, realtime: '实时数据加载异常' }));
      }
    } finally {
      if (isMountedRef.current) setLoading(prev => ({ ...prev, realtime: false }));
    }
  }, []);

  // 初始化
  useEffect(() => {
    isMountedRef.current = true;

    const initializeData = async () => {
      try {
        await Promise.allSettled([
          loadQueryResults(),
          loadStatistics(),
          loadRealTimeInfo()
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        if (isMountedRef.current) setInitialLoading(false);
      }
    };

    initializeData();

    const interval = setInterval(() => {
      loadStatistics();
      loadRealTimeInfo();
    }, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 查看结果详情
  const handleViewResult = (result: SystemInfoQueryResult) => {
    setSelectedResult(result);
    setResultModalVisible(true);
  };

  // 查询结果列定义
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
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewResult(record)}>
          查看
        </Button>
      )
    }
  ];

  // 统计卡片
  const renderStatisticsCards = () => (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="总连接数" value={statistics?.totalConnections || 0} prefix={<CloudServerOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="数据源数量" value={statistics?.totalDataSources || 0} prefix={<DatabaseOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="活跃查询" value={statistics?.activeQueries || 0} prefix={<BarChartOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="数据点总数" value={statistics?.totalDataPoints || 0} prefix={<SettingOutlined />} />
        </Card>
      </Col>
    </Row>
  );

  // 健康状态
  const renderHealthStatus = () => {
    if (!healthStatus) return null;
    const statusConfig: Record<string, { type: 'success' | 'error' | 'warning'; text: string }> = {
      healthy: { type: 'success', text: '健康' },
      unhealthy: { type: 'error', text: '不健康' }
    };
    const config = statusConfig[healthStatus.status] || { type: 'warning' as const, text: '未知' };
    return (
      <Alert
        message={`系统状态: ${config.text}`}
        description={healthStatus.message || '系统运行正常'}
        type={config.type}
        showIcon
        style={{ marginTop: 16 }}
      />
    );
  };

  // 错误提示
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
              {activeErrors.map(([key, value]) => <li key={key}>{value}</li>)}
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

  // 使用率颜色
  const getUsageColor = (usage: number): string => {
    if (usage >= 90) return '#cf1322';
    if (usage >= 70) return '#fa8c16';
    if (usage >= 50) return '#fadb14';
    return '#52c41a';
  };

  // CPU 信息
  const renderCpuInfo = () => (
    <Card title="CPU" size="small">
      {cpuInfo ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Progress
              type="dashboard"
              percent={Math.round(cpuInfo.usage)}
              strokeColor={getUsageColor(cpuInfo.usage)}
              format={percent => `${percent}%`}
              size={120}
            />
          </div>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="核心数">{cpuInfo.cores}</Descriptions.Item>
            <Descriptions.Item label="频率">{cpuInfo.frequency ? `${cpuInfo.frequency.toFixed(0)} MHz` : '-'}</Descriptions.Item>
            {cpuInfo.load_average && cpuInfo.load_average.length >= 3 && (
              <Descriptions.Item label="负载均值" span={2}>
                {cpuInfo.load_average.map((v, i) => (
                  <Tag key={i} color={i === 0 ? 'blue' : 'default'}>{v.toFixed(2)}</Tag>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      ) : (
        <Empty description="CPU信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );

  // 内存信息
  const renderMemoryInfo = () => (
    <Card title="内存" size="small">
      {memoryInfo && memoryInfo.total > 0 ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Progress
              type="dashboard"
              percent={Math.round(memoryInfo.usage)}
              strokeColor={getUsageColor(memoryInfo.usage)}
              format={percent => `${percent}%`}
              size={120}
            />
          </div>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="已用 / 总量">
              {formatBytes(memoryInfo.used)} / {formatBytes(memoryInfo.total)}
            </Descriptions.Item>
            <Descriptions.Item label="可用">{formatBytes(memoryInfo.available)}</Descriptions.Item>
            {memoryInfo.swap_total != null && memoryInfo.swap_total > 0 && (
              <Descriptions.Item label="Swap">
                {formatBytes(memoryInfo.swap_used || 0)} / {formatBytes(memoryInfo.swap_total)}
                {memoryInfo.swap_percent != null && ` (${memoryInfo.swap_percent.toFixed(1)}%)`}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      ) : (
        <Empty description="内存信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );

  // 磁盘信息
  const renderDiskInfo = () => (
    <Card title="磁盘" size="small">
      {diskInfo && diskInfo.total > 0 ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Progress
              type="dashboard"
              percent={Math.round(diskInfo.usage)}
              strokeColor={getUsageColor(diskInfo.usage)}
              format={percent => `${percent}%`}
              size={120}
            />
          </div>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="已用 / 总量">
              {formatBytes(diskInfo.used)} / {formatBytes(diskInfo.total)}
            </Descriptions.Item>
            <Descriptions.Item label="可用">{formatBytes(diskInfo.available)}</Descriptions.Item>
            {diskInfo.partitions && diskInfo.partitions.length > 0 && (
              <Descriptions.Item label="分区">
                {diskInfo.partitions.map((p, i) => (
                  <Tag key={i}>{p.device} ({p.mountpoint}) {p.percent.toFixed(0)}%</Tag>
                ))}
              </Descriptions.Item>
            )}
            {(diskInfo.read_bytes != null || diskInfo.write_bytes != null) && (
              <Descriptions.Item label="读写">
                读: {formatBytes(diskInfo.read_bytes || 0)}/s &nbsp; 写: {formatBytes(diskInfo.write_bytes || 0)}/s
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      ) : (
        <Empty description="磁盘信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );

  // 系统信息
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
            <Descriptions.Item label="启动时间">{systemInfo.boot_time_str}</Descriptions.Item>
          )}
        </Descriptions>
      ) : (
        <Empty description="系统信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );

  // 进程信息
  const renderProcessInfo = () => {
    const safeProcessList = processInfo?.processes && Array.isArray(processInfo.processes)
      ? processInfo.processes.slice(0, 5)
      : [];

    return (
      <Card title="进程信息" size="small">
        {processInfo ? (
          <>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="总进程数">{processInfo.total}</Descriptions.Item>
              <Descriptions.Item label="运行中">{processInfo.running}</Descriptions.Item>
              <Descriptions.Item label="休眠中">{processInfo.sleeping}</Descriptions.Item>
            </Descriptions>
            {safeProcessList.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4>Top进程 (按CPU使用率)</h4>
                <List
                  size="small"
                  dataSource={safeProcessList}
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
            )}
          </>
        ) : (
          <Empty description="进程信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    );
  };

  if (initialLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" tip="正在加载系统信息管理界面...">
          <div style={{ minHeight: 100 }} />
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {renderErrorAlerts()}
      {renderStatisticsCards()}
      {renderHealthStatus()}

      {/* 实时信息 */}
      <Card
        title="实时信息"
        style={{ marginTop: 16 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRealTimeInfo}
            loading={loading.realtime}
          >
            刷新
          </Button>
        }
      >
        {loading.realtime && (
          <Alert message="正在刷新实时数据..." type="info" showIcon style={{ marginBottom: 16 }} />
        )}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>{renderCpuInfo()}</Col>
          <Col span={8}>{renderMemoryInfo()}</Col>
          <Col span={8}>{renderDiskInfo()}</Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>{renderSystemInfo()}</Col>
          <Col span={12}>{renderProcessInfo()}</Col>
        </Row>
      </Card>

      {/* 查询结果 */}
      <Card title="查询结果" style={{ marginTop: 16 }}>
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
      </Card>

      {/* 结果详情模态框 */}
      <Modal
        title="查询结果详情"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>关闭</Button>
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
              <Alert message="执行错误" description={selectedResult.error} type="error" style={{ marginTop: 16 }} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const SystemInfoManagementWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <SystemInfoManagement />
  </ErrorBoundary>
);

export default SystemInfoManagementWithErrorBoundary;
