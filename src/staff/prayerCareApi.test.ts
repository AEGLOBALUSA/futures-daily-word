/**
 * B09-12: Write to {first name} opens an EMPTY email (address only, no subject,
 * no body, no `?`), and a 403 hides the cards rather than erroring.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mailtoFor, loadPrayerCare, decidePrayer, canSeePrayerCare } from './prayerCareApi';

afterEach(() => { vi.unstubAllGlobals(); });

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })));
}

describe('mailtoFor', () => {
  it('is mailto: plus the encoded address and nothing else', () => {
    const link = mailtoFor('sam@example.org');
    expect(link).toBe('mailto:sam%40example.org');
    expect(link).not.toContain('?');
    expect(link).not.toMatch(/subject|body|cc=|bcc=/i);
  });

  it('refuses an address that would smuggle a subject or body in', () => {
    expect(mailtoFor('sam@example.org?subject=Hi')).toBe('');
    expect(mailtoFor('sam@example.org&body=x')).toBe('');
    expect(mailtoFor('not an email')).toBe('');
    expect(mailtoFor(undefined)).toBe('');
  });
});

describe('loadPrayerCare / decidePrayer', () => {
  it('a 403 hides the cards (null)', async () => {
    answer(403, { error: 'no', code: 'role' });
    expect(await loadPrayerCare()).toBeNull();
  });

  it('another failure throws so the screen can say so', async () => {
    answer(500, { error: 'Server error' });
    await expect(loadPrayerCare()).rejects.toThrow();
  });

  it('a 409 on decide means someone decided first', async () => {
    answer(409, { error: 'Someone has already decided this one.' });
    expect(await decidePrayer('11111111-1111-4111-8111-111111111111', 'show')).toBe('decided');
    answer(200, { ok: true, id: 'x', status: 'private' });
    expect(await decidePrayer('11111111-1111-4111-8111-111111111111', 'private')).toBe('private');
  });

  it('media does not get the cards', () => {
    expect(canSeePrayerCare({ role: 'media' })).toBe(false);
    expect(canSeePrayerCare({ role: 'campus' })).toBe(true);
    expect(canSeePrayerCare({ role: 'hub' })).toBe(true);
    expect(canSeePrayerCare({ role: 'media', isAdmin: true })).toBe(true);
  });
});
