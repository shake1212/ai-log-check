import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Spin, Alert } from 'antd';
import { analysisApi } from '@/services/api';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';

const { Text } = Typography;

interface RealTimeLogChartProps {
  data?: Array<{ time: number; value: number; type: string }>;
  title: string;
  height?: number;
  loading?: boolean;
  isPaused?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', padding: '8px 12px',
      border: '1px solid #e8e8e8', borderRadius: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 12,
    }}>
      <div style={{ color: '#666', marginBottom: 4 }}>
        {format(new Date(Number(label)), 'HH:mm:ss')}
      </div>
      <div style={{ fontWeight: 600 }}>
        流量值：<span style={{ color: '#1890ff' }}>{payload[0].value.toFixed(1)}</span>
      </div>
      <div>
        状态：<span style={{ color: payload[0].payload.type === 'anomaly' ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          {payload[0].payload.type === 'anomaly' ? '异常' : '正常'}
        </span>
      </div>
    </div>
  );
};

const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  if (payload.type === 'anomaly') {
    return <circle cx={cx} cy={cy} r={5} fill="#ff4d4f" stroke="white" strokeWidth={1.5} />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="#1890ff" />;
};

const RealTimeLogChart: React.FC<RealTimeLogChartProps> = ({
  data: initialData = [],
  title,
  height = 220,
  loading = false,
  isPaused = false,
}) => {
  const [chartData, setChartData] = useState<any[]>(initialData);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef(chartData);
  const { statistics, status: wsStatus } = useWebSocketContext();

  // 首次加载一次
  const loadChartData = useCallback(async () => {
    if (isPaused) return;
    setChartLoading(true);
    setError(null);
    try {
      const traffic = await analysisApi.getTrafficStats();
      const now = Date.now();
      const updated = [...dataRef.current, {
        time: now,
        value: Number(traffic.currentTraffic || 0),
        type: Number(traffic.anomalyTraffic || 0) > 0 ? 'anomaly' : 'normal',
      }].slice(-100);
      setChartData(updated);
      dataRef.current = updated;
    } catch (err) {
      if (dataRef.current.length === 0) {
        setError(`数据加载失败: ${(err as Error).message || '未知错误'}`);
      }
    } finally {
      setChartLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // WS STATS 推送时追加数据点
  useEffect(() => {
    if (!statistics || isPaused) return;
    const now = Date.now();
    const throughput = statistics.throughput || statistics.cpu_percent || 0;
    const isAnomaly = statistics.anomalyCount > 0;
    const updated = [...dataRef.current, {
      time: now,
      value: Number(throughput),
      type: isAnomaly ? 'anomaly' : 'normal',
    }].slice(-100);
    setChartData(updated);
    dataRef.current = updated;
  }, [statistics, isPaused]);

  // WS断线时降级轮询(30秒)
  useEffect(() => {
    if (wsStatus === 'OPEN' || isPaused) return;
    const id = setInterval(loadChartData, 30000);
    return () => clearInterval(id);
  }, [wsStatus, isPaused, loadChartData]);

  if (error && chartData.length === 0) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Alert message="图表加载失败" description={error} type="error" showIcon />
        <button onClick={loadChartData} style={{ padding: '6px 16px', background: '#1890ff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          重试
        </button>
      </div>
    );
  }

  const HEADER_H = 44;
  const chartH = height - HEADER_H;

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: HEADER_H, flexShrink: 0,
        padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f5f5f5',
      }}>
        <Text strong style={{ fontSize: 14 }}>{title}</Text>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ color: '#1890ff', label: '正常' }, { color: '#ff4d4f', label: '异常' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
            </div>
          ))}
        </div>
      </div>

      <Spin spinning={chartLoading} style={{ flex: 1 }}>
        <div style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => format(new Date(Number(t)), 'HH:mm')}
                stroke="#bbb"
                fontSize={11}
                tickCount={5}
              />
              <YAxis
                stroke="#bbb"
                fontSize={11}
                domain={[0, 'dataMax + 10']}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1890ff"
                strokeWidth={2}
                dot={<CustomizedDot />}
                activeDot={{ r: 5 }}
                name="实时流量"
                isAnimationActive={false}
              />
              {chartData
                .filter((d, i) => d.type === 'anomaly' && (i === 0 || chartData[i - 1].type !== 'anomaly'))
                .map((d, idx) => {
                  const start = chartData.findIndex(item => item.time === d.time);
                  let end = start;
                  while (end < chartData.length && chartData[end].type === 'anomaly') end++;
                  end = Math.max(start + 1, end);
                  return (
                    <ReferenceArea
                      key={idx}
                      x1={chartData[start].time}
                      x2={chartData[end - 1].time}
                      fill="#ff4d4f"
                      fillOpacity={0.08}
                      stroke="none"
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Spin>
    </div>
  );
};

export default RealTimeLogChart;
