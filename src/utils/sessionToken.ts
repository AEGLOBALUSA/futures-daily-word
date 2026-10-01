/**
 * Session Token — stored in localStorage, sent as Authorization header.
 * Separate from dw_profile to keep auth concerns isolated.
 *
 * Tokens do NOT expire on the device. Server tokens never expire, so the old
 * 30-day clock had no security value; its only effect was to drop a reader's
 * proven token every month, after which the next sync would have to prove the
 * email again. A token is cleared only when the server answers 401 or the
 * person signs out.
 */

const TOKEN_KEY = 'dw_session_token';
const TOKEN_TS_KEY = 'dw_session_token_ts';

export function getSessionToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
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
