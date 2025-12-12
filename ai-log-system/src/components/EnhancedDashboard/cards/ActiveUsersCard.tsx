import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Progress, Badge, Tooltip } from 'antd';
import { TeamOutlined, SyncOutlined } from '@ant-design/icons';
import { analysisApi, logApi } from '@/services/api';
import { CardProps, formatNumber } from '../types/dashboard';

const { Text, Title } = Typography;

interface ActiveUsersData {
  activeUsers: number;
  currentConnections: number;
  activeSessions: number;
  throughput: number;
  lastUpdate: string;
}

interface ActiveUsersCardProps extends CardProps {
  style?: React.CSSProperties;
}

const ActiveUsersCard: React.FC<ActiveUsersCardProps> = ({
  refreshInterval = 20000,
  autoRefresh = true,
  isPaused = false,
  compact = false,
  style
}) => {
  const [usersData, setUsersData] = useState<ActiveUsersData>({
    activeUsers: 0,
    currentConnections: 0,
    activeSessions: 0,
    throughput: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadUsersData = useCallback(async () => {
    if (isPaused) return;
    
    setLoading(true);
    try {
      const [metricsRes, statsRes] = await Promise.all([
        analysisApi.getSystemMetrics(),
        logApi.getStatistics()
      ]);

      const metrics = metricsRes?.data;
      const stats = statsRes?.data;

      // 计算活跃用户数
      const totalLogs = stats?.totalLogs || 0;
      const securityEvents = stats?.securityEvents || 0;
      const derivedActiveUsers = stats?.activeUsers || 
                                Math.max(1, Math.round(totalLogs / Math.max(securityEvents || 1, 1)));

      setUsersData({
        activeUsers: derivedActiveUsers,
        currentConnections: metrics?.currentConnections || Math.round(derivedActiveUsers * 1.5),
        activeSessions: metrics?.activeSessions || derivedActiveUsers * 3,
        throughput: metrics?.throughput?.normal || Math.max(1, Math.round(totalLogs / Math.max(stats?.dailyCounts?.length || 1, 1))),
        lastUpdate: new Date().toISOString()
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('加载活跃用户数据失败', error);
    } finally {
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    loadUsersData();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(loadUsersData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadUsersData, autoRefresh, refreshInterval, isPaused]);

  const throughputPercentage = Math.min(usersData.throughput, 100);

  if (compact) {
    return (
      <Card 
        size="small"
        loading={loading}
        style={{ 
          borderRadius: '12px',
          border: '2px solid #1890ff20',
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
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TeamOutlined style={{ fontSize: '20px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>活跃用户</Text>
            <Title level={5} style={{ margin: '4px 0 0 0', color: '#096dd9' }}>
              {usersData.activeUsers}
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
        background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
        boxShadow: '0 6px 16px rgba(24, 144, 255, 0.12)',
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
              onClick={loadUsersData} 
              spin={loading}
              style={{ 
                cursor: 'pointer', 
                color: loading ? '#1890ff' : '#666',
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
            活跃用户
          </Text>
          <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
            {usersData.activeUsers}
          </Title>
        </div>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
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
          <Text style={{ fontSize: '12px', color: '#666' }}>并发请求</Text>
          <Progress 
            percent={throughputPercentage} 
            size="small"
            strokeColor="#1890ff"
          />
        </div>
        <Text strong style={{ fontSize: '16px', color: '#096dd9' }}>
          {formatNumber(usersData.throughput, 1)}/s
        </Text>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: 'auto'
      }}>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>在线设备</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {usersData.currentConnections}
          </Text>
        </div>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>会话数</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {usersData.activeSessions}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ActiveUsersCard;