/**
 * B09-12 / B09-13: Write to {first name} opens an EMPTY email (address only, no
 * subject, no body, no `?`), and a 403 hides the cards rather than erroring.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkedMailto, loadPrayerCare, decidePrayer, canSeePrayerCare, loadPrayerLines, prayerWriteLink, closePrayerLine, setWaitingMuted } from './prayerCareApi';

afterEach(() => { vi.unstubAllGlobals(); });

function answer(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })));
}

describe('checkedMailto (B09-13: the server gives the link; the phone checks it)', () => {
  it('is mailto: plus the encoded address and nothing else', () => {
    const link = checkedMailto('mailto:sam%40example.org');
    expect(link).toBe('mailto:sam%40example.org');
    expect(link).not.toContain('?');
  });

  it('refuses a link that would smuggle a subject, a body or a second address in', () => {
    expect(checkedMailto('mailto:sam%40example.org?subject=Hi')).toBe('');
    expect(checkedMailto('mailto:sam%40example.org&body=x')).toBe('');
    expect(checkedMailto('mailto:sam%40example.org%3Fsubject%3DHi')).toBe('');
    expect(checkedMailto('mailto:not%20an%20email')).toBe('');
    expect(checkedMailto('https://example.org')).toBe('');
    expect(checkedMailto(undefined)).toBe('');
  });
});

describe('Needs you (B09-13)', () => {
  it('a 403 hides the card (null); lines and the mute come back as sent', async () => {
    answer(403, { error: 'no', code: 'role' });
    expect(await loadPrayerLines()).toBeNull();
    answer(200, { lines: [{ id: 'a', firstName: null, canWrite: false }], waitingMuted: true });
    expect(await loadPrayerLines()).toEqual({ lines: [{ id: 'a', firstName: null, canWrite: false }], waitingMuted: true });
  });

  it('the write link must be address-only, or it throws', async () => {
    answer(200, { href: 'mailto:sam%40example.org' });
    expect(await prayerWriteLink('a')).toBe('mailto:sam%40example.org');
    answer(200, { href: 'mailto:sam%40example.org?body=Praying' });
    await expect(prayerWriteLink('a')).rejects.toThrow();
    answer(403, { error: 'That request belongs to another campus.' });
    await expect(prayerWriteLink('a')).rejects.toThrow('another campus');
  });

  it('close answers the kind, and says when a colleague closed it first', async () => {
    answer(200, { ok: true, id: 'a', kind: 'wrote' });
    expect(await closePrayerLine('a', 'wrote')).toEqual({ kind: 'wrote', already: false });
    answer(200, { ok: true, id: 'a', kind: 'prayed', already: true });
    expect(await closePrayerLine('a', 'wrote')).toEqual({ kind: 'prayed', already: true });
    answer(400, { error: 'This request was posted without a name or an address.' });
    await expect(closePrayerLine('a', 'wrote')).rejects.toThrow();
  });

  it('the mute resolves to the saved setting', async () => {
    answer(200, { ok: true, waitingMuted: true });
    expect(await setWaitingMuted(true)).toBe(true);
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
