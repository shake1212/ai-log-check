import React, { useState, useEffect, useCallback } from 'react';
import { Card, Progress, Typography, Badge, Tooltip } from 'antd';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { analysisApi, eventApi } from '@/services/api';
import { CardProps, formatPercentage, formatTime, LEVEL_GRADIENTS } from '../types/dashboard';

const { Text, Title } = Typography;

interface SystemMetrics {
  systemHealth: number;
  uptime: number;
  latency: number;
  lastUpdate: string;
}

interface SystemHealthCardProps extends CardProps {
  style?: React.CSSProperties;
}

const SystemHealthCard: React.FC<SystemHealthCardProps> = ({
  refreshInterval = 15000,
  autoRefresh = true,
  isPaused = false,
  compact = false,
  style
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    systemHealth: 0,
    uptime: 0,
    latency: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadHealthData = useCallback(async () => {
    if (isPaused) return;
    
    setLoading(true);
    try {
      const [metricsRes, realTimeRes] = await Promise.all([
        analysisApi.getSystemMetrics(),
        eventApi.getRealTimeStats()
      ]);

      const systemHealth = metricsRes?.data?.systemHealth || 
                          realTimeRes?.data?.systemHealth || 95;
      const uptime = metricsRes?.data?.uptime || 99.8;
      const latency = metricsRes?.data?.latency || 
                     realTimeRes?.data?.responseTime || 100;

      setMetrics({
        systemHealth: Math.min(100, Math.max(0, systemHealth)),
        uptime,
        latency,
        lastUpdate: new Date().toISOString()
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('加载系统健康数据失败', error);
    } finally {
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    loadHealthData();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(loadHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadHealthData, autoRefresh, refreshInterval, isPaused]);

  const systemHealthStatus = metrics.systemHealth >= 90 ? 'healthy' : 
                            metrics.systemHealth >= 70 ? 'warning' : 'critical';
  
  const healthConfig = {
    healthy: {
      color: '#52c41a',
      gradient: LEVEL_GRADIENTS.HEALTHY,
      label: '健康'
    },
    warning: {
      color: '#fa8c16',
      gradient: LEVEL_GRADIENTS.WARNING,
      label: '警告'
    },
    critical: {
      color: '#ff4d4f',
      gradient: LEVEL_GRADIENTS.CRITICAL_GRADIENT,
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
          background: 'white',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...style
        }}
        bodyStyle={{ 
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flex: 1 
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: config.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircleOutlined style={{ fontSize: '20px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>系统健康度</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Progress 
                percent={metrics.systemHealth}
                strokeColor={config.color}
                size="small"
                showInfo={false}
                style={{ flex: 1 }}
              />
              <Text strong style={{ fontSize: '14px', color: config.color, minWidth: '40px' }}>
                {formatPercentage(metrics.systemHealth, 0)}
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
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      bodyStyle={{ 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
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
            {formatPercentage(metrics.systemHealth, 0)}
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
          <CheckCircleOutlined style={{ fontSize: '28px', color: 'white' }} />
        </div>
      </div>
      
      <Progress 
        percent={metrics.systemHealth}
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
            {formatPercentage(metrics.uptime, 1)}
          </Text>
        </div>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>响应时间</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {formatTime(metrics.latency)}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default SystemHealthCard;