import React from 'react';
import { Card, Typography, Button } from 'antd';

const { Title, Text } = Typography;

const DebugRoute: React.FC = () => {
  const currentHash = window.location.hash;
  const currentPath = window.location.pathname;

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Title level={2}>路由调试页面</Title>
        <Text>当前Hash: {currentHash}</Text>
        <br />
        <Text>当前Path: {currentPath}</Text>
        <br />
        <Text>当前时间: {new Date().toLocaleString()}</Text>
        <br />
        <Button onClick={() => window.location.hash = '/wmi-management'}>
          跳转到WMI管理页面
        </Button>
      </Card>
    </div>
  );
};

export default DebugRoute;
