import React, { useState } from 'react';
import { Tag, Button, Spin, Typography } from 'antd';
import { history } from 'umi';
import { SecurityEvent, LEVEL_COLORS } from './types/dashboard';

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
  NEW: 'red',
  INVESTIGATING: 'processing',
  RESOLVED: 'success',
  FALSE_POSITIVE: 'default',
};

const DEFAULT_FILTER = ['CRITICAL', 'HIGH'];

const truncate = (str: string, max: number) =>
  str && str.length > max ? str.slice(0, max) + '…' : str;

const EventList: React.FC<EventListProps> = ({ events, loading }) => {
  const [showAll, setShowAll] = useState(false);

  const filtered = showAll
    ? events
    : events.filter(e => DEFAULT_FILTER.includes(e.level));

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text strong>最近安全事件</Text>
        <Button
          size="small"
          type={showAll ? 'primary' : 'default'}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? '仅显示高危' : '显示全部'}
        </Button>
      </div>

      <Spin spinning={loading}>
        <div
          style={{ height: 300, overflowY: 'auto' }}
          data-testid="event-list-container"
        >
          {filtered.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text type="secondary">暂无安全事件</Text>
            </div>
          ) : (
            filtered.map(event => (
              <div
                key={event.id}
                data-testid="event-row"
                data-level={event.level}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 4px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                }}
                onClick={() => history.push('/events?id=' + event.id)}
              >
                {/* Level dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: LEVEL_COLORS[event.level] || '#ccc',
                  }}
                />

                {/* Event type */}
                <Text
                  strong
                  style={{ fontSize: 12, flexShrink: 0, maxWidth: 120 }}
                  ellipsis
                >
                  {event.type || '未知类型'}
                </Text>

                {/* Message (truncated to 60 chars) */}
                <Text
                  type="secondary"
                  style={{ fontSize: 12, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                >
                  {truncate(event.message, 60)}
                </Text>

                {/* Time */}
                <Text
                  type="secondary"
                  style={{ fontSize: 11, flexShrink: 0 }}
                >
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                {/* Status tag */}
                <Tag
                  color={STATUS_COLOR[event.status] || 'default'}
                  style={{ fontSize: 10, flexShrink: 0, margin: 0 }}
                >
                  {STATUS_LABEL[event.status] || event.status}
                </Tag>
              </div>
            ))
          )}
        </div>
      </Spin>
    </div>
  );
};

export default EventList;
