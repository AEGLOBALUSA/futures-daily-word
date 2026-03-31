/**
 * Session Token — stored in localStorage, sent as Authorization header.
 * Separate from dw_profile to keep auth concerns isolated.
 * Tokens expire after 30 days. Expired tokens are cleared on app load.
 */

const TOKEN_KEY = 'dw_session_token';
const TOKEN_TS_KEY = 'dw_session_token_ts';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSessionToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const ts = parseInt(localStorage.getItem(TOKEN_TS_KEY) || '0', 10);
    if (ts > 0 && Date.now() - ts > TOKEN_TTL_MS) {
      clearSessionToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TS_KEY, String(Date.now()));
  } catch {}
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_TS_KEY);
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
