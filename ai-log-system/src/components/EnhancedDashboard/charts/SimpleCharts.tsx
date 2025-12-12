// components/EnhancedDashboard/charts/SimpleCharts.tsx
import React from 'react';
import { Card, Typography, Spin } from 'antd';

const { Title } = Typography;

interface SimpleLineChartProps {
  data: Array<{ time: string; value: number; type: string }>;
  title: string;
  height?: number;
  loading?: boolean;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  title, 
  height = 300, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin />
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <div style={{ 
      height, 
      position: 'relative', 
      padding: '20px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(24,144,255,0.1) 100%)',
      borderRadius: '8px'
    }}>
      <Title level={5} style={{ marginBottom: '20px', textAlign: 'center' }}>
        {title}
      </Title>
      
      <div style={{ 
        height: height - 80, 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '4px',
        padding: '0 20px'
      }}>
        {data.map((item, index) => {
          const heightPercentage = range > 0 
            ? ((item.value - minValue) / range) * 100 
            : 50;
          
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${heightPercentage}%`,
                background: item.type === 'normal' ? '#1890ff' : '#ff4d4f',
                borderRadius: '4px 4px 0 0',
                minHeight: '2px',
                position: 'relative'
              }}
              title={`${item.value} (${item.type})`}
            >
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#666',
                whiteSpace: 'nowrap'
              }}>
                {item.value.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginTop: '10px',
        padding: '0 10px',
        fontSize: '10px',
        color: '#666'
      }}>
        <span>开始</span>
        <span>当前</span>
      </div>
    </div>
  );
};

// 如果需要，也可以添加其他简单图表组件
export const SimplePieChart = () => <div>SimplePieChart</div>;
export const SimpleBarChart = () => <div>SimpleBarChart</div>;

export default SimpleLineChart;