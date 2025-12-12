import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Tag, Progress, Badge, Tooltip } from 'antd';
import { FireOutlined, SyncOutlined } from '@ant-design/icons';
import { logApi, alertApi } from '@/services/api';
import { CardProps, formatNumber, LEVEL_GRADIENTS } from '../types/dashboard';

const { Text, Title } = Typography;

interface SecurityEventsData {
  anomalyCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unhandledAlerts: number;
  investigatingCount: number;
  lastUpdate: string;
}

interface SecurityEventsCardProps extends CardProps {
  compact?: boolean;
  style?: React.CSSProperties;
}

const SecurityEventsCard: React.FC<SecurityEventsCardProps> = ({
  refreshInterval = 10000,
  autoRefresh = true,
  isPaused = false,
  compact = false,
  style
}) => {
  const [eventsData, setEventsData] = useState<SecurityEventsData>({
    anomalyCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    unhandledAlerts: 0,
    investigatingCount: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadEventsData = useCallback(async () => {
    if (isPaused) return;
    
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        logApi.getStatistics(),
        alertApi.getUnhandledAlerts()
      ]);

      const stats = statsRes?.data;
      const alerts = alertsRes?.data || [];

      const anomalyCount = stats?.securityEvents || 
                          stats?.anomalyCount || 
                          (stats?.threatLevels ? 
                            (stats.threatLevels.HIGH || 0) + (stats.threatLevels.CRITICAL || 0) : 0);
      
      const criticalCount = stats?.threatLevels?.CRITICAL || 0;
      const highCount = stats?.threatLevels?.HIGH || 0;
      const mediumCount = stats?.threatLevels?.MEDIUM || 0;
      const lowCount = stats?.threatLevels?.LOW || 0;

      setEventsData({
        anomalyCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        unhandledAlerts: stats?.unhandledAlerts || alerts.length,
        investigatingCount: alerts.filter((a: any) => !a.handled).length,
        lastUpdate: new Date().toISOString()
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('加载安全事件数据失败', error);
    } finally {
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    loadEventsData();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(loadEventsData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadEventsData, autoRefresh, refreshInterval, isPaused]);

  if (compact) {
    return (
      <Card 
        size="small"
        loading={loading}
        style={{ 
          borderRadius: '12px',
          border: '2px solid #fa8c1620',
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
            background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FireOutlined style={{ fontSize: '20px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>安全事件</Text>
            <Title level={5} style={{ margin: '4px 0 0 0', color: '#d46b08' }}>
              {eventsData.anomalyCount}
            </Title>
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
        background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
        boxShadow: '0 6px 16px rgba(250, 140, 22, 0.12)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      bodyStyle={{ 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flex: 1
      }}
      extra={
        <Tooltip title="手动刷新">
          <Badge dot={loading}>
            <SyncOutlined 
              onClick={loadEventsData} 
              spin={loading}
              style={{ 
                cursor: 'pointer', 
                color: loading ? '#fa8c16' : '#666',
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
        color: '#666' 
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
            安全事件
          </Text>
          <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#d46b08' }}>
            {eventsData.anomalyCount}
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
          <FireOutlined style={{ fontSize: '28px', color: 'white' }} />
        </div>
      </div>
      
      <div style={{ margin: '12px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ 
            background: 'rgba(255, 77, 79, 0.1)',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Text strong style={{ color: '#ff4d4f', fontSize: '18px' }}>
              {eventsData.criticalCount}
            </Text>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              严重
            </div>
          </div>
          <div style={{ 
            background: 'rgba(250, 140, 22, 0.1)',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Text strong style={{ color: '#fa8c16', fontSize: '18px' }}>
              {eventsData.highCount}
            </Text>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              高危
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
          <Text style={{ fontSize: '12px', color: '#666' }}>未处理</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {eventsData.unhandledAlerts}
          </Text>
        </div>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>处理中</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {eventsData.investigatingCount}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default SecurityEventsCard;