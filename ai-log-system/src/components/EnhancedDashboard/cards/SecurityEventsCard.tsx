import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Tag, Progress, Badge, Tooltip } from 'antd';
import { FireOutlined, SyncOutlined } from '@ant-design/icons';
import { logApi, alertApi, eventApi } from '@/services/api';
import { CardProps, formatNumber, LEVEL_GRADIENTS } from '../types/dashboard';
import type { KpiData } from '../hooks/useKpiData';

const { Text, Title } = Typography;

interface SecurityEventsData {
  anomalyCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unhandledAlerts: number;
  lastUpdate: string;
}

interface SecurityEventsCardProps extends CardProps {
  compact?: boolean;
  style?: React.CSSProperties;
  loading?: boolean;
  hasCritical?: boolean;
  kpiData?: KpiData;
}

const SecurityEventsCard: React.FC<SecurityEventsCardProps> = ({
  refreshInterval = 10000,
  autoRefresh = true,
  isPaused = false,
  compact = false,
  style,
  loading: externalLoading,
  hasCritical = false,
  kpiData,
}) => {
  const [eventsData, setEventsData] = useState<SecurityEventsData>({
    anomalyCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    unhandledAlerts: 0,
    lastUpdate: new Date().toISOString()
  });
  const [internalLoading, setLoading] = useState(false);
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 有共享kpiData时直接使用
  const displayData = kpiData ? {
    anomalyCount: kpiData.anomalyCount,
    criticalCount: kpiData.criticalCount,
    highCount: kpiData.highCount,
    mediumCount: kpiData.mediumCount,
    lowCount: kpiData.lowCount,
    unhandledAlerts: kpiData.unhandledAlerts,
    lastUpdate: kpiData.lastUpdate,
  } : eventsData;

  const loadEventsData = useCallback(async () => {
    if (isPaused) return;
    
    setLoading(true);
    try {
      const [statsRes, alertsRes, dashboardRes] = await Promise.all([
        logApi.getStatistics(),
        alertApi.getUnhandledAlerts(),
        eventApi.getDashboardStats(),
      ]);

      const stats = statsRes?.data;
      const alerts = alertsRes?.data || [];
      const dashboardStats = dashboardRes?.data || dashboardRes || {};
      const severityCounts = dashboardStats?.severityCounts || dashboardStats?.levelCounts || {};

      // 统一口径：优先使用 /events/dashboard-stats 的 severityCounts；
      // WARN 归入中风险，ERROR 归入高风险，避免“有日志但异常全为0”的展示偏差。
      const criticalCount = severityCounts.CRITICAL || 0;
      const highCount = severityCounts.HIGH || 0;
      const mediumCount = severityCounts.MEDIUM || 0;
      const lowCount = severityCounts.LOW || 0;

      const anomalyCount = dashboardStats?.anomalyCount ??
                          stats?.securityEvents ??
                          stats?.anomalyCount ??
                          (criticalCount + highCount + mediumCount);
      
      const fallbackUnhandled = stats?.unhandledAlerts || alerts.length;

      setEventsData({
        anomalyCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        unhandledAlerts: fallbackUnhandled,
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
    if (kpiData) return; // 有共享数据时跳过独立轮询
    loadEventsData();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(loadEventsData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadEventsData, autoRefresh, refreshInterval, isPaused, kpiData]);

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
        styles={{ body: { 
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        } }}
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
              {displayData.anomalyCount}
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
        border: hasCritical ? '2px solid #ff4d4f' : 'none',
        background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
        boxShadow: hasCritical ? '0 6px 16px rgba(255, 77, 79, 0.2)' : '0 6px 16px rgba(250, 140, 22, 0.12)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      styles={{ body: { 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flex: 1
      } }}
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
            {displayData.anomalyCount}
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
              {displayData.criticalCount}
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
              {displayData.highCount}
            </Text>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              高危
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: 'auto'
      }}>
        <Text style={{ fontSize: '12px', color: '#666' }}>未处理</Text>
        <Text strong style={{ fontSize: '16px', display: 'block' }}>
          {displayData.unhandledAlerts}
        </Text>
      </div>
    </Card>
  );
};

export default SecurityEventsCard;