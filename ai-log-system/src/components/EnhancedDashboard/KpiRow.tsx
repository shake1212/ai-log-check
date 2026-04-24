import React from 'react';
import { Row, Col, Skeleton } from 'antd';
import SystemHealthCard from './cards/SystemHealthCard';
import TotalLogsCard from './cards/TotalLogsCard';
import SecurityEventsCard from './cards/SecurityEventsCard';
import ActiveUsersCard from './cards/ActiveUsersCard';

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

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <SystemHealthCard isPaused={isPaused} compact />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <TotalLogsCard isPaused={isPaused} compact />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <SecurityEventsCard isPaused={isPaused} compact hasCritical={hasCritical} />
          )}
        </div>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <div style={cardContainerStyle}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <ActiveUsersCard isPaused={isPaused} compact />
          )}
        </div>
      </Col>
    </Row>
  );
};

export default KpiRow;
