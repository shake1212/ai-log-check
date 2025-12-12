import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card, Progress, Typography, Tooltip, Badge, Spin } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  WarningOutlined,
  SyncOutlined 
} from '@ant-design/icons';
import { analysisApi, eventApi } from '@/services/api';

const { Text, Title } = Typography;

interface SystemHealthCardProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
}

interface HealthData {
  systemHealth: number;
  uptime: number;
  latency: number;
  throughput?: number;
  lastUpdate: string;
  systemVersion?: string;
  currentConnections?: number;
  activeSessions?: number;
}

const SystemHealthCard: React.FC<SystemHealthCardProps> = memo(({
  refreshInterval = 30000,
  autoRefresh = true,
  compact = false,
  onRefresh
}) => {
  const [healthData, setHealthData] = useState<HealthData>({
    systemHealth: 0,
    uptime: 0,
    latency: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 格式化工具函数
  const formatPercentage = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals) + '%';
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return ms.toFixed(0) + 'ms';
    }
    return (ms / 1000).toFixed(2) + 's';
  };

  // 获取健康度数据
  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取系统指标和实时统计
      const [metricsRes, realTimeRes] = await Promise.all([
        analysisApi.getSystemMetrics().catch(() => ({ data: null })),
        eventApi.getRealTimeStats().catch(() => ({ data: null }))
      ]);

      const metrics = metricsRes?.data;
      const realTimeStats = realTimeRes?.data;

      // 计算系统健康度（优先使用系统指标，没有则使用实时统计）
      const systemHealth = metrics?.systemHealth || 
                          realTimeStats?.systemHealth || 
                          (realTimeStats?.activeAlerts ? 
                            Math.max(0, 100 - (realTimeStats.activeAlerts * 10)) : 95);

      // 计算正常运行时间
      const uptime = metrics?.uptime || 99.8;

      // 计算响应时间
      const latency = metrics?.latency || 
                     realTimeStats?.responseTime || 
                     100;

      // 计算吞吐量
      const throughput = metrics?.throughput?.normal || 
                        (realTimeStats?.totalEvents ? 
                          Math.round(realTimeStats.totalEvents / 60) : 0); // 转换为每分钟

      setHealthData({
        systemHealth,
        uptime,
        latency,
        throughput,
        lastUpdate: new Date().toISOString(),
        systemVersion: metrics?.systemVersion,
        currentConnections: metrics?.currentConnections,
        activeSessions: metrics?.activeSessions
      });

      setLastUpdated(new Date().toLocaleTimeString());
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('加载系统健康数据失败', error);
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  // 初始加载和定时刷新
  useEffect(() => {
    loadHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(loadHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadHealthData, autoRefresh, refreshInterval]);

  // 计算系统健康状态
  const systemHealthStatus = healthData.systemHealth >= 90 ? 'healthy' : 
                            healthData.systemHealth >= 70 ? 'warning' : 'critical';
  
  // 健康状态配置
  const healthConfig = {
    healthy: {
      color: '#52c41a',
      gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
      icon: <CheckCircleOutlined />,
      label: '健康'
    },
    warning: {
      color: '#fa8c16',
      gradient: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
      icon: <WarningOutlined />,
      label: '警告'
    },
    critical: {
      color: '#ff4d4f',
      gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
      icon: <ExclamationCircleOutlined />,
      label: '危险'
    }
  };

  const config = healthConfig[systemHealthStatus];

  if (compact) {
    return (
      <Card 
        size="small"
        loading={loading}
        style={{ 
          borderRadius: '12px',
          border: `2px solid ${config.color}20`,
          background: 'white'
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: config.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(config.icon, { style: { fontSize: '20px', color: 'white' } })}
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>系统健康度</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Progress 
                percent={healthData.systemHealth}
                strokeColor={config.color}
                size="small"
                showInfo={false}
                style={{ flex: 1 }}
              />
              <Text strong style={{ fontSize: '14px', color: config.color, minWidth: '40px' }}>
                {formatPercentage(healthData.systemHealth, 0)}
              </Text>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      hoverable
      loading={loading}
      style={{ 
        borderRadius: '16px',
        overflow: 'hidden',
        border: 'none',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
        position: 'relative'
      }}
      bodyStyle={{ 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}
      extra={
        <Tooltip title="手动刷新">
          <Badge dot={loading}>
            <SyncOutlined 
              onClick={loadHealthData} 
              spin={loading}
              style={{ 
                cursor: 'pointer', 
                color: loading ? config.color : '#666',
                fontSize: '14px'
              }} 
            />
          </Badge>
        </Tooltip>
      }
    >
      {/* 最后更新时间 */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '20px', 
        fontSize: '11px', 
        color: '#999' 
      }}>
        {lastUpdated}
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
            系统健康度
            <Badge 
              status={systemHealthStatus === 'healthy' ? 'success' : 
                     systemHealthStatus === 'warning' ? 'warning' : 'error'}
              text={config.label}
              style={{ marginLeft: '8px', fontSize: '12px' }}
            />
          </Text>
          <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px' }}>
            {formatPercentage(healthData.systemHealth, 0)}
          </Title>
        </div>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: config.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {React.cloneElement(config.icon, { style: { fontSize: '28px', color: 'white' } })}
        </div>
      </div>
      
      <Progress 
        percent={healthData.systemHealth}
        strokeColor={config.color}
        strokeWidth={6}
        style={{ margin: '12px 0' }}
      />
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: 'auto'
      }}>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>正常运行</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {formatPercentage(healthData.uptime, 1)}
          </Text>
        </div>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>响应时间</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {formatTime(healthData.latency)}
          </Text>
        </div>
        {healthData.throughput && (
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>处理速率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>
              {Math.round(healthData.throughput)}/min
            </Text>
          </div>
        )}
      </div>

      
    </Card>
  );
});

SystemHealthCard.displayName = 'SystemHealthCard';

export default SystemHealthCard;