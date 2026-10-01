/**
 * Session tokens do not expire on the device. The server never expires them, so
 * the old 30-day clock only dropped a reader's proven token every month and sent
 * them back through the email-code step for nothing.
 */
import { describe, it, expect } from 'vitest';
import { getSessionToken, setSessionToken, clearSessionToken, authHeaders } from './sessionToken';

const TOKEN = 'b'.repeat(64);

describe('session token lifetime', () => {
  it('still returns a token stamped 31 days ago', () => {
    localStorage.setItem('dw_session_token', TOKEN);
    localStorage.setItem('dw_session_token_ts', String(Date.now() - 31 * 24 * 60 * 60 * 1000));
    expect(getSessionToken()).toBe(TOKEN);
    expect(localStorage.getItem('dw_session_token')).toBe(TOKEN);
    expect(authHeaders().Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('still returns a token stamped a year ago', () => {
    localStorage.setItem('dw_session_token', TOKEN);
    localStorage.setItem('dw_session_token_ts', String(Date.now() - 365 * 24 * 60 * 60 * 1000));
    expect(getSessionToken()).toBe(TOKEN);
  });

  it('is cleared only when asked', () => {
    setSessionToken(TOKEN);
    expect(getSessionToken()).toBe(TOKEN);
    clearSessionToken();
    expect(getSessionToken()).toBeNull();
  });
});
