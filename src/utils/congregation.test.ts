import { describe, it, expect, beforeEach } from 'vitest';
import { defaultCongregation, getCongregation, setCongregation, hasChosenCongregation, CONGREGATION_KEY } from './congregation';

describe('defaultCongregation', () => {
  it('follows the campus first, then Spanish, then an Australian time zone', () => {
    expect(defaultCongregation({ campus: 'us-futuros-duluth', lang: 'en' })).toBe('futuros-us');
    expect(defaultCongregation({ campus: 'au-paradise', lang: 'es' })).toBe('futures-au');
    expect(defaultCongregation({ campus: 'us-alpharetta', lang: 'es' })).toBe('futures-us');
    expect(defaultCongregation({ lang: 'es-MX' })).toBe('futuros-us');
    expect(defaultCongregation({ lang: 'en', timeZone: 'Australia/Adelaide' })).toBe('futures-au');
    expect(defaultCongregation({ lang: 'en', timeZone: 'America/New_York' })).toBe('futures-us');
    expect(defaultCongregation({})).toBe('futures-us');
  });
});

describe('stored congregation', () => {
  beforeEach(() => { localStorage.clear(); });

  it('is unchosen until set, then sticks and announces the change', () => {
    expect(hasChosenCongregation()).toBe(false);
    let announced = '';
    window.addEventListener('dw-congregation-changed', (e) => { announced = (e as CustomEvent).detail.id; });
    setCongregation('futures-au');
    expect(localStorage.getItem(CONGREGATION_KEY)).toBe('futures-au');
    expect(getCongregation()).toBe('futures-au');
    expect(hasChosenCongregation()).toBe(true);
    expect(announced).toBe('futures-au');
  });

  it('ignores junk in storage', () => {
    localStorage.setItem(CONGREGATION_KEY, 'mars');
    expect(hasChosenCongregation()).toBe(false);
    expect(['futures-us', 'futures-au', 'futuros-us']).toContain(getCongregation());
  });
});
