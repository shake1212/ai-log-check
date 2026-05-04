import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, message } from 'antd';
import { validateToken } from '@/services/authService';
import { isTokenExpired } from '@/app';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        setIsValid(false);
        return;
      }

      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.warning('登录已过期，请重新登录');
        setLoading(false);
        setIsValid(false);
        return;
      }
      
      try {
        const response = await validateToken(token);
        
        if (response.valid) {
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          setIsValid(true);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          message.warning('登录已过期，请重新登录');
          setIsValid(false);
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.error('身份验证失败，请重新登录');
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Monitor storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        window.location.href = '/login';
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="验证身份中..." />
      </div>
    );
  }
  
  if (!isValid) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectUrl} replace />;
  }
  
  return <>{children}</>;
};

export default AuthWrapper;
