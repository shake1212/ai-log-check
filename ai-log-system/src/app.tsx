// Umi 4 运行时配置
// 注意：Umi 4 的运行时配置与 Umi 3 不同，这里只保留基本配置

import { setupRequestInterceptor } from '@/utils/request';
import { getToken, getUser, clearAuth } from '@/utils/authStorage';

setupRequestInterceptor();

const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    // 标准JWT格式: eyJ...
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        return Date.now() >= payload.exp * 1000;
      }
    }
    // 兼容自定义格式 jwt-token-payload-timestamp
    if (token.startsWith('jwt-token-')) {
      const payload = token.substring('jwt-token-'.length);
      const lastDash = payload.lastIndexOf('-');
      if (lastDash > 0) {
        const timestamp = parseInt(payload.substring(lastDash + 1), 10);
        if (!isNaN(timestamp)) {
          return Date.now() - timestamp >= TOKEN_VALIDITY_MS;
        }
      }
    }
    // 无法解析过期时间的token，视为有效（由后端validate接口判定）
    return false;
  } catch {
    return false;
  }
}

export async function getInitialState() {
  const token = getToken();
  const userStr = getUser();

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
    clearAuth();
  }

  return { isAuthenticated: false };
}

// 导出插件对象，避免插件注册错误
export default {};