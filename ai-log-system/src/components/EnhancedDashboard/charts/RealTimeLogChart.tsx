import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Spin, Alert } from 'antd';
// 注释掉未定义的logApi，避免报错（后续可替换为真实API）
// import { logApi } from '@/services/api';

import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';

const { Text } = Typography;

interface RealTimeLogChartProps {
  data: Array<{ time: number; value: number; type: string }>; // 修正time类型为number（时间戳）
  title: string;
  height?: number;
  loading?: boolean;
  isPaused?: boolean;
  refreshInterval?: number;
}

// 生成模拟数据（确保数据格式正确）
const generateMockData = (count = 50) => {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const time = now - (count - index) * 60000; // 每分钟一个点
    const value = 30 + Math.random() * 50; // 基础值30-80
    const isAnomaly = Math.random() > 0.9; // 10%的概率是异常点
    return {
      time, // 数字类型时间戳（关键）
      value: isAnomaly ? value * 1.5 : value,
      type: isAnomaly ? 'anomaly' : 'normal'
    };
  });
};

// 简化自定义工具提示（避免复杂逻辑报错）
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {format(date, 'yyyy-MM-dd HH:mm:ss')}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>
          流量值: <span style={{ color: '#1890ff' }}>{payload[0].value.toFixed(1)}</span>
        </p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          状态: <span style={{ 
            color: payload[0].payload.type === 'anomaly' ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {payload[0].payload.type === 'anomaly' ? '异常' : '正常'}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

// 简化自定义点（避免SVG渲染异常）
const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null; // 增加容错

  if (payload.type === 'anomaly') {
    return (
      <circle cx={cx} cy={cy} r={6} fill="#ff4d4f">
        <circle cx={cx} cy={cy} r={3} fill="white" />
      </circle>
    );
  }
  
  return <circle cx={cx} cy={cy} r={4} fill="#1890ff" />;
};

const RealTimeLogChart: React.FC<RealTimeLogChartProps> = ({
  data: initialData = [],
  title,
  height = 400, // 提高默认高度，避免被统计栏挤压
  loading = false,
  isPaused = false,
  refreshInterval = 10000
}) => {
  // 强制初始化为模拟数据（确保有数据）
  const [chartData, setChartData] = useState<any[]>(generateMockData(50));
  const [chartLoading, setChartLoading] = useState(false); // 初始关闭loading，避免遮挡
  const [error, setError] = useState<string | null>(null);
  const [trafficStats, setTrafficStats] = useState({
    normalTraffic: 0,
    anomalyTraffic: 0,
    peakTraffic: 0,
    avgLatency: 0
  });

  const dataRef = useRef(chartData);
  const dataUpdateCountRef = useRef(0);

  // 注释API请求，避免未定义的logApi报错
  const loadChartData = useCallback(async () => {
    if (isPaused) {
      console.log('图表更新已暂停');
      return;
    }
    
    setChartLoading(true);
    setError(null);
    
    try {
      // 模拟API请求延迟（替代真实API）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 生成新的模拟数据点（模拟实时更新）
      const now = Date.now();
      const newDataPoint = {
        time: now,
        value: 40 + Math.sin(dataUpdateCountRef.current * 0.2) * 20 + Math.random() * 10,
        type: Math.random() > 0.9 ? 'anomaly' : 'normal'
      };
      
      const currentData = dataRef.current;
      const updatedData = [...currentData, newDataPoint].slice(-100); // 保留最新100个点
      
      setChartData(updatedData);
      dataRef.current = updatedData;
      dataUpdateCountRef.current += 1;
      
      // 重新计算统计数据
      const normalCount = updatedData.filter(d => d.type === 'normal').length;
      const anomalyCount = updatedData.filter(d => d.type === 'anomaly').length;
      const values = updatedData.map(d => d.value);
      const maxValue = values.length > 0 ? Math.max(...values) : 0;
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      
      setTrafficStats({
        normalTraffic: Math.round(normalCount * 1000 + avgValue * 10),
        anomalyTraffic: Math.round(anomalyCount * 100 + avgValue * 5),
        peakTraffic: Math.round(maxValue * 15),
        avgLatency: Math.round(80 + Math.random() * 40)
      });
      
    } catch (error) {
      console.error('加载图表数据失败:', error);
      setError(`数据加载失败: ${(error as Error).message || '未知错误'}`);
    } finally {
      setChartLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    // 立即加载一次数据
    loadChartData();
    
    // 定时刷新
    if (!isPaused && refreshInterval > 0) {
      const interval = setInterval(loadChartData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadChartData, isPaused, refreshInterval]);

  if (error && chartData.length === 0) {
    return (
      <div style={{ height: height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Alert
          message="图表加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <button 
          onClick={loadChartData}
          style={{ padding: '8px 16px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '400px', // 固定像素高度（关键！避免100%高度失效）
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      border: '1px solid #f0f0f0', // 调试用，可删除
      borderRadius: 16
    }}>
      <Spin spinning={chartLoading} tip="正在更新数据..." style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 标题栏 */}
        <div style={{ 
          padding: '16px 24px 0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text strong style={{ fontSize: '16px' }}>{title}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1890ff' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>正常流量</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>异常流量</Text>
            </div>
          </div>
        </div>
        
        {/* 图表容器（关键：固定高度，避免flex失效） */}
        <div style={{ 
          flex: 1, 
          padding: '16px 16px 80px 16px', // 底部留统计栏空间
          height: height - 120, // 固定高度，确保图表有绘制区域
          minHeight:370 // 最小高度兜底
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }} // 调整边距，避免坐标轴被截断
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                vertical={false}
              />
              {/* X轴：确保时间戳正确格式化 */}
              <XAxis
                dataKey="time"
                type="number" // 明确指定为数字类型（时间戳）
                domain={['dataMin', 'dataMax']} // 自动适配数据范围
                tickFormatter={(time) => format(new Date(Number(time)), 'HH:mm')}
                stroke="#999"
                fontSize={12}
              />
              {/* Y轴：增加容错，避免数值异常 */}
              <YAxis
                stroke="#999"
                fontSize={12}
                domain={[0, 'dataMax + 20']} // Y轴从0开始，避免折线贴顶
                label={{ 
                  value: '流量值', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 12, fill: '#666' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={30}
                iconSize={10}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {/* 折线：简化配置，确保渲染 */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1890ff"
                strokeWidth={2}
                dot={<CustomizedDot />}
                activeDot={{ r: 6, fill: '#1890ff' }}
                name="实时流量"
                isAnimationActive={true}
                animationDuration={500}
              />
              
              {/* 异常区域标记（修复索引查找逻辑） */}
              {chartData
                .filter((d, i) => d.type === 'anomaly' && (i === 0 || chartData[i-1].type !== 'anomaly'))
                .map((d, index) => {
                  const startIdx = chartData.findIndex(item => item.time === d.time);
                  let endIdx = startIdx;
                  while (endIdx < chartData.length && chartData[endIdx].type === 'anomaly') {
                    endIdx++;
                  }
                  endIdx = Math.max(startIdx + 1, endIdx); // 至少占一个单位
                  
                  return (
                    <ReferenceArea
                      key={`anomaly-${index}`}
                      x1={chartData[startIdx].time}
                      x2={chartData[endIdx - 1].time}
                      fill="#ff4d4f"
                      fillOpacity={0.1}
                      stroke="none"
                    />
                  );
                })
              }
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Spin>
      
      {/* 统计栏（固定底部） */}
      <div style={{ 
        position: 'absolute',
      
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px', 
        background: '#fafafa',
        borderTop: '1px solid #f0f0f0',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
        zIndex: 10
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>正常流量</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {(trafficStats.normalTraffic / 1000).toFixed(1)}K/s
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>异常流量</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4d4f' }}>
              {trafficStats.anomalyTraffic}/s
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>峰值流量</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {(trafficStats.peakTraffic / 1000).toFixed(1)}K/s
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>数据延迟</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              &lt;{trafficStats.avgLatency}ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeLogChart;