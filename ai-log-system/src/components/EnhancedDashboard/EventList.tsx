import React, { useState, useMemo } from 'react';
import { Tag, Button, Spin, Typography, Badge, Tooltip, Skeleton } from 'antd';
import { history } from 'umi';
import { SecurityEvent, LEVEL_COLORS } from './types/dashboard';
import { THREAT_TYPE_MAP, EVENT_TYPE_MAP } from '@/utils/enumLabels';

const getTypeLabel = (type?: string): string => {
  if (!type) return '未知类型';
  return THREAT_TYPE_MAP[type]
    ?? THREAT_TYPE_MAP[type.toUpperCase()]
    ?? EVENT_TYPE_MAP[type]
    ?? EVENT_TYPE_MAP[type.toUpperCase()]
    ?? type;
};

const { Text } = Typography;

interface EventListProps {
  events: SecurityEvent[];
  loading: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  NEW: '新事件',
  INVESTIGATING: '调查中',
  RESOLVED: '已解决',
  FALSE_POSITIVE: '误报',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: 'error',
  INVESTIGATING: 'processing',
  RESOLVED: 'success',
  FALSE_POSITIVE: 'default',
};

const LEVEL_LABEL: Record<string, string> = {
  CRITICAL: '严重',
  HIGH: '高危',
  MEDIUM: '中危',
  LOW: '低危',
};

const DEFAULT_FILTER = ['CRITICAL', 'HIGH'];

const truncate = (str: string, max: number) =>
  str && str.length > max ? str.slice(0, max) + '...' : str;

const formatEventTime = (ts: string): string => {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return '刚刚';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
};

interface GroupedEvent {
  key: string;
  level: string;
  type: string;
  message: string;
  timestamp: string;
  status: string;
  count: number;
  latestId: string;
}

const groupEvents = (events: SecurityEvent[]): GroupedEvent[] => {
  const groups: GroupedEvent[] = [];
  for (const event of events) {
    const prev = groups.length > 0 ? groups[groups.length - 1] : null;
    if (prev && prev.type === event.type && prev.level === event.level && prev.message === event.message) {
      prev.count++;
      prev.timestamp = event.timestamp;
      prev.latestId = event.id;
    } else {
      groups.push({
        key: event.id,
        level: event.level,
        type: event.type,
        message: event.message,
        timestamp: event.timestamp,
        status: event.status,
        count: 1,
        latestId: event.id,
      });
    }
  }
  return groups;
};

const EventList: React.FC<EventListProps> = ({ events, loading }) => {
  const [showAll, setShowAll] = useState(false);

  const filtered = showAll
    ? events
    : events.filter(e => DEFAULT_FILTER.includes(e.level));

  const grouped = useMemo(() => groupEvents(filtered), [filtered]);

  if (loading && grouped.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>最近安全事件</Text>
        </div>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong>最近安全事件</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({filtered.length} 条{!showAll ? '，仅高危' : ''})
          </Text>
        </div>
        <Button
          size="small"
          type={showAll ? 'primary' : 'default'}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? '仅显示高危' : '显示全部'}
        </Button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 90px 1fr 80px 70px',
        gap: '0 8px',
        padding: '4px 8px',
        background: '#fafafa',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <Text type="secondary" style={{ fontSize: 11 }}>等级</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>类型</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>描述</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>时间</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>状态</Text>
      </div>

      <Spin spinning={loading}>
        <div style={{ height: 260, overflowY: 'auto' }}>
          {grouped.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary">暂无安全事件</Text>
            </div>
          ) : (
            grouped.map(event => (
              <Tooltip
                key={event.key}
                title={event.count > 1 ? `相同事件连续发生 ${event.count} 次` : undefined}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 90px 1fr 80px 70px',
                    gap: '0 8px',
                    padding: '6px 8px',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                    background: event.count > 3 ? 'rgba(255,77,79,0.03)' : 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = event.count > 3 ? 'rgba(255,77,79,0.03)' : 'transparent')}
                  onClick={() => history.push('/events?id=' + event.latestId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: LEVEL_COLORS[event.level] || '#ccc',
                    }} />
                    <Text style={{ fontSize: 11, color: LEVEL_COLORS[event.level], fontWeight: 600 }}>
                      {LEVEL_LABEL[event.level] || event.level}
                    </Text>
                  </div>

                  <Text style={{ fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {getTypeLabel(event.type)}
                  </Text>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                      {truncate(event.message, 50)}
                    </Text>
                    {event.count > 1 && (
                      <Tag color="red" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, flexShrink: 0 }}>
                        x{event.count}
                      </Tag>
                    )}
                  </div>

                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {formatEventTime(event.timestamp)}
                  </Text>

                  <Badge
                    status={STATUS_COLOR[event.status] as any || 'default'}
                    text={<span style={{ fontSize: 11 }}>{STATUS_LABEL[event.status] || event.status}</span>}
                  />
                </div>
              </Tooltip>
            ))
          )}
        </div>
      </Spin>
    </div>
  );
};

export default EventList;
