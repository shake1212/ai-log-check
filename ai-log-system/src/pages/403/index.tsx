import React from 'react';
import { Result, Button } from 'antd';
import { history } from 'umi';

const Forbidden: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: '#f0f2f5'
    }}>
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => history.push('/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};

export default Forbidden;
