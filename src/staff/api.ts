import { localApiBase } from '../utils/api-base';

const TOKEN_KEY = 'dw_staff_token';

export function getStaffToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setStaffToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* quota */ }
}

export async function intake<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const token = getStaffToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${localApiBase()}/api/intake`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setStaffToken('');
    throw Object.assign(new Error('Sign in required'), { status: 401, data });
  }
  if (!res.ok) {
    throw Object.assign(new Error((data && data.error) || 'Request failed'), { status: res.status, data });
  }
  return data as T;
}
