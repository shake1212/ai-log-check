// API基础服务
import { message } from 'antd';

// API基础URL
const BASE_URL = '/api';

// 请求方法枚举
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

// 基础请求函数
export async function request<T>(url: string, method: HttpMethod, data?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 包含cookies
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result as T;
  } catch (error) {
    message.error(`API请求错误: ${(error as Error).message}`);
    throw error;
  }
}

// 导出便捷方法
export const api = {
  get: <T>(url: string) => request<T>(url, HttpMethod.GET),
  post: <T>(url: string, data: any) => request<T>(url, HttpMethod.POST, data),
  put: <T>(url: string, data: any) => request<T>(url, HttpMethod.PUT, data),
  delete: <T>(url: string) => request<T>(url, HttpMethod.DELETE),
}; 