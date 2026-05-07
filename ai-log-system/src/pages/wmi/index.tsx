// components/SystemInfoManagement.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Statistic,
  Spin,
  Alert,
  Descriptions,
  Progress,
  Table,
  Input,
  Segmented,
  Empty,
  Tooltip,
  Space
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SettingOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { handleError, logError } from '@/utils/errorHandler';

import {
  systemInfoApiService,
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
  const [statistics, setStatistics] = useState<SystemInfoStatistics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<SystemPerformanceMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);

  // 实时信息状态
  const [systemInfo, setSystemInfo] = useState<RealTimeSystemInfo | null>(null);
  const [cpuInfo, setCpuInfo] = useState<RealTimeCpuInfo | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<RealTimeMemoryInfo | null>(null);
  const [diskInfo, setDiskInfo] = useState<RealTimeDiskInfo | null>(null);
  const [processInfo, setProcessInfo] = useState<RealTimeProcessInfo | null>(null);

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
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '加载统计信息', { showMessage: false });
      }
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
      const batchData = await systemInfoApiService.getBatchRealTimeData();
      if (isMountedRef.current && batchData) {
        if (batchData.system) setSystemInfo(batchData.system);
        if (batchData.cpu) setCpuInfo(batchData.cpu);
        if (batchData.memory) setMemoryInfo(batchData.memory);
        if (batchData.disk) setDiskInfo(batchData.disk);
        if (batchData.processes) setProcessInfo(batchData.processes);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '加载实时信息', { showMessage: false });
        setErrors(prev => ({ ...prev, realtime: '实时数据加载异常' }));
      }
    } finally {
      if (isMountedRef.current) setLoading(prev => ({ ...prev, realtime: false }));
    }
  }, []);

  // 初始化
  useEffect(() => {
    isMountedRef.current = true;

    setInitialLoading(false);

    loadStatistics();
    loadRealTimeInfo();

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

  // 统计卡片
  const renderStatisticsCards = () => (
    <Row gutter={16}>
      <Col span={6}>
        <Card loading={loading.statistics}>
          <Statistic title="总连接数" value={statistics?.totalConnections || 0} prefix={<CloudServerOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card loading={loading.statistics}>
          <Statistic title="数据源数量" value={statistics?.totalDataSources || 0} prefix={<DatabaseOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card loading={loading.statistics}>
          <Statistic title="活跃查询" value={statistics?.activeQueries || 0} prefix={<BarChartOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card loading={loading.statistics}>
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
    <Card title="CPU" size="small" style={{ height: '100%', minHeight: 280 }}>
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
    <Card title="内存" size="small" style={{ height: '100%', minHeight: 280 }}>
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
    <Card title="磁盘" size="small" style={{ height: '100%', minHeight: 280 }}>
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
    <Card title="系统信息" size="small" style={{ height: '100%', minHeight: 320 }}>
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

  const [processSearch, setProcessSearch] = useState('');

  const processColumns: ColumnsType<RealTimeProcessInfo['processes'][0]> = [
    {
      title: '进程名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: 160,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 70,
      sorter: (a, b) => a.pid - b.pid,
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
      width: 120,
      sorter: (a, b) => a.cpu - b.cpu,
      defaultSortOrder: 'descend',
      render: (val: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={Math.min(val, 100)}
            size="small"
            strokeColor={getUsageColor(val)}
            showInfo={false}
            style={{ width: 60, margin: 0 }}
          />
          <span style={{ fontSize: 12, color: getUsageColor(val), fontWeight: 500 }}>{val.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      title: '内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 120,
      sorter: (a, b) => a.memory - b.memory,
      render: (val: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={Math.min(val, 100)}
            size="small"
            strokeColor={getUsageColor(val)}
            showInfo={false}
            style={{ width: 60, margin: 0 }}
          />
          <span style={{ fontSize: 12, color: getUsageColor(val), fontWeight: 500 }}>{val.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: [
        { text: '运行中', value: 'running' },
        { text: '休眠', value: 'sleeping' },
        { text: '停止', value: 'stopped' },
        { text: '僵尸', value: 'zombie' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const cfg: Record<string, { color: string; label: string }> = {
          running: { color: 'green', label: '运行中' },
          sleeping: { color: 'default', label: '休眠' },
          stopped: { color: 'orange', label: '停止' },
          zombie: { color: 'red', label: '僵尸' },
        };
        const c = cfg[status] || { color: 'default', label: status };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 90,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
  ];

  const renderProcessInfo = () => {
    const allProcesses = processInfo?.processes && Array.isArray(processInfo.processes)
      ? processInfo.processes
      : [];
    const filtered = processSearch
      ? allProcesses.filter(p =>
          p.name.toLowerCase().includes(processSearch.toLowerCase()) ||
          String(p.pid).includes(processSearch) ||
          (p.user && p.user.toLowerCase().includes(processSearch.toLowerCase()))
        )
      : allProcesses;

    return (
      <Card
        title={
          <Space>
            <span>进程信息</span>
            {processInfo && (
              <Tag color="blue">{processInfo.total}</Tag>
            )}
          </Space>
        }
        size="small"
        style={{ height: '100%' }}
        extra={
          processInfo && (
            <Space size="middle">
              <Statistic title="运行" value={processInfo.running} valueStyle={{ fontSize: 14, color: '#52c41a' }} />
              <Statistic title="休眠" value={processInfo.sleeping} valueStyle={{ fontSize: 14 }} />
            </Space>
          )
        }
      >
        {processInfo ? (
          <>
            <Input.Search
              placeholder="搜索进程名/PID/用户"
              allowClear
              size="small"
              style={{ marginBottom: 8 }}
              onSearch={setProcessSearch}
              onChange={e => !e.target.value && setProcessSearch('')}
            />
            <Table
              columns={processColumns}
              dataSource={filtered}
              rowKey="pid"
              size="small"
              pagination={{
                pageSize: 10,
                size: 'small',
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: total => `共 ${total} 个进程`,
              }}
              scroll={{ y: 260 }}
            />
          </>
        ) : (
          <Empty description="进程信息加载中..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    );
  };

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
        {/* 只在首次加载（无数据）时显示 Spin，后续刷新不遮挡内容 */}
        {loading.realtime && !cpuInfo && !memoryInfo && (
          <div style={{ textAlign: 'center', padding: 8 }}><Spin /></div>
        )}
        {/* 优化布局：使用flex布局确保卡片高度一致 */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>{renderCpuInfo()}</div>
          <div style={{ flex: 1 }}>{renderMemoryInfo()}</div>
          <div style={{ flex: 1 }}>{renderDiskInfo()}</div>
          <div style={{ flex: 1 }}>{renderSystemInfo()}</div>
        </div>
        <div>
          {renderProcessInfo()}
        </div>
      </Card>
    </div>
  );
};

const SystemInfoManagementWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <SystemInfoManagement />
  </ErrorBoundary>
);

export default SystemInfoManagementWithErrorBoundary;
