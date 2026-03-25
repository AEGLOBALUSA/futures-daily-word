/**
 * Session Token — stored in localStorage, sent as Authorization header.
 * Separate from dw_profile to keep auth concerns isolated.
 */

const TOKEN_KEY = 'dw_session_token';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** Build headers for authenticated API calls. Includes Authorization if token exists. */
export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getSessionToken();
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}
