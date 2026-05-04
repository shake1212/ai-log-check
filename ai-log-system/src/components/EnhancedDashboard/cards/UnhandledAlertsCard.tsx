import React from 'react';
import { Card, Typography, Badge, Tooltip } from 'antd';
import { AlertOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { CardProps, formatNumber } from '../types/dashboard';
import type { KpiData } from '../hooks/useKpiData';

const { Text, Title } = Typography;

interface UnhandledAlertsCardProps extends CardProps {
  style?: React.CSSProperties;
  loading?: boolean;
  kpiData?: KpiData;
}

const UnhandledAlertsCard: React.FC<UnhandledAlertsCardProps> = ({
  isPaused = false,
  compact = false,
  style,
  loading: externalLoading,
  kpiData,
}) => {
  const displayData = kpiData ? {
    unhandledAlerts: kpiData.unhandledAlerts,
    lastUpdate: kpiData.lastUpdate,
  } : {
    unhandledAlerts: 0,
    lastUpdate: '',
  };

  const { unhandledAlerts, lastUpdate } = displayData;
  
  // 根据未处理告警数量确定状态
  const getStatus = () => {
    if (unhandledAlerts === 0) return { color: '#52c41a', text: '正常' };
    if (unhandledAlerts < 10) return { color: '#faad14', text: '注意' };
    if (unhandledAlerts < 50) return { color: '#fa8c16', text: '警告' };
    return { color: '#f5222d', text: '严重' };
  };

  const status = getStatus();

  if (compact) {
    return (
      <Card
        style={{
          borderRadius: 12,
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
          border: '1px solid #ffccc7',
          boxShadow: '0 2px 8px rgba(255,77,79,0.1)',
          height: '100%',
          ...style,
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AlertOutlined style={{ color: status.color, fontSize: 16 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>未处理告警</Text>
            </div>
            <Title level={3} style={{ margin: 0, color: status.color }}>
              {formatNumber(unhandledAlerts, 0)}
            </Title>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge 
              status={unhandledAlerts === 0 ? 'success' : unhandledAlerts < 10 ? 'warning' : 'error'} 
              text={<Text style={{ fontSize: 11 }}>{status.text}</Text>}
            />
          </div>
        </div>
        {lastUpdate && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClockCircleOutlined style={{ fontSize: 10, color: '#999' }} />
            <Text type="secondary" style={{ fontSize: 10 }}>{lastUpdate}</Text>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertOutlined style={{ color: status.color }} />
          <span>未处理告警</span>
        </div>
      }
      style={{ borderRadius: 12, ...style }}
      extra={
        <Badge 
          status={unhandledAlerts === 0 ? 'success' : unhandledAlerts < 10 ? 'warning' : 'error'} 
          text={status.text}
        />
      }
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={2} style={{ color: status.color, margin: 0 }}>
          {formatNumber(unhandledAlerts, 0)}
        </Title>
        <Text type="secondary">待处理告警</Text>
      </div>
      {lastUpdate && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> {lastUpdate}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default UnhandledAlertsCard;
