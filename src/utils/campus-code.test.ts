/**
 * One derivation for the campus pastor code (netlify/functions/lib/campus-code).
 * Guards the bug the Phase 1 review caught: pastor-admin minted SHA-256 of the
 * full campus id while analytics-dashboard checked SHA-256 of the short slug,
 * so a listed code never opened the Campus Overview.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const cc = require('../../netlify/functions/lib/campus-code.js');

const SECRET = 'test-secret';
const h8 = (input: string) => createHash('sha256').update(`${input}:${SECRET}`).digest('hex').slice(0, 8).toUpperCase();

describe('campus-code', () => {
  it('mints the full-id form (what list-codes prints and video-upload validates)', () => {
    expect(cc.generateCampusCode('us-gwinnett', SECRET)).toBe(h8('us-gwinnett'));
    expect(cc.generateCampusCode('us-gwinnett', SECRET)).toHaveLength(8);
  });

  it('refuses to mint without a secret or for an unknown campus', () => {
    expect(cc.generateCampusCode('us-gwinnett', '')).toBeNull();
    expect(cc.generateCampusCode('us-nowhere', SECRET)).toBeNull();
    expect(cc.generateCampusCode('', SECRET)).toBeNull();
  });

  it('a minted code opens its own campus and no other', () => {
    const code = cc.generateCampusCode('us-alpharetta', SECRET);
    expect(cc.validateCampusCode('us-alpharetta', code, SECRET)).toBe(true);
    expect(cc.validateCampusCode('us-alpharetta', code.toLowerCase(), SECRET)).toBe(true);
    expect(cc.validateCampusCode('us-gwinnett', code, SECRET)).toBe(false);
    expect(cc.campusForCode(code, SECRET)).toBe('us-alpharetta');
    expect(cc.campusForCode(code, 'other-secret')).toBeNull();
    expect(cc.campusForCode('NOPE0000', SECRET)).toBeNull();
  });

  it('still accepts the legacy slug-derived code the dashboard used to expect', () => {
    const legacy = h8('gwinnett');
    expect(legacy).not.toBe(cc.generateCampusCode('us-gwinnett', SECRET));
    expect(cc.validateCampusCode('us-gwinnett', legacy, SECRET)).toBe(true);
    expect(cc.campusForCode(legacy, SECRET)).toBe('us-gwinnett');
    expect(cc.campusSlug('us-futuros-duluth')).toBe('futuros-duluth');
    expect(cc.campusSlug('br-rio')).toBe('rio');
  });

  it('every campus id resolves back from its own code', () => {
    const core = require('../../netlify/functions/lib/intake-core.js');
    for (const id of core.CAMPUS_IDS as string[]) {
      expect(cc.campusForCode(cc.generateCampusCode(id, SECRET), SECRET)).toBe(id);
    }
  });
});
