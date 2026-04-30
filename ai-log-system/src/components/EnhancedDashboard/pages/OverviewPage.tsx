import React from 'react';
import { Alert, Button, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

import KpiRow from '../KpiRow';
import ChartsRow from '../ChartsRow';
import EventSummary from '../EventSummary';
import { SecurityEvent, LEVEL_COLORS } from '../types/dashboard';

const { Text } = Typography;

interface OverviewPageProps {
  isPaused: boolean;
  hasCriticalAlert: boolean;
  eventStats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    newEvents: number;
    investigating?: number;
  };
  events: SecurityEvent[];
  eventLoading: boolean;
  /** @deprecated EventList handles filtering internally; kept for backward compat */
  eventFilter?: string;
  /** @deprecated EventList handles filtering internally; kept for backward compat */
  setEventFilter?: (filter: string) => void;
  loadInitialData: () => void;
  reconnect: () => void;
  fetchError: string | null;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  isPaused,
  hasCriticalAlert,
  eventStats,
  events,
  eventLoading,
  loadInitialData,
  reconnect,
  fetchError,
}) => {
  // 准备威胁分布数据
  const threatData = [
    { name: '严重', value: eventStats.critical, color: LEVEL_COLORS.CRITICAL },
    { name: '高危', value: eventStats.high, color: LEVEL_COLORS.HIGH },
    { name: '中危', value: eventStats.medium, color: LEVEL_COLORS.MEDIUM },
    { name: '低危', value: eventStats.low, color: LEVEL_COLORS.LOW },
  ];

  if (fetchError) {
    return (
      <Alert
        message="系统连接异常"
        description={fetchError}
        type="error"
        showIcon
        action={
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button size="middle" onClick={loadInitialData}>重试</Button>
            <Button size="middle" type="primary" onClick={reconnect}>重新连接</Button>
          </div>
        }
        style={{ marginBottom: 32, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(255,77,79,0.15)' }}
      />
    );
  }

  return (
    <div className="overview-page" style={{ maxWidth: 1600, margin: '0 auto' }}>
      {/* 暂停提示 Alert */}
      {isPaused && (
        <Alert
          message="数据更新已暂停"
          description="当前处于暂停状态，数据不会自动更新"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 12, width: '100%' }}
        />
      )}

      {/* CRITICAL 告警 Alert */}
      {hasCriticalAlert && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={
            <div>
              <Text strong style={{ fontSize: 16 }}>
                检测到 {eventStats.critical} 个严重安全威胁
              </Text>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)', marginTop: 4 }}>
                系统正在面临高风险攻击，建议立即采取防护措施
              </div>
            </div>
          }
          style={{
            marginBottom: 24,
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, rgba(255,77,79,0.1) 0%, rgba(207,19,34,0.05) 100%)',
            boxShadow: '0 4px 20px rgba(255,77,79,0.15)',
          }}
        />
      )}

      {/* KPI 卡片行 */}
      <div style={{ marginBottom: 24 }}>
        <KpiRow isPaused={isPaused} eventStats={eventStats} />
      </div>

      {/* 图表行 */}
      <ChartsRow events={events} isPaused={isPaused} threatData={threatData} />

      {/* 安全事件概览摘要 */}
      <EventSummary stats={eventStats} />
    </div>
  );
};

export default OverviewPage;
