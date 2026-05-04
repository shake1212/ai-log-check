import React, { useMemo } from 'react';
import { Row, Col, Card, Typography, Statistic, Tag, Tooltip, Skeleton, Button } from 'antd';
import { ArrowRightOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { LEVEL_COLORS, SecurityEvent } from './types/dashboard';

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
  events?: SecurityEvent[];
  loading?: boolean;
  onRetry?: () => void;
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

const formatTimeRange = (start: Date, end: Date): { label: string; full: string } => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isTodayOnly = start >= todayStart && end >= todayStart;

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  const fmtShort = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  if (isTodayOnly) {
    return {
      label: '当日',
      full: `统计范围：当日 ${fmt(start)} ~ ${fmt(end)}`,
    };
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return {
      label: '近24小时',
      full: `统计范围：${fmt(start)} ~ ${fmt(end)}`,
    };
  }

  return {
    label: `${fmtShort(start)} - ${fmtShort(end)}`,
    full: `统计范围：${fmt(start)} ~ ${fmt(end)}`,
  };
};

const EventSummary: React.FC<EventSummaryProps> = ({ stats, events, loading, onRetry }) => {
  const goToEvents = (filter?: string) => {
    window.location.hash = filter ? `/events?level=${filter}` : '/events';
  };

  const timeRange = useMemo(() => {
    if (!events || events.length === 0) return null;
    const timestamps = events
      .map(e => new Date(e.timestamp).getTime())
      .filter(t => !isNaN(t));
    if (timestamps.length === 0) return null;
    const earliest = new Date(Math.min(...timestamps));
    const latest = new Date(Math.max(...timestamps));
    return formatTimeRange(earliest, latest);
  }, [events]);

  const hasNoData = !events || events.length === 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong>安全事件概览</Text>
          {!loading && timeRange && (
            <Tooltip title={timeRange.full}>
              <Tag
                icon={<ClockCircleOutlined />}
                color="blue"
                style={{ fontSize: 11, marginRight: 0, cursor: 'help' }}
              >
                {timeRange.label}
              </Tag>
            </Tooltip>
          )}
        </div>
        <Text
          style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer' }}
          onClick={() => goToEvents()}
        >
          查看全部 <ArrowRightOutlined />
        </Text>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : onRetry && hasNoData ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Button icon={<ReloadOutlined />} onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : (
        <Row gutter={[12, 0]}>
          {ITEMS.map(({ key, label, color, bg, filter }) => (
            <Col key={key} flex={1}>
              <Card
                hoverable
                styles={{ body: { padding: '14px 16px' } }}
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
      )}
    </div>
  );
};

export default EventSummary;
