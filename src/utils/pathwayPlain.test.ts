import { describe, it, expect } from 'vitest';
import { localizedPlain } from './pathwayPlain';

describe('localizedPlain', () => {
  it('falls back to English when the language translation is missing', () => {
    expect(localizedPlain({ plain: 'In plain words.' }, 'es')).toBe('In plain words.');
  });

  it('prefers the language field when present', () => {
    expect(localizedPlain({ plain: 'In plain words.', plainEs: 'En palabras sencillas.' }, 'es')).toBe('En palabras sencillas.');
  });

  it('returns empty when the day has no plain sentence at all', () => {
    expect(localizedPlain({}, 'en')).toBe('');
    expect(localizedPlain({}, 'es')).toBe('');
  });

  it('trims whitespace', () => {
    expect(localizedPlain({ plain: '  Trimmed.  ' }, 'en')).toBe('Trimmed.');
  });
});
