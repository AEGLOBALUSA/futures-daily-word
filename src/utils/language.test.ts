import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudSync', () => ({ syncMisc: vi.fn(), flushNow: vi.fn() }));
vi.mock('./analytics', () => ({ track: vi.fn() }));

import { applyLanguage, LANGS, LANG_DEFAULT_TRANSLATION } from './language';
import { syncMisc, flushNow } from './cloudSync';
import { getLang } from './i18n';

describe('applyLanguage (shared by Settings and the front-page switch)', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('persists, broadcasts, backs up, and re-points the Bible translation', () => {
    localStorage.setItem('dw_translation_manual', 'true');
    const seen: string[] = [];
    const h = () => seen.push(getLang());
    window.addEventListener('dw-lang-changed', h);
    applyLanguage('es');
    window.removeEventListener('dw-lang-changed', h);
    expect(localStorage.getItem('dw_lang')).toBe('es');
    expect(seen).toEqual(['es']);
    expect(localStorage.getItem('dw_translation')).toBe(LANG_DEFAULT_TRANSLATION.es);
    expect(localStorage.getItem('dw_translation_manual')).toBeNull();
    expect(syncMisc).toHaveBeenCalledWith('dw_lang', 'es');
    expect(flushNow).toHaveBeenCalled();
  });

  it('offers the four app languages with distinct family tones and monograms', () => {
    expect(LANGS.map(l => l.code).sort()).toEqual(['en', 'es', 'id', 'pt']);
    expect(new Set(LANGS.map(l => l.tone)).size).toBe(4);
    expect(new Set(LANGS.map(l => l.short)).size).toBe(4);
    for (const l of LANGS) expect(LANG_DEFAULT_TRANSLATION[l.code]).toBeTruthy();
  });
});
