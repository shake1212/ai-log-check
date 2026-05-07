export interface ValidateTokenResponse {
  valid: boolean;
  user?: any;
  message?: string;
}

import { clearAuth } from '@/utils/authStorage';

export async function validateToken(token: string): Promise<ValidateTokenResponse> {
  const response = await fetch('/api/auth/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    return { valid: false, message: data.message || 'Token无效或已过期' };
  }

  if (!response.ok) {
    throw new Error(`Token验证请求失败: HTTP ${response.status}`);
  }

  return response.json();
}

export function logout() {
  clearAuth();
  window.location.href = '/login';
}
