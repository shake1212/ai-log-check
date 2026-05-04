import React, { useMemo } from 'react';
import { Row, Col, Card, Typography, Empty, Skeleton } from 'antd';
import RealTimeLogChart from './charts/RealTimeLogChart';
import { SecurityEvent, LEVEL_COLORS } from './types/dashboard';

const { Text } = Typography;

interface ThreatDataItem {
  name: string;
  value: number;
  color: string;
}

interface ChartsRowProps {
  events: SecurityEvent[];
  isPaused: boolean;
  threatData: ThreatDataItem[];
  loading?: boolean;
}

// 紧凑的 conic-gradient 饼图，内嵌右侧图例列表
const InlinePieChart: React.FC<{ data: ThreatDataItem[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 120 }}>
        <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  // Build conic-gradient stops
  let accumulated = 0;
  const stops = data.map((item) => {
    const start = (accumulated / total) * 100;
    accumulated += item.value;
    const end = (accumulated / total) * 100;
    return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 12px' }}>
      {/* Pie - 缩小尺寸 */}
      <div style={{ position: 'relative', flexShrink: 0, width: 100, height: 100 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `conic-gradient(${stops.join(', ')})`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        {/* Donut hole - 缩小中心 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text strong style={{ fontSize: 13, lineHeight: 1 }}>{total}</Text>
          <Text type="secondary" style={{ fontSize: 9 }}>总计</Text>
        </div>
      </div>

      {/* Legend list - 紧凑布局 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <Text style={{ fontSize: 12 }}>{item.name}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text strong style={{ fontSize: 12, color: item.color }}>{item.value}</Text>
                <Text type="secondary" style={{ fontSize: 10 }}>({percentage}%)</Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChartsRow: React.FC<ChartsRowProps> = ({ events, isPaused, threatData, loading = false }) => {
  const isEmpty = events.length === 0;

  // Build chart data from events for RealTimeLogChart (useMemo 避免每次渲染重新计算)
  const realTimeChartData = useMemo(() => events.slice(0, 50).map((event) => ({
    time: new Date(event.timestamp).getTime(),
    value:
      event.level === 'CRITICAL' ? 95
      : event.level === 'HIGH' ? 75
      : event.level === 'MEDIUM' ? 50
      : 25,
    type: event.level === 'LOW' ? 'normal' : 'anomaly',
  })), [events]);

  // 固定行高，两侧卡片对齐
  const ROW_HEIGHT = 220;

  return (
    <Row gutter={[16, 0]} style={{ marginBottom: 24 }}>
      {/* Left: Real-time log chart (60%) */}
      <Col span={14}>
        <Card
          styles={{ body: { padding: loading ? 16 : 0, height: ROW_HEIGHT, overflow: 'hidden' } }}
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} style={{ height: ROW_HEIGHT }} />
          ) : isEmpty ? (
            <div style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <RealTimeLogChart
              data={realTimeChartData}
              title="实时日志流量"
              height={ROW_HEIGHT}
              isPaused={isPaused}
              refreshInterval={10000}
            />
          )}
        </Card>
      </Col>

      {/* Right: Threat distribution chart (40%) */}
      <Col span={10}>
        <Card
          title={
            loading ? undefined : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🛡️</span>
                <Text strong>威胁等级分布</Text>
              </div>
            )
          }
          styles={{ body: { padding: loading ? 16 : '8px 0', height: loading ? ROW_HEIGHT : ROW_HEIGHT - 46, overflow: 'hidden', display: 'flex', alignItems: 'center' } }}
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} style={{ height: ROW_HEIGHT }} />
          ) : isEmpty ? (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <InlinePieChart data={threatData} />
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default ChartsRow;
