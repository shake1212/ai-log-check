import React from 'react';
import { Card, Typography } from 'antd';
import { formatNumber } from '../types/dashboard';

const { Text, Title } = Typography;

interface ThreatDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
  height?: number;
}

const ThreatDistributionChart: React.FC<ThreatDistributionChartProps> = ({
  data,
  title,
  height = 300
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div style={{ height, padding: '20px', textAlign: 'center' }}>
      <Title level={5} style={{ marginBottom: '20px' }}>{title}</Title>
      <div style={{ 
        position: 'relative',
        width: '200px', 
        height: '200px', 
        margin: '0 auto'
      }}>
        <div style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '50%',
          background: `conic-gradient(${data.map((item, index, arr) => 
            `${item.color} ${index === 0 ? 0 : arr.slice(0, index).reduce((sum, d) => sum + d.value, 0) / total * 100}% ${arr.slice(0, index + 1).reduce((sum, d) => sum + d.value, 0) / total * 100}%`
          ).join(', ')})`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
        }}>
          <Text strong style={{ fontSize: '16px' }}>
            {formatNumber(total, 0)}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            总计
          </Text>
        </div>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', background: item.color, borderRadius: '2px' }} />
            <span style={{ fontSize: '12px' }}>{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreatDistributionChart;