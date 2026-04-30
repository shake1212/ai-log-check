import React from 'react';
import { Row, Col, Card, Typography, Statistic } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { LEVEL_COLORS } from './types/dashboard';

const { Text } = Typography;

interface EventSummaryProps {
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    newEvents: number;
    investigating?: number;
  };
}

const ITEMS = [
  {
    key: 'critical',
    label: '严重',
    color: LEVEL_COLORS.CRITICAL,
    bg: 'rgba(255,77,79,0.06)',
    filter: 'CRITICAL',
  },
  {
    key: 'high',
    label: '高危',
    color: LEVEL_COLORS.HIGH,
    bg: 'rgba(250,140,22,0.06)',
    filter: 'HIGH',
  },
  {
    key: 'medium',
    label: '中危',
    color: LEVEL_COLORS.MEDIUM,
    bg: 'rgba(250,173,20,0.06)',
    filter: 'MEDIUM',
  },
  {
    key: 'low',
    label: '低危',
    color: LEVEL_COLORS.LOW,
    bg: 'rgba(82,196,26,0.06)',
    filter: 'LOW',
  },
  {
    key: 'newEvents',
    label: '待处理',
    color: '#1890ff',
    bg: 'rgba(24,144,255,0.06)',
    filter: 'NEW',
  },
] as const;

const EventSummary: React.FC<EventSummaryProps> = ({ stats }) => {
  const goToEvents = (filter?: string) => {
    window.location.hash = filter ? `/events?level=${filter}` : '/events';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong>安全事件概览</Text>
        <Text
          style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer' }}
          onClick={() => goToEvents()}
        >
          查看全部 <ArrowRightOutlined />
        </Text>
      </div>

      <Row gutter={[12, 0]}>
        {ITEMS.map(({ key, label, color, bg, filter }) => (
          <Col key={key} flex={1}>
            <Card
              hoverable
              bodyStyle={{ padding: '14px 16px' }}
              style={{
                borderRadius: 10,
                background: bg,
                border: `1px solid ${color}22`,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => goToEvents(filter)}
            >
              <Statistic
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <Text style={{ fontSize: 12, color: '#666' }}>{label}</Text>
                  </div>
                }
                value={stats[key as keyof typeof stats] ?? 0}
                valueStyle={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.2 }}
              />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                点击查看详情 →
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default EventSummary;
