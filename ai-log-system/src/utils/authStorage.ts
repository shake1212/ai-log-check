const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function getStore(): Storage {
  return sessionStorage;
}

export function getToken(): string | null {
  return getStore().getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  getStore().setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  getStore().removeItem(TOKEN_KEY);
}

export function getUser(): string | null {
  return getStore().getItem(USER_KEY);
}

export function setUser(user: string): void {
  getStore().setItem(USER_KEY, user);
}

export function removeUser(): void {
  getStore().removeItem(USER_KEY);
}

export function clearAuth(): void {
  removeToken();
  removeUser();
}

export function hasToken(): boolean {
  return !!getStore().getItem(TOKEN_KEY);
}
