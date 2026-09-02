import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import { campusFromCountry, campusFromTimezone, COLLEGE } from './geo';

const require = createRequire(import.meta.url);
const { countryFromRequest } = require('../../netlify/functions/lib/geo-country.js');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('countryFromRequest', () => {
  it('reads x-nf-country', () => {
    expect(countryFromRequest({ headers: { 'x-nf-country': 'au' } }, {})).toBe('AU');
  });

  it('reads x-country when nf header is missing', () => {
    expect(countryFromRequest({ headers: { 'X-Country': 'US' } }, {})).toBe('US');
  });

  it('falls back to context.geo.country.code', () => {
    expect(countryFromRequest({ headers: {} }, { geo: { country: { code: 'gb' } } })).toBe('GB');
  });

  it('returns null when geo is missing', () => {
    expect(countryFromRequest({ headers: {} }, {})).toBeNull();
  });
});

describe('campusFromTimezone', () => {
  it('maps Australia/* to AU and America/* to US', () => {
    expect(campusFromTimezone('Australia/Adelaide')).toBe('AU');
    expect(campusFromTimezone('America/New_York')).toBe('US');
    expect(campusFromTimezone('Europe/London')).toBe('OTHER');
    expect(campusFromTimezone('Pacific/Auckland')).toBe('OTHER');
  });
});

describe('campusFromCountry', () => {
  it('picks one campus from IP and never both', () => {
    expect(campusFromCountry('AU')).toBe('AU');
    expect(campusFromCountry('US')).toBe('US');
    expect(campusFromCountry('GB', 'America/New_York')).toBe('OTHER');
    expect(campusFromCountry(null, 'Australia/Sydney')).toBe('AU');
    expect(campusFromCountry('', 'America/Chicago')).toBe('US');
  });

  it('points AU and chooser at futures.church/college and US at futuresglobal.college', () => {
    expect(COLLEGE.AU.href).toBe('https://futures.church/college');
    expect(COLLEGE.US.href).toBe('https://futuresglobal.college/');
    expect(COLLEGE.OTHER.href).toBe('https://futures.church/college');
    expect(new Set(Object.keys(COLLEGE))).toEqual(new Set(['AU', 'US', 'OTHER']));
  });
});
