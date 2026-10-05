import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickError, changeDetailsSeed, otherMessageLabel, sameVideo, needsTheForm, needsQuestion, quickErrorText, quickNotesPublish, withOtherAnswer, type QuickResult } from './quickNotesApi';
import { intake } from './api';
import { t } from '../utils/i18n';

vi.mock('./api', () => ({ intake: vi.fn() }));

const base = (needs: QuickResult['needs']): QuickResult => ({
  congregation: 'futures-us', congregationName: 'Futures USA', sunday: '2026-10-04',
  details: { date: '2026-10-04', title: 'T', speaker: 'S', series: '', youtubeUrl: '', keyVerse: '' },
  guessed: [], youtubeOnly: false, preview: null, answers: { q1: 'a' }, needs, source: 'rules', published: false,
});

describe('quickErrorText: never the server or browser English', () => {
  for (const lang of ['en', 'es', 'pt', 'id']) {
    it(`maps each known failure to its own words (${lang})`, () => {
      expect(quickErrorText(new TypeError('Failed to fetch'), lang)).toBe(t('staff_quick_err_network', lang));
      expect(quickErrorText(new TypeError('Load failed'), lang)).toBe(t('staff_quick_err_network', lang));
      expect(quickErrorText({ status: 403, data: { error: 'Only hub, media or admin staff can put up Sunday\'s notes.', code: 'role' } }, lang)).toBe(t('staff_quick_err_role', lang));
      expect(quickErrorText({ status: 400, data: { error: 'That message is no longer on the list. Pick the message again.', code: 'target_gone' } }, lang)).toBe(t('staff_quick_err_target_gone', lang));
      expect(quickErrorText({ status: 400, data: { error: 'Missing: Title' } }, lang)).toBe(t('staff_quick_err_missing', lang));
      expect(quickErrorText({ status: 401, data: {} }, lang)).toBe(t('staff_quick_err_signin', lang));
      expect(quickErrorText({ status: 400, data: { code: 'too_long', error: 'That is longer…' } }, lang)).toBe(t('staff_quick_err_long', lang));
      expect(quickErrorText({ status: 500, data: { error: 'relation "x" does not exist' } }, lang)).toBe(t('staff_quick_err_generic', lang));
      expect(quickErrorText(new Error('Request failed'), lang)).toBe(t('staff_quick_err_generic', lang));
    });
  }
  it('keeps words already translated (a wrapped error is not turned generic)', () => {
    const words = t('staff_quick_err_not_live', 'es');
    expect(quickErrorText(new QuickError(words), 'en')).toBe(words);
  });
  it('every key it can return exists in en, es, pt and id', () => {
    for (const key of ['staff_quick_err_network', 'staff_quick_err_role', 'staff_quick_err_missing', 'staff_quick_ask_series', 'staff_quick_ask_youtube', 'staff_quick_ask_in_form']) {
      for (const lang of ['en', 'es', 'pt', 'id']) expect(t(key, lang)).not.toBe(key);
    }
  });
});

describe('a missing detail the one box cannot take goes to the form', () => {
  const pick = { key: 'other' as const, questionId: 'q9', label: 'Campus', type: 'campus' };
  const words = { key: 'other' as const, questionId: 'q8', label: 'Theme', type: 'text' };
  it('needsTheForm only for non-word types', () => {
    expect(needsTheForm(pick)).toBe(true);
    expect(needsTheForm({ ...pick, type: 'sermon_pick' })).toBe(true);
    expect(needsTheForm(words)).toBe(false);
    expect(needsTheForm({ ...words, type: 'long_text' })).toBe(false);
    expect(needsTheForm({ key: 'title', questionId: 'q1', label: 'Title', type: 'text' })).toBe(false);
    expect(needsTheForm(null)).toBe(false);
  });
  it('withOtherAnswer never marks a pick-list question answered from typed text', () => {
    const r = base(pick);
    expect(withOtherAnswer(r, 'Alpharetta')).toBe(r);
  });
  it('withOtherAnswer folds a word answer in by question id, and ignores an empty one', () => {
    const r = withOtherAnswer(base(words), '  Hope  ');
    expect(r.needs).toBeNull();
    expect(r.answers).toEqual({ q1: 'a', q8: 'Hope' });
    const blank = base(words);
    expect(withOtherAnswer(blank, '   ')).toBe(blank);
  });
  it('the question names the form for a pick-list detail', () => {
    expect(needsQuestion(pick, 'en')).toBe(t('staff_quick_ask_in_form', 'en').replace('{label}', 'Campus'));
    expect(needsQuestion({ key: 'series', questionId: 'q3', label: 'Series', type: 'text' }, 'es')).toBe(t('staff_quick_ask_series', 'es'));
  });
});

describe('a link that joins the message just preached (review MUST, 4 Oct 2026)', () => {
  const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const attachResult = (): QuickResult => ({
    ...base(null),
    details: { date: '2026-10-04', title: 'Ordinary Faith', speaker: 'S', series: '', youtubeUrl: YT, keyVerse: '' },
    youtubeOnly: true,
    preview: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', date: '2026-10-04', speaker: 'S', youtubeUrl: YT },
    answers: { 'x-title': 'Ordinary Faith', 'x-date': '2026-10-04' },
    attach: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', job: 'media', answers: { pick: 'ordinary-faith-2026-10-04', yt: YT } },
  });
  afterEach(() => { vi.mocked(intake).mockReset(); vi.unstubAllGlobals(); });

  it('publishes through submit with the media job and the media answers only, never a formatted sermon', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'ordinary-faith-2026-10-04', youtubeUrl: YT } }) })));
    const out = await quickNotesPublish(attachResult());
    expect(vi.mocked(intake)).toHaveBeenCalledWith('submit', { answers: { pick: 'ordinary-faith-2026-10-04', yt: YT }, job: 'media', congregation: 'futures-us' });
    expect(out).toEqual({ id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', verified: true, checked: true, empty: false, showing: '' });
  });

  it('is verified only when the page shows the new link', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'ordinary-faith-2026-10-04', youtubeUrl: '' } }) })));
    expect((await quickNotesPublish(attachResult())).verified).toBe(false);
  });

  it('another message with the same link never passes as this one (flow review MUST, 4 Oct 2026)', async () => {
    // The page shows a different message that happens to carry the same link.
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'grace-2026-10-11', youtubeUrl: YT } }) })));
    expect((await quickNotesPublish(attachResult())).verified).toBe(false);
    // submit changed a different row than the one the card named.
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'grace-2026-10-11', title: 'Grace' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'ordinary-faith-2026-10-04', youtubeUrl: YT } }) })));
    const out = await quickNotesPublish(attachResult());
    expect(out.verified).toBe(false);
    expect(out.title).toBe('Grace');
  });

  it('when another message became current before the save, says which one the page shows instead of "pull to refresh" (flow review MUST)', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'grace-2026-10-11', title: 'Grace', youtubeUrl: '' } }) })));
    expect(await quickNotesPublish(attachResult())).toEqual({ id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', verified: false, checked: true, empty: false, showing: 'Grace' });
    // The same message, just not refreshed yet: no `showing`.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', youtubeUrl: '' } }) })));
    expect((await quickNotesPublish(attachResult())).showing).toBe('');
  });

  it('when the page could not be read, checked is false so no done line promises a refresh (flow review round 3 MUST)', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await quickNotesPublish(attachResult())).toMatchObject({ verified: false, checked: false, showing: '' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    expect((await quickNotesPublish(attachResult())).checked).toBe(false);
  });

  it('another message with the same title is still named, with its Sunday (flow review round 3 MUST)', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'ordinary-faith-2026-10-11', title: 'Ordinary Faith', date: '2026-10-11', youtubeUrl: '' } }) })));
    const out = await quickNotesPublish(attachResult());
    expect(out.verified).toBe(false);
    expect(out.showing).toMatch(/^Ordinary Faith \(.+\)$/);
    expect(otherMessageLabel({ title: 'Grace', date: '2026-10-11' }, 'Ordinary Faith', 'en')).toBe('Grace');
    expect(otherMessageLabel({ title: 'grace ', date: '2026-10-11' }, 'Grace', 'en')).toContain('11');
  });

  it('the same video in another link form still verifies; another video never does (flow review round 4 MUST)', async () => {
    expect(sameVideo('https://youtu.be/dQw4w9WgXcQ?si=x', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(sameVideo('https://youtu.be/dQw4w9WgXcQ', 'https://youtu.be/aaaaaaaaaaa')).toBe(false);
    expect(sameVideo('', '')).toBe(false);
  });

  it('a page that shows no message at all is empty, never "pull to refresh" (flow review round 5 MUST)', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: null }) })));
    expect(await quickNotesPublish(attachResult())).toMatchObject({ verified: false, checked: true, empty: true, showing: '' });
  });

  it('a link whose message is the person\'s call never publishes from the card; Change details opens the media form with the link in', async () => {
    const r: QuickResult = {
      ...attachResult(), preview: null,
      needs: { key: 'other', questionId: 'pick', label: 'Which sermon', type: 'sermon_pick' },
      attach: { id: '', title: '', job: 'media', answers: { yt: YT }, later: { title: 'Grace', date: '2026-10-11' } },
    };
    expect(needsTheForm(r.needs)).toBe(true);
    await expect(quickNotesPublish(r)).rejects.toThrow();
    await expect(quickNotesPublish({ ...r, needs: null, preview: attachResult().preview })).rejects.toThrow();
    expect(vi.mocked(intake)).not.toHaveBeenCalled();
    expect(changeDetailsSeed(r)).toEqual({ answers: { yt: YT }, preview: null, congregation: 'futures-us', job: 'media' });
  });

  it('notes still publish through the hub job with the preview', async () => {
    vi.mocked(intake).mockResolvedValue({ published: true, publish_result: { sermon: { id: 'p1', title: 'T' } } });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermon: { id: 'p1' } }) })));
    const r = { ...base(null), preview: { id: 'p1', title: 'T', date: '2026-10-04', speaker: 'S' }, attach: null };
    await quickNotesPublish(r);
    expect(vi.mocked(intake)).toHaveBeenCalledWith('submit', { answers: { q1: 'a' }, job: 'hub', congregation: 'futures-us', formatted_sermon: r.preview });
  });

  it('Change details opens the media form on that message; notes open the hub form', () => {
    expect(changeDetailsSeed(attachResult())).toEqual({ answers: { pick: 'ordinary-faith-2026-10-04', yt: YT }, preview: null, congregation: 'futures-us', job: 'media' });
    expect(changeDetailsSeed(base(null))).toMatchObject({ answers: { q1: 'a' }, job: 'hub' });
  });

  it('a word answer to a media-form question folds into the attach answers', () => {
    const r = { ...attachResult(), needs: { key: 'other' as const, questionId: 'note', label: 'Note', type: 'text' } };
    const next = withOtherAnswer(r, ' ok ');
    expect(next.needs).toBeNull();
    expect(next.attach?.answers).toEqual({ pick: 'ordinary-faith-2026-10-04', yt: YT, note: 'ok' });
    expect(next.answers).toEqual(r.answers);
  });
});
