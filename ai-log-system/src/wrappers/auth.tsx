import React from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // 开发环境：直接渲染页面，跳过认证检查
  return <>{children}</>;
};

export default AuthWrapper;
