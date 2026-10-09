import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('index.html', 'utf8');

describe('Face ID lock is staff-only', () => {
  it('index.html loads mo-lock.js only behind the /staff path test, with data-required', () => {
    const lines = html.split('\n');
    const at = lines.findIndex(l => l.includes('mo-lock.js') && l.includes('document.write'));
    expect(lines.filter(l => l.includes('mo-lock.js') && l.includes('document.write'))).toHaveLength(1);
    expect(lines[at]).toContain('data-required="true"');
    // The /staff path test opens the block this load sits in.
    const guard = lines.slice(0, at).map(l => l.trim()).reverse().find(l => l.startsWith('if (') && l.includes('location.pathname'));
    expect(guard).toBe('if (/^\\/staff\\/*$/.test(location.pathname)) {');
    // No plain script tag that would run on the congregation pages.
    expect(html.split('\n').filter(l => !l.includes('document.write')).join('\n')).not.toMatch(/<script[^>]*src="\/multiplyos\/mo-lock\.js"/);
  });

  it('serves the canonical kit file byte for byte', () => {
    const md5 = createHash('md5').update(readFileSync('public/multiplyos/mo-lock.js')).digest('hex');
    expect(md5).toBe('9c5eeb345c94f40d5efa2ef6c07a1051');
  });
});

describe('sign-in view is never locked, and sessions hand off to the kit', () => {
  it('index.html puts the sign-in marker in <head> before the kit, for a signed-out or "use password" /staff load', () => {
    const marker = html.indexOf('data-mo-lock-signin');
    const kit = html.indexOf('/multiplyos/mo-lock.js');
    expect(marker).toBeGreaterThan(-1);
    expect(marker).toBeLessThan(kit);
    expect(html).toContain("localStorage.getItem('dw_staff_token')");
    expect(html).toContain("sessionStorage.getItem('mo-lock:signout-at')");
  });

  it('forgetLockDevice removes the leftover record and seen stamp', async () => {
    const { forgetLockDevice } = await import('../utils/moLock');
    localStorage.setItem('mo-lock:v1', '{}');
    localStorage.setItem('mo-lock:seen', '1');
    forgetLockDevice();
    expect(localStorage.getItem('mo-lock:v1')).toBeNull();
    expect(localStorage.getItem('mo-lock:seen')).toBeNull();
  });

  it('markLockSignedIn sets the one-shot cookie the kit reads', async () => {
    const { markLockSignedIn } = await import('../utils/moLock');
    markLockSignedIn();
    expect(document.cookie).toMatch(/mo-lock-signedin=\d+/);
  });
});
