import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';

interface PermissionWrapperProps {
  children: React.ReactNode;
  access?: string;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({ 
  children, 
  access 
}) => {
  const navigate = useNavigate();

  if (!access) {
    return <>{children}</>;
  }
  
  // Get user from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const user = JSON.parse(userStr);
    const userRole = user.role || user.userType;
    
    // Check if user has required permission
    if (access === 'admin' && userRole !== 'admin') {
      return (
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面"
          extra={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              返回首页
            </Button>
          }
        />
      );
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return <Navigate to="/login" replace />;
  }
};

export default PermissionWrapper;
