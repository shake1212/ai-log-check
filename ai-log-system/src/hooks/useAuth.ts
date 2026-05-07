import { useState, useCallback } from 'react';
import { useModel, history } from 'umi';
import { message } from 'antd';
import { authApi } from '@/services/api';
import { isTokenExpired as checkTokenExpired } from '@/app';
import { setToken, setUser, clearAuth, getToken as getAuthToken } from '@/utils/authStorage';
import type { LoginForm, User } from '@/types';

export const useAuth = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(false);

  // 登录
  const login = useCallback(async (formData: LoginForm) => {
    setLoading(true);
    try {
      const response = await authApi.login(formData);
      
      if (response.code === 200) {
        const { token, user } = response.data;
        
        // 保存到localStorage
        setToken(token);
        setUser(JSON.stringify(user));
        
        // 更新全局状态
        setInitialState({
          user,
          token,
          isAuthenticated: true,
        });
        
        message.success('登录成功！');
        return { success: true, user };
      } else {
        message.error(response.message || '登录失败');
        return { success: false, error: response.message };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || '网络错误，请稍后重试');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [setInitialState]);

  // 登出
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      
      // 更新全局状态
      setInitialState({
        isAuthenticated: false,
      });
      
      message.success('已退出登录');
      history.push('/login');
    }
  }, [setInitialState]);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();
      
      if (response.code === 200) {
        const user = response.data;
        
        setUser(JSON.stringify(user));
        
        // 更新全局状态
        setInitialState(prev => ({
          ...prev,
          user,
        }));
        
        return user;
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  }, [setInitialState]);

  // 检查是否已登录
  const isAuthenticated = useCallback(() => {
    return !!initialState?.isAuthenticated && !!initialState?.user;
  }, [initialState]);

  // 获取当前用户
  const getCurrentUser = useCallback((): User | undefined => {
    return initialState?.user;
  }, [initialState]);

  // 获取token
  const getToken = useCallback((): string | undefined => {
    return initialState?.token || getAuthToken() || undefined;
  }, [initialState]);

  const isTokenExpired = useCallback((): boolean => {
    const token = getToken();
    return checkTokenExpired(token || '');
  }, [getToken]);

  return {
    user: initialState?.user,
    isAuthenticated: isAuthenticated(),
    loading,
    login,
    logout,
    refreshUser,
    getCurrentUser,
    getToken,
    isTokenExpired,
  };
};
