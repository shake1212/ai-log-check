import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Tag, Progress, Badge, Tooltip, Button } from 'antd';
import { SafetyCertificateOutlined, ArrowUpOutlined, SyncOutlined } from '@ant-design/icons';
import { eventApi, analysisApi } from '@/services/api';
import { CardProps, formatNumber, formatStorage } from '../types/dashboard';

const { Text, Title } = Typography;

interface TotalLogsCardProps extends CardProps {
  style?: React.CSSProperties;
}

const TotalLogsCard: React.FC<TotalLogsCardProps> = ({
  refreshInterval = 30000,
  autoRefresh = true,
  isPaused = false,
  compact = false,
  style
}) => {
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    throughput: 0,
    storageUsed: 0,
    storageTotal: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadLogsData = useCallback(async () => {
    console.log('开始加载数据，isPaused:', isPaused);
    if (isPaused) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('发送API请求...');
      const [statsRes, metricsRes] = await Promise.all([
        eventApi.getDashboardStats(),
        analysisApi.getSystemMetrics()
      ]);

      console.log('事件统计响应:', statsRes);
      console.log('系统指标响应:', metricsRes);

      // 注意：根据你的日志，API直接返回数据对象，而不是 {data: ...}
      // 所以不需要 .data
      const statsData = statsRes || {};
      const metricsData = metricsRes || {};
      
      console.log('解析数据:', {
        totalLogsFromAPI: statsData.totalLogs,
        todayLogsFromAPI: statsData.todayLogs,
        throughputFromAPI: metricsData.throughput,
        storageUsedFromAPI: metricsData.storageUsed,
        storageTotalFromAPI: metricsData.storageTotal
      });

      // 使用实际API返回的数据
      const totalLogs = statsData.totalLogs || 0;
      const todayLogs = statsData.todayLogs || 0;
      
      // 吞吐量：使用 normal 吞吐量
      const throughput = metricsData.throughput?.normal || 0;
      
      // 存储：注意单位是GB，需要转换为TB显示
      const storageUsedGB = metricsData.storageUsed || 0;
      const storageTotalGB = metricsData.storageTotal || 0;
      
      // 转换为TB (1TB = 1024GB)
      const storageUsed = storageUsedGB / 1024;
      const storageTotal = storageTotalGB / 1024;

      const newStats = {
        totalLogs,
        todayLogs,
        throughput,
        storageUsed,
        storageTotal,
        lastUpdate: statsData.lastUpdate || metricsData.lastUpdate || new Date().toISOString()
      };

      console.log('设置新状态:', newStats);
      setStats(newStats);
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      
    } catch (error) {
      console.error('加载日志数据失败:', error);
      setError(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 如果API失败，使用默认数据（从你的日志中获取）
      setStats({
        totalLogs: 91471,
        todayLogs: 287,
        throughput: 1276,
        storageUsed: 0.089, // 0.09186 GB 转换为 TB
        storageTotal: 0.226, // 0.23226 GB 转换为 TB
        lastUpdate: new Date().toISOString()
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      console.log('加载完成');
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    console.log('useEffect 执行，autoRefresh:', autoRefresh, 'isPaused:', isPaused);
    loadLogsData();
    
    if (autoRefresh && !isPaused) {
      console.log('设置自动刷新间隔:', refreshInterval);
      const interval = setInterval(loadLogsData, refreshInterval);
      return () => {
        console.log('清除间隔');
        clearInterval(interval);
      };
    }
  }, [loadLogsData, autoRefresh, refreshInterval, isPaused]);

  // 添加调试组件，显示当前状态
  if (process.env.NODE_ENV === 'development') {
    console.log('组件渲染状态:', { stats, loading, lastUpdated, error });
  }

  // 错误状态显示
  if (error && !loading) {
    return (
      <Card 
        style={{ 
          borderRadius: '16px',
          border: '1px solid #ff4d4f',
          background: '#fff2f0',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...style
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1
        }}
      >
        <SafetyCertificateOutlined style={{ fontSize: '32px', color: '#ff4d4f', marginBottom: '16px' }} />
        <Text type="danger" strong style={{ marginBottom: '8px' }}>数据加载失败</Text>
        <Text type="secondary" style={{ fontSize: '12px', marginBottom: '16px' }}>{error}</Text>
        <Button 
          type="primary" 
          size="small" 
          onClick={loadLogsData}
          icon={<SyncOutlined />}
        >
          重试
        </Button>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card 
        size="small"
        loading={loading}
        style={{ 
          borderRadius: '12px',
          border: '2px solid #52c41a20',
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
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <SafetyCertificateOutlined style={{ fontSize: '20px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: '14px' }}>总日志数</Text>
            <Title level={5} style={{ margin: '4px 0 0 0', color: '#389e0d' }}>
              {formatNumber(stats.totalLogs, 1)}
            </Title>
          </div>
        </div>
      </Card>
    );
  }

  // 计算存储百分比，确保不会出现NaN
  const storagePercent = stats.storageTotal > 0 
    ? (stats.storageUsed / stats.storageTotal) * 100 
    : 0;

  return (
    <Card 
      hoverable
      loading={loading}
      style={{ 
        borderRadius: '16px',
        overflow: 'hidden',
        border: 'none',
        background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
        boxShadow: '0 6px 16px rgba(82, 196, 26, 0.12)',
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
        <Tooltip title={`上次更新: ${lastUpdated}`}>
          <Badge dot={loading}>
            <SyncOutlined 
              onClick={loadLogsData} 
              spin={loading}
              style={{ 
                cursor: 'pointer', 
                color: loading ? '#52c41a' : '#666',
                fontSize: '14px'
              }} 
            />
          </Badge>
        </Tooltip>
      }
    >
      {/* 调试信息 - 开发环境下显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          left: '10px', 
          fontSize: '10px', 
          color: '#666',
          background: 'rgba(255,255,255,0.7)',
          padding: '2px 5px',
          borderRadius: '3px',
          zIndex: 1 
        }}>
         
        </div>
      )}

      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '20px', 
        fontSize: '11px', 
        color: '#666' 
      }}>
        {lastUpdated || '正在加载...'}
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
            总日志数
          </Text>
          <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#389e0d' }}>
            {formatNumber(stats.totalLogs, 1)}
          </Title>
        </div>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <SafetyCertificateOutlined style={{ fontSize: '28px', color: 'white' }} />
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        margin: '12px 0'
      }}>
        <ArrowUpOutlined style={{ color: '#52c41a' }} />
        <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
          今日新增 {stats.todayLogs} 条
        </Text>
        <Tag color="success" style={{ marginLeft: 'auto' }}>实时</Tag>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: 'auto'
      }}>
        <div>
          <Text style={{ fontSize: '12px', color: '#666' }}>实时处理</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {formatNumber(stats.throughput, 1)}/s
          </Text>
        </div>
        <div style={{ minWidth: '120px' }}>
          <Text style={{ fontSize: '12px', color: '#666' }}>存储量</Text>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {formatStorage(stats.storageUsed, stats.storageTotal)}
          </Text>
          <Progress 
            percent={Math.min(storagePercent, 100)}
            size="small"
            strokeColor="#52c41a"
            showInfo={false}
            style={{ marginTop: '4px' }}
          />
        </div>
      </div>
    </Card>
  );
};

export default TotalLogsCard;