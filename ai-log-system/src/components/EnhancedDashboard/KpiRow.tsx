import React from 'react';
import { Row, Col, Skeleton } from 'antd';
import SystemHealthCard from './cards/SystemHealthCard';
import TotalLogsCard from './cards/TotalLogsCard';
import SecurityEventsCard from './cards/SecurityEventsCard';
import UnhandledAlertsCard from './cards/UnhandledAlertsCard';
import { useKpiData, KpiData } from './hooks/useKpiData';

interface EventStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  newEvents: number;
}

interface KpiRowProps {
  isPaused: boolean;
  eventStats: EventStats;
  loading?: boolean;
}

const cardContainerStyle: React.CSSProperties = {
  minHeight: 120,
  maxHeight: 120,
  overflow: 'hidden',
};

const KpiRow: React.FC<KpiRowProps> = ({ isPaused, eventStats, loading = false }) => {
  const hasCritical = eventStats.critical > 0;
  // 统一KPI数据获取，替代4个Card各自独立轮询
  const { data: kpiData, loading: kpiLoading } = useKpiData(isPaused, 30000);
  const isLoading = loading || kpiLoading;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <SystemHealthCard isPaused={isPaused} compact kpiData={kpiData} />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <TotalLogsCard isPaused={isPaused} compact kpiData={kpiData} />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <SecurityEventsCard isPaused={isPaused} compact hasCritical={hasCritical} kpiData={kpiData} />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <UnhandledAlertsCard isPaused={isPaused} compact kpiData={kpiData} />
          )}
        </div>
      </Col>
    </Row>
  );
};

export default KpiRow;
