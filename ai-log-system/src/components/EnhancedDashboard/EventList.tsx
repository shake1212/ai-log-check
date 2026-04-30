import React, { useState } from 'react';
import { Tag, Button, Spin, Typography, Badge } from 'antd';
import { history } from 'umi';
import { SecurityEvent, LEVEL_COLORS } from './types/dashboard';
import { THREAT_TYPE_MAP, EVENT_TYPE_MAP } from '@/utils/enumLabels';

/** 将事件 type 字段映射为中文，优先查威胁类型表，再查事件类型表 */
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
  str && str.length > max ? str.slice(0, max) + '…' : str;

const EventList: React.FC<EventListProps> = ({ events, loading }) => {
  const [showAll, setShowAll] = useState(false);

  const filtered = showAll
    ? events
    : events.filter(e => DEFAULT_FILTER.includes(e.level));

  return (
    <div>
      {/* Header */}
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

      {/* Column headers */}
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
        <div style={{ height: 260, overflowY: 'auto' }} data-testid="event-list-container">
          {filtered.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary">暂无安全事件</Text>
            </div>
          ) : (
            filtered.map(event => (
              <div
                key={event.id}
                data-testid="event-row"
                data-level={event.level}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 90px 1fr 80px 70px',
                  gap: '0 8px',
                  padding: '6px 8px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => history.push('/events?id=' + event.id)}
              >
                {/* Level badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: LEVEL_COLORS[event.level] || '#ccc',
                  }} />
                  <Text style={{ fontSize: 11, color: LEVEL_COLORS[event.level], fontWeight: 600 }}>
                    {LEVEL_LABEL[event.level] || event.level}
                  </Text>
                </div>

                {/* Event type */}
                <Text style={{ fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {getTypeLabel(event.type)}
                </Text>

                {/* Message */}
                <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {truncate(event.message, 60)}
                </Text>

                {/* Time */}
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {/* Status */}
                <Badge
                  status={STATUS_COLOR[event.status] as any || 'default'}
                  text={<span style={{ fontSize: 11 }}>{STATUS_LABEL[event.status] || event.status}</span>}
                />
              </div>
            ))
          )}
        </div>
      </Spin>
    </div>
  );
};

export default EventList;
