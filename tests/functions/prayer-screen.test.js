/**
 * B09-12: the prayer wall's deterministic screen (lib/prayer-screen.js).
 * Contact details, links and bad language wait for a staff look; ordinary
 * prayers pass. All examples are made up (this repo is public).
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { screenPrayer } = require_('../../netlify/functions/lib/prayer-screen.js');

describe('screenPrayer (B09-12)', () => {
  it('passes ordinary prayers, verses, times and dates', () => {
    for (const text of [
      'Please pray for my job interview on Thursday',
      'Healing for my mum after surgery. John 3:16 has been on my heart.',
      'Pray for our small group at 10:30 on Sunday',
      'My son starts school on 05/10/2026, pray he settles in',
      'We fly out 2026-10-05 for the mission trip',
      'Two years, 365 days, of praying for my dad. Psalm 121:1-2',
      'Pray for peace in our home. Hell has felt close this week.',
      'Ora por mi familia, por favor',
    ]) {
      expect(screenPrayer(text, 'Sam Example'), text).toEqual({ held: false, reason: null });
    }
  });

  it('holds a phone number of 8 or more digits, however it is typed', () => {
    for (const text of [
      'Call me on 0400 123 456',
      'ring 0412-345-678 please',
      'Text +61 400 123 456',
      'my number (08) 8123 4567',
      'whatsapp 0812.3456.7890',
    ]) {
      expect(screenPrayer(text, ''), text).toEqual({ held: true, reason: 'contact' });
    }
  });

  it('holds an email address, typed or spelled out', () => {
    expect(screenPrayer('email me at sam@example.org', '')).toEqual({ held: true, reason: 'contact' });
    expect(screenPrayer('write to sam dot e at gmail dot com', '')).toEqual({ held: true, reason: 'contact' });
  });

  it('holds a link', () => {
    for (const text of ['see https://example.org/x', 'www.example.org', 'go to example.com today', 'follow @someone_here']) {
      expect(screenPrayer(text, ''), text).toEqual({ held: true, reason: 'link' });
    }
  });

  it('holds bad language, as whole words only', () => {
    expect(screenPrayer('this is such shit', '')).toEqual({ held: true, reason: 'language' });
    expect(screenPrayer('qué mierda', '')).toEqual({ held: true, reason: 'language' });
    // Scunthorpe: a word that only contains a listed word passes.
    expect(screenPrayer('Pray for the Scunthorpe team and for Dickens Street', '')).toEqual({ held: false, reason: null });
  });

  it('screens the name too, and contact wins over link and language', () => {
    expect(screenPrayer('Pray for me', 'Sam 0400 123 456')).toEqual({ held: true, reason: 'contact' });
    expect(screenPrayer('shit, see example.com, call 0400 123 456', '')).toEqual({ held: true, reason: 'contact' });
    expect(screenPrayer('shit, see example.com', '')).toEqual({ held: true, reason: 'link' });
  });
});
