import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { isTokenExpired } from '@/app';
import { getToken, setToken, setUser, clearAuth } from '@/utils/authStorage';

let isRedirecting = false;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

type DataApiInstance = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'request'> & {
  <T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  request<T = any>(config: AxiosRequestConfig): Promise<T>;
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  head<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  options<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
};

const instance = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
}) as unknown as DataApiInstance;

instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    const originalRequest = error.config;

    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/validate') && !url.includes('/auth/refresh')) {
      const token = getToken();

      if (token && !isTokenExpired(token) && !isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post('/api/auth/refresh', null, {
            headers: { Authorization: `Bearer ${token}` },
          });
          isRefreshing = false;

          if (res.data?.token) {
            const newToken = res.data.token;
            setToken(newToken);
            const user = res.data.user;
            if (user) {
              setUser(JSON.stringify(user));
            }
            onRefreshed(newToken);
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
        }
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(instance(originalRequest));
          });
        });
      }

      if (!isRedirecting) {
        isRedirecting = true;
        clearAuth();
        message.warning('登录已过期，请重新登录');
        setTimeout(() => {
          window.location.href = '/login';
          isRedirecting = false;
        }, 500);
      }
    }

    return Promise.reject(error);
  },
);

export function setupRequestInterceptor() {}

export default instance;
