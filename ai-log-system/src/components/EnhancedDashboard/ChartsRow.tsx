import React, { useMemo } from 'react';
import { Row, Col, Card, Typography, Empty } from 'antd';
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
}

// 简单的 conic-gradient 饼图，内嵌右侧图例列表
const InlinePieChart: React.FC<{ data: ThreatDataItem[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 16px' }}>
      {/* Pie */}
      <div style={{ position: 'relative', flexShrink: 0, width: 120, height: 120 }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `conic-gradient(${stops.join(', ')})`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        {/* Donut hole */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text strong style={{ fontSize: 14, lineHeight: 1 }}>{total}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>总计</Text>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <Text style={{ fontSize: 13 }}>{item.name}</Text>
            </div>
            <Text strong style={{ fontSize: 13, color: item.color }}>{item.value}</Text>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChartsRow: React.FC<ChartsRowProps> = ({ events, isPaused, threatData }) => {
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

  return (
    <Row gutter={[16, 0]} style={{ marginBottom: 24 }}>
      {/* Left: Real-time log chart (60%) */}
      <Col span={14}>
        <Card
          bodyStyle={{ padding: 0 }}
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
        >
          {isEmpty ? (
            <div
              style={{
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <RealTimeLogChart
              data={realTimeChartData}
              title="实时日志流量"
              height={220}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🛡️</span>
              <Text strong>威胁等级分布</Text>
            </div>
          }
          bodyStyle={{ padding: '8px 0' }}
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
        >
          {isEmpty ? (
            <div
              style={{
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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
