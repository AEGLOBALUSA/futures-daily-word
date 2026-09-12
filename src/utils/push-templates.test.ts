/**
 * Push notification copy (netlify/functions/lib/push-templates.js): four
 * languages (en, es, pt, id), seven neutral scripture-snippet templates each,
 * no streak/guilt/urgency words, no em dashes in the new es/pt strings, and
 * lang normalisation for region-tagged subscriber values (e.g. 'pt-BR').
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pt = require('../../netlify/functions/lib/push-templates.js');

const LANGS = ['en', 'es', 'pt', 'id'];
const GUILT_WORDS = /\b(streak|racha|sequ[eê]ncias?|miss|lose|break)\b/i;

describe('push-templates', () => {
  it('has all four languages present in TEMPLATES', () => {
    for (const lang of LANGS) {
      expect(pt.TEMPLATES[lang]).toBeDefined();
    }
  });

  it('has exactly 7 templates per language', () => {
    for (const lang of LANGS) {
      expect(pt.TEMPLATES[lang].length).toBe(7);
    }
  });

  it('has no title or body in any language matching a guilt/streak word', () => {
    for (const lang of LANGS) {
      for (const template of pt.TEMPLATES[lang]) {
        expect(template.title).not.toMatch(GUILT_WORDS);
        expect(template.body).not.toMatch(GUILT_WORDS);
      }
    }
  });

  it('has no guilt/streak words in any VERSE_SNIPPETS entry', () => {
    for (const lang of LANGS) {
      for (const snippet of Object.values(pt.VERSE_SNIPPETS[lang])) {
        expect(snippet as string).not.toMatch(GUILT_WORDS);
      }
    }
  });

  it('has no em dash (U+2014) in the new es/pt template or snippet strings', () => {
    for (const lang of ['es', 'pt']) {
      for (const template of pt.TEMPLATES[lang]) {
        expect(template.title).not.toMatch(/—/);
        expect(template.body).not.toMatch(/—/);
      }
      for (const snippet of Object.values(pt.VERSE_SNIPPETS[lang])) {
        expect(snippet as string).not.toMatch(/—/);
      }
    }
  });

  it('normalises a region-tagged lang to its base two letters', () => {
    expect(pt.normLang('pt-BR')).toBe('pt');
    expect(pt.normLang('es-MX')).toBe('es');
  });

  it('falls back to en for an unsupported lang', () => {
    expect(pt.normLang('fr')).toBe('en');
    expect(pt.normLang(undefined)).toBe('en');
  });

  it('getTemplate resolves a region-tagged es lang to an es template', () => {
    const template = pt.getTemplate('es');
    expect(pt.TEMPLATES.es).toContainEqual(template);
  });
});
