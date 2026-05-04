// Umi 4 运行时配置
// 注意：Umi 4 的运行时配置与 Umi 3 不同，这里只保留基本配置

import { setupRequestInterceptor } from '@/utils/request';

setupRequestInterceptor();

const TOKEN_PREFIX = 'jwt-token-';
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

export function isTokenExpired(token: string): boolean {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return true;
  try {
    const payload = token.substring(TOKEN_PREFIX.length);
    const lastDash = payload.lastIndexOf('-');
    if (lastDash <= 0) return true;
    const timestamp = parseInt(payload.substring(lastDash + 1), 10);
    if (isNaN(timestamp)) return true;
    return Date.now() - timestamp >= TOKEN_VALIDITY_MS;
  } catch {
    return true;
  }
}

export async function getInitialState() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && !isTokenExpired(token)) {
    try {
      const user = userStr ? JSON.parse(userStr) : undefined;
      return { user, token, isAuthenticated: true };
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return { token, isAuthenticated: true };
    }
  }

  if (token && isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { isAuthenticated: false };
}

// 导出插件对象，避免插件注册错误
export default {};