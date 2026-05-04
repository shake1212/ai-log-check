export interface ValidateTokenResponse {
  valid: boolean;
  user?: any;
}

export async function validateToken(token: string): Promise<ValidateTokenResponse> {
  const response = await fetch('/api/auth/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Token validation failed');
  }
  
  return response.json();
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
