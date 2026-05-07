import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { validateToken } from '@/services/authService';
import { isTokenExpired } from '@/app';
import { getToken, setUser, clearAuth, hasToken } from '@/utils/authStorage';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();

      // 无 token，直接拒绝
      if (!token) {
        setIsValid(false);
        setLoading(false);
        return;
      }

      // token 已过期，清除并拒绝
      if (isTokenExpired(token)) {
        clearAuth();
        setIsValid(false);
        setLoading(false);
        return;
      }

      // 向后端验证 token
      try {
        const response = await validateToken(token);
        if (response.valid) {
          if (response.user) {
            setUser(JSON.stringify(response.user));
          }
          setIsValid(true);
        } else {
          clearAuth();
          message.warning('登录已过期，请重新登录');
          setIsValid(false);
        }
      } catch (error) {
        // 网络失败时，token 未过期则容许访问（离线容错）
        if (!isTokenExpired(token)) {
          console.warn('Token验证请求失败，token未过期，容许访问:', error);
          setIsValid(true);
        } else {
          clearAuth();
          setIsValid(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      if (!hasToken()) {
        window.location.href = '/login';
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
