import React from 'react';
import { Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { DashboardProps } from './types/dashboard';

const { Title, Paragraph, Text } = Typography;

interface DashboardHeaderProps extends Pick<DashboardProps, 'connected'> {
  title?: string;
  subtitle?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  connected,
  title = 'AI 智能安全监控系统',
  subtitle = '实时监控企业网络安全，智能检测异常行为，提供全方位安全防护'
}) => {
  return (
    <div style={{
      marginBottom: '32px',
      padding: '32px',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      borderRadius: '20px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(26, 41, 128, 0.2)'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <RobotOutlined style={{ fontSize: '40px', color: 'white' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              {title}
            </Title>
            <Paragraph style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '16px',
              maxWidth: '600px'
            }}>
              {subtitle}
            </Paragraph>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: connected ? '#52c41a' : '#ff4d4f',
              boxShadow: `0 0 10px ${connected ? '#52c41a' : '#ff4d4f'}`
            }} />
            <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              {connected ? '实时连接正常' : '连接已断开'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              • 最后更新: {new Date().toLocaleTimeString()}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;