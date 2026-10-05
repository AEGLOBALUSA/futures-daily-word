// The campus corner draft card (B09-18). Plain react-dom + act, in the style of
// StaffApp.test.tsx (this repo has no @testing-library/dom).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('./cornerDraftApi', () => ({
  getCornerDraft: vi.fn(), listCornerDrafts: vi.fn(), refreshCornerDraft: vi.fn(),
  publishCornerDraft: vi.fn(), skipCornerDraft: vi.fn(), cornerDraftErrorCode: vi.fn(),
}));

import { CornerDraftCard } from './CornerDraftCard';
import {
  cornerDraftErrorCode, getCornerDraft, listCornerDrafts, publishCornerDraft,
  refreshCornerDraft, skipCornerDraft, type CornerDraft,
} from './cornerDraftApi';

const PUBLISH = 'Put this on the campus corner';
const onJob = vi.fn();
let el: HTMLDivElement;
let root: Root;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function clipboard(value: { writeText: (text: string) => Promise<void> } | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function draft(overrides: Partial<CornerDraft> = {}): CornerDraft {
  return {
    id: 'draft-a', campusId: 'us-test', campusName: 'Test Campus', weekOf: '2026-10-05',
    lang: 'en', body: 'A note for this week.', prayerPoint: '', status: 'draft', version: 'v1', writtenBy: 'model',
    refreshesLeft: 5, answered: { extra: false, prayerPoint: false },
    source: { title: 'A message of hope', speaker: 'Guest speaker', keyVerse: '', series: '' },
    ...overrides,
  };
}
const response = (d: CornerDraft | null) => ({ campusId: 'us-test', campusName: 'Test Campus', draft: d });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
}
async function mount(isAdmin = false) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => { root.render(<CornerDraftCard isAdmin={isAdmin} onJob={onJob} />); });
  await flush();
}
function button(name: string): HTMLButtonElement | undefined {
  return [...el.querySelectorAll('button')].find(b => !b.closest('[hidden]') && (b.textContent || '').trim() === name);
}
async function press(name: string) {
  const b = button(name);
  if (!b) throw new Error(`no button "${name}" in: ${el.textContent}`);
  await act(async () => { b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await flush();
}
function field(label: string): HTMLTextAreaElement | null {
  const l = [...el.querySelectorAll('label')].find(x => !x.closest('[hidden]') && (x.textContent || '').trim() === label);
  return l ? (document.getElementById(l.htmlFor) as HTMLTextAreaElement | null) : null;
}
function type(label: string, value: string) {
  const f = field(label);
  if (!f) throw new Error(`no field "${label}"`);
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => { set.call(f, value); f.dispatchEvent(new Event('input', { bubbles: true })); });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCornerDraft).mockResolvedValue(response(draft()));
  vi.mocked(listCornerDrafts).mockResolvedValue([]);
  vi.mocked(publishCornerDraft).mockResolvedValue({ campusId: 'us-test', campusName: 'Test Campus', item: { title: '', content: '' } });
  vi.mocked(skipCornerDraft).mockResolvedValue(undefined);
  vi.mocked(cornerDraftErrorCode).mockImplementation(err => ((err as { data?: { code?: string } })?.data?.code ?? '') as never);
});
afterEach(() => {
  act(() => root.unmount()); el.remove();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

describe('CornerDraftCard, campus pastor', () => {
  it.each(['note', 'prayer', 'answer', 'all'])('round 3: keeps late %s edits after publishing the submitted words', async changed => {
    const pending = deferred<Awaited<ReturnType<typeof publishCornerDraft>>>();
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard({ writeText });
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ prayerPoint: 'Original prayer' })));
    vi.mocked(publishCornerDraft).mockReturnValue(pending.promise);
    await mount();
    type('The corner note', 'Submitted note');
    await press(PUBLISH);
    // Returning to the original draft is still an edit to the submitted words.
    if (changed === 'note' || changed === 'all') type('The corner note', 'A note for this week.');
    if (changed === 'prayer' || changed === 'all') type('Prayer point (your words)', 'Late prayer');
    if (changed === 'answer' || changed === 'all') type('Anything on at Test Campus this week?', 'Late answer');
    await act(async () => pending.resolve({ campusId: 'us-test', campusName: 'Test Campus', item: { title: '', content: '' } }));
    expect(publishCornerDraft).toHaveBeenCalledExactlyOnceWith('Submitted note', 'Original prayer', undefined, 'v1');
    expect(el.textContent).toContain("It's on the Test Campus corner.");
    expect(el.textContent).toContain('Words you typed after it went up (not on the corner):');
    const kept = [changed === 'note' || changed === 'all' ? 'A note for this week.' : 'Submitted note',
      changed === 'prayer' || changed === 'all' ? 'Late prayer' : 'Original prayer',
      changed === 'answer' || changed === 'all' ? 'Late answer' : ''].filter(Boolean).join('\n\n');
    expect(el.querySelector<HTMLElement>('[role="region"]')?.textContent).toBe(kept);
    expect(el.querySelector<HTMLElement>('[role="region"]')?.style.userSelect).toBe('text');
    expect(el.querySelector('textarea')).toBeNull();
    await press('Copy my words');
    expect(writeText).toHaveBeenCalledWith(kept);
    await press('Use the form instead');
    expect(onJob).toHaveBeenCalledWith('campus', undefined);
  });

  it('round 3 MUST: preserves deletions made while Publish is in flight as unpublished words', async () => {
    const pending = deferred<Awaited<ReturnType<typeof publishCornerDraft>>>();
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard({ writeText });
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ prayerPoint: 'Submitted prayer' })));
    vi.mocked(publishCornerDraft).mockReturnValue(pending.promise);
    await mount();
    await press(PUBLISH);
    type('The corner note', '');
    type('Prayer point (your words)', '');
    await act(async () => pending.resolve({ campusId: 'us-test', campusName: 'Test Campus', item: { title: '', content: '' } }));
    expect(publishCornerDraft).toHaveBeenCalledExactlyOnceWith('A note for this week.', 'Submitted prayer', undefined, 'v1');
    expect(el.textContent).toContain('Words you typed after it went up (not on the corner):');
    expect(el.querySelector('[role="region"]')?.textContent).toBe('');
    expect(el.querySelector('textarea, [contenteditable], [disabled]')).toBeNull();
    await press('Copy my words');
    expect(writeText).toHaveBeenCalledWith('');
  });

  it.each([
    ['refresh', 'Add this to the draft', PUBLISH],
    ['publish', PUBLISH, 'Not this week'],
    ['skip', 'Not this week', 'Add this to the draft'],
  ] as const)('round 3: clears a failed %s reload when a different button recovers', async (action, first, recovery) => {
    vi.mocked(action === 'refresh' ? refreshCornerDraft : action === 'publish' ? publishCornerDraft : skipCornerDraft)
      .mockRejectedValue({ data: { code: 'stale' } });
    await mount();
    vi.mocked(getCornerDraft).mockRejectedValueOnce(new Error('offline'));
    if (action === 'refresh') type('Anything on at Test Campus this week?', 'Pending answer');
    await press(first);
    expect(button(first)?.parentElement?.textContent).toContain('The corner draft did not load.');
    await press(recovery);
    expect(el.textContent).not.toContain('The corner draft did not load.');
    expect(button('Try again')).toBeUndefined();
    expect(button(recovery)?.parentElement?.textContent).toContain('Check the note, then try again.');
    expect(getCornerDraft).toHaveBeenCalledTimes(3);
    expect(skipCornerDraft).toHaveBeenCalledTimes(action === 'skip' ? 1 : 0);
    if (action === 'refresh') expect(publishCornerDraft).not.toHaveBeenCalled();
  });

  it('round 3: Not this week says it is working until the request finishes', async () => {
    const pending = deferred<void>();
    vi.mocked(skipCornerDraft).mockReturnValue(pending.promise);
    await mount();
    await press('Not this week');
    expect(button('Skipping this week…')?.getAttribute('aria-busy')).toBe('true');
    await press('Skipping this week…');
    expect(skipCornerDraft).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
    expect(el.textContent).toContain('No corner this week.');
  });

  it.each(['published', 'skipped', 'missing', 'no_draft', 'not_draft', 'reload_no_draft', 'reload_not_draft'])(
    'round 2 MUST: %s preserves unsaved words read-only with copy and form actions', async terminal => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      clipboard({ writeText });
      await mount();
      type('The corner note', 'My personal note.\nA second line.');
      if (terminal === 'no_draft' || terminal === 'not_draft') {
        vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: terminal } });
      } else {
        vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
        if (terminal.startsWith('reload_')) {
          vi.mocked(getCornerDraft).mockRejectedValue({ data: { code: terminal.slice(7) } });
        } else {
          vi.mocked(getCornerDraft).mockResolvedValue(response(terminal === 'missing' ? null
            : draft({ status: terminal as 'published' | 'skipped', body: 'Remote words' })));
        }
      }
      await press(PUBLISH);
      expect(el.textContent).toContain("This week's draft is already done.");
      const kept = el.querySelector<HTMLElement>('[role="region"]');
      expect(kept?.previousElementSibling?.textContent)
        .toBe('These words are not on the corner. Copy them, then use the form if you still want them up.');
      expect(kept?.textContent).toBe('My personal note.\nA second line.');
      expect(kept?.style.userSelect).toBe('text');
      expect(el.querySelector('textarea, [contenteditable], [disabled]')).toBeNull();
      expect(button(PUBLISH)).toBeUndefined();
      await press('Copy my words');
      expect(writeText).toHaveBeenCalledWith('My personal note.\nA second line.');
      expect(el.textContent).toContain('Your words are copied.');
      await press('Use the form instead');
      expect(onJob).toHaveBeenCalledWith('campus', undefined);
    },
  );

  it('round 2 MUST: a terminal refresh keeps the answer and prayer typed while waiting', async () => {
    const pending = deferred<CornerDraft>();
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ prayerPoint: 'Original prayer' })));
    vi.mocked(refreshCornerDraft).mockReturnValue(pending.promise);
    await mount();
    type('Anything on at Test Campus this week?', 'First answer');
    await press('Add this to the draft');
    type('The corner note', 'Words typed while waiting');
    type('Prayer point (your words)', 'My prayer');
    type('Anything on at Test Campus this week?', 'My pending answer');
    await act(async () => pending.resolve(draft({ status: 'published' })));
    expect(el.querySelector('[role="region"]')?.textContent)
      .toBe('Words typed while waiting\n\nMy prayer\n\nMy pending answer');
  });

  it('round 2 MUST: a finished stale reload keeps words typed while the read was pending', async () => {
    const pending = deferred<Awaited<ReturnType<typeof getCornerDraft>>>();
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
    await mount();
    vi.mocked(getCornerDraft).mockReturnValue(pending.promise);
    await press(PUBLISH);
    type('The corner note', 'My last unsaved words');
    await act(async () => pending.resolve(response(draft({ status: 'skipped' }))));
    expect(el.querySelector('[role="region"]')?.textContent).toBe('My last unsaved words');
  });

  it.each(['no_draft', 'not_draft', 'published', 'skipped'])(
    'round 2 MUST: %s without edits shows only the done line', async terminal => {
      await mount();
      vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: terminal.endsWith('draft') ? terminal : 'stale' } });
      if (terminal === 'published' || terminal === 'skipped') {
        vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ status: terminal })));
      }
      await press(PUBLISH);
      expect(el.textContent).toBe("This week's draft is already done.");
      expect(el.querySelector('button')).toBeNull();
    },
  );

  it.each(['missing', 'denied'])('copy %s leaves selectable words and an error beside Copy', async failure => {
    clipboard(failure === 'missing' ? undefined : { writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'not_draft' } });
    await mount();
    type('The corner note', 'Keep my words');
    await press(PUBLISH);
    await press('Copy my words');
    expect(button('Copy my words')?.parentElement?.querySelector('[role="alert"]')?.textContent)
      .toBe('Your words could not be copied. Select the text above and copy it.');
    expect(el.querySelector('[role="region"]')?.textContent).toBe('Keep my words');
    expect(button('Use the form instead')).toBeTruthy();
  });

  it('copy is guarded against repeated taps while busy', async () => {
    const pending = deferred<void>();
    const writeText = vi.fn().mockReturnValue(pending.promise);
    clipboard({ writeText });
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'not_draft' } });
    await mount();
    type('The corner note', 'Keep my words');
    await press(PUBLISH);
    await press('Copy my words');
    await press('Copy my words');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(button('Copy my words')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('[disabled]')).toBeNull();
    await act(async () => pending.resolve());
  });

  it.each(['add', 'clear', 'skip', 'move'])('clears the pending-answer publish error after %s', async resolution => {
    vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ body: 'Updated note', answered: { extra: true, prayerPoint: false } }));
    await mount();
    type('Anything on at Test Campus this week?', 'My answer');
    await press(PUBLISH);
    expect(button(PUBLISH)?.parentElement?.textContent).toContain('Add your answer to the draft first, or clear it.');
    if (resolution === 'add') await press('Add this to the draft');
    if (resolution === 'clear') type('Anything on at Test Campus this week?', '  ');
    if (resolution === 'skip') await press('Skip this question');
    if (resolution === 'move') {
      vi.mocked(refreshCornerDraft).mockRejectedValue({ data: { code: 'refresh_cap' } });
      await press('Add this to the draft');
      await press('Add my words to the note');
      expect(field('The corner note')?.value).toBe('A note for this week.\n\nMy answer');
      expect(refreshCornerDraft).toHaveBeenCalledTimes(1);
      expect(getCornerDraft).toHaveBeenCalledTimes(1);
      expect(publishCornerDraft).not.toHaveBeenCalled();
      expect(skipCornerDraft).not.toHaveBeenCalled();
      expect(button('Add my words to the note')).toBeUndefined();
      expect(el.querySelector('[role="alert"]')).toBeNull();
    }
    expect(button(PUBLISH)?.parentElement?.querySelector('[role="alert"]')).toBeNull();
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
    if (resolution === 'move') expect(publishCornerDraft)
      .toHaveBeenCalledWith('A note for this week.\n\nMy answer', '', undefined, 'v1');
  });

  it('scrolls to a fresh offer; Keep my edits dismisses it and retains the note', async () => {
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    try {
      vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ body: 'Fresh note', version: 'v2' }));
      await mount();
      type('The corner note', 'My own note');
      type('Anything on at Test Campus this week?', 'My answer');
      await press('Add this to the draft');
      expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
      expect(scroll.mock.instances[0]).toBe(button('Keep my edits')?.parentElement?.parentElement);
      expect(button('Use the fresh draft')).toBeTruthy();
      await press('Keep my edits');
      expect(button('Use the fresh draft')).toBeUndefined();
      expect(field('The corner note')?.value).toBe('My own note');
      await press(PUBLISH);
      expect(publishCornerDraft).toHaveBeenCalledWith('My own note', '', undefined, 'v2');
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });

  it('measures the rendered header again for the heading and fresh draft offer', async () => {
    const header = document.createElement('header');
    document.body.prepend(header);
    const bounds = vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 120 } as DOMRect);
    try {
      vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ body: 'Fresh note', version: 'v2' }));
      await mount();
      expect(el.querySelector('h3')?.style.scrollMarginTop).toBe('136px');
      bounds.mockReturnValue({ height: 144 } as DOMRect);
      type('The corner note', 'My own note');
      type('Anything on at Test Campus this week?', 'My answer');
      await press('Add this to the draft');
      expect(button('Keep my edits')?.parentElement?.parentElement?.style.scrollMarginTop).toBe('160px');
    } finally { header.remove(); }
  });

  it.each([
    ['no draft', null],
    ['published', draft({ status: 'published' })],
    ['skipped', draft({ status: 'skipped' })],
  ])('renders nothing when there is %s', async (_n, d) => {
    vi.mocked(getCornerDraft).mockResolvedValue(response(d));
    await mount();
    expect(el.innerHTML).toBe('');
  });

  it('MUST 4: a failed read offers a quiet retry that loads the draft', async () => {
    vi.mocked(getCornerDraft).mockRejectedValueOnce(new Error('down'));
    await mount();
    expect(el.textContent).toContain('The corner draft did not load.');
    expect(button(PUBLISH)).toBeUndefined();
    await press('Try again');
    expect(button(PUBLISH)).toBeTruthy();
  });

  it('opens on the draft: title, banner, source, the first question only, one main button', async () => {
    await mount();
    expect(el.textContent).toContain('This week’s corner for Test Campus is ready to look at.'.replace('’', "'"));
    expect(el.textContent).toContain('Make this yours: add something only you would say.');
    expect(el.textContent).toContain("From Sunday's message: A message of hope · Guest speaker");
    expect(field('Anything on at Test Campus this week?')).not.toBeNull();
    expect(field('A prayer point for your people?')).toBeNull();
    expect(field('The corner note')?.value).toBe('A note for this week.');
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    expect(button(PUBLISH)).toBeTruthy();
  });

  it('one question at a time: skipping the first shows the second, then none', async () => {
    await mount();
    await press('Skip this question');
    expect(field('Anything on at Test Campus this week?')).toBeNull();
    expect(field('A prayer point for your people?')).not.toBeNull();
    await press('Skip this question');
    expect(button('Skip this question')).toBeUndefined();
    expect(refreshCornerDraft).not.toHaveBeenCalled();
  });

  it('the answer refreshes the draft with that answer only and replaces the note', async () => {
    vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ body: 'A refreshed note.', answered: { extra: true, prayerPoint: false }, refreshesLeft: 4 }));
    await mount();
    type('Anything on at Test Campus this week?', 'A shared meal on Friday');
    await press('Add this to the draft');
    expect(refreshCornerDraft).toHaveBeenCalledWith({ extra: 'A shared meal on Friday' }, undefined, 'v1');
    expect(field('The corner note')?.value).toBe('A refreshed note.');
    expect(field('A prayer point for your people?')).not.toBeNull();
  });

  it('an empty answer is not sent (it would spend one of the five refreshes)', async () => {
    await mount();
    await press('Add this to the draft');
    expect(refreshCornerDraft).not.toHaveBeenCalled();
  });

  it.each(['', '   \n  '])('MUST 3: empty answer %j shows an error beside Add without a write', async value => {
    await mount();
    type('Anything on at Test Campus this week?', value);
    await press('Add this to the draft');
    expect(refreshCornerDraft).not.toHaveBeenCalled();
    expect(button('Add this to the draft')?.parentElement?.querySelector('[role="alert"]')?.textContent)
      .toBe('Write an answer, or skip this question.');
  });

  it('MUST 2: an unadded answer blocks Publish, explains why beside it, and focuses the answer', async () => {
    await mount();
    type('Anything on at Test Campus this week?', 'Please include this');
    await press(PUBLISH);
    expect(publishCornerDraft).not.toHaveBeenCalled();
    expect(button(PUBLISH)?.parentElement?.querySelector('[role="alert"]')?.textContent)
      .toBe('Add your answer to the draft first, or clear it.');
    expect(document.activeElement).toBe(field('Anything on at Test Campus this week?'));
    type('Anything on at Test Campus this week?', '');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
  });

  it.each(['before', 'during'])('MUST 1: keeps edits made %s a refresh and offers the new note explicitly', async when => {
    const pending = deferred<CornerDraft>();
    vi.mocked(refreshCornerDraft).mockReturnValue(pending.promise);
    await mount();
    if (when === 'before') type('The corner note', 'My own words.');
    type('Anything on at Test Campus this week?', 'A shared meal');
    await press('Add this to the draft');
    if (when === 'during') type('The corner note', 'My own words.');
    await act(async () => pending.resolve(draft({ body: 'A fresh note.', version: 'v2', refreshesLeft: 4,
      answered: { extra: true, prayerPoint: false } })));
    expect(field('The corner note')?.value).toBe('My own words.');
    expect(el.textContent).toContain('A fresh draft is ready.');
    expect(el.textContent).toContain('A fresh note.');
    expect(button('Use the fresh draft')!.compareDocumentPosition(field('The corner note')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await press('Use the fresh draft');
    expect(field('The corner note')?.value).toBe('A fresh note.');
    expect(button('Use the fresh draft')).toBeUndefined();
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledWith('A fresh note.', '', undefined, 'v2');
  });

  it('keeps new answer and prayer typing during a refresh', async () => {
    const pending = deferred<CornerDraft>();
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ prayerPoint: 'Original prayer' })));
    vi.mocked(refreshCornerDraft).mockReturnValue(pending.promise);
    await mount();
    type('Anything on at Test Campus this week?', 'First answer');
    await press('Add this to the draft');
    type('Anything on at Test Campus this week?', 'More to add');
    type('Prayer point (your words)', 'My own prayer');
    await act(async () => pending.resolve(draft({ prayerPoint: 'Fresh prayer', answered: { extra: true, prayerPoint: false } })));
    expect(field('Prayer point (your words)')?.value).toBe('My own prayer');
    expect(field('Anything on at Test Campus this week?')?.value).toBe('More to add');
    await press(PUBLISH);
    expect(publishCornerDraft).not.toHaveBeenCalled();
  });

  it('orders the note first, numbers optional questions, and reports remaining drafts', async () => {
    await mount();
    expect(field('The corner note')!.compareDocumentPosition(field('Anything on at Test Campus this week?')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(el.textContent).toContain('Optional question 1 of 2');
    expect(button('Add this to the draft')?.parentElement?.textContent).toContain('5 fresh drafts left this week');
    await press('Skip this question');
    expect(el.textContent).toContain('Optional question 2 of 2');
  });

  it.each(['refresh', 'publish', 'skip'] as const)('stale %s re-reads, keeps edits, shows feedback at the action and uses the newest version', async action => {
    const api = action === 'refresh' ? refreshCornerDraft : action === 'publish' ? publishCornerDraft : skipCornerDraft;
    vi.mocked(api).mockRejectedValueOnce({ data: { code: 'stale' } });
    await mount();
    type('The corner note', 'Keep this personal note');
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ body: 'Changed elsewhere', version: 'v2' })));
    if (action === 'refresh') type('Anything on at Test Campus this week?', 'My answer');
    const label = action === 'refresh' ? 'Add this to the draft' : action === 'publish' ? PUBLISH : 'Not this week';
    await press(label);
    expect(getCornerDraft).toHaveBeenCalledTimes(2);
    expect(getCornerDraft).toHaveBeenLastCalledWith(undefined);
    expect(field('The corner note')?.value).toBe('Keep this personal note');
    expect(el.textContent).toContain('Changed elsewhere');
    expect(button(label)?.parentElement?.querySelector('[role="alert"]')?.textContent)
      .toBe('That did not go through: this draft changed on another device. Check the note, then try again.');
    type('Anything on at Test Campus this week?', '');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenLastCalledWith('Keep this personal note', '', undefined, 'v2');
  });

  it('keeps typing made while the stale re-read is pending', async () => {
    const pending = deferred<Awaited<ReturnType<typeof getCornerDraft>>>();
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
    await mount();
    vi.mocked(getCornerDraft).mockReturnValue(pending.promise);
    await press(PUBLISH);
    type('The corner note', 'Words typed while reading');
    await act(async () => pending.resolve(response(draft({ body: 'New remote note', version: 'v2' }))));
    expect(field('The corner note')?.value).toBe('Words typed while reading');
    expect(el.textContent).toContain('A fresh draft is ready.');
  });

  it('publishes the retained personal note when the fresh offer is not accepted', async () => {
    vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ body: 'Suggested words', version: 'v2',
      answered: { extra: true, prayerPoint: false } }));
    await mount();
    type('The corner note', 'Personal words');
    type('Anything on at Test Campus this week?', 'Answer');
    await press('Add this to the draft');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledWith('Personal words', '', undefined, 'v2');
  });

  it('a stale re-read updates an untouched note', async () => {
    vi.mocked(skipCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
    await mount();
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ body: 'Newest words', version: 'v2' })));
    await press('Not this week');
    expect(field('The corner note')?.value).toBe('Newest words');
    expect(button('Use the fresh draft')).toBeUndefined();
  });

  it('a failed stale re-read can retry without losing typing or repeating the write', async () => {
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
    await mount();
    vi.mocked(getCornerDraft).mockRejectedValueOnce(new Error('offline'));
    await press(PUBLISH);
    expect(button(PUBLISH)?.parentElement?.textContent).toContain('The corner draft did not load.');
    type('The corner note', 'Typed during recovery');
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ body: 'New draft', version: 'v2' })));
    await press('Try again');
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
    expect(field('The corner note')?.value).toBe('Typed during recovery');
    expect(el.textContent).toContain('Check the note, then try again.');
  });

  it.each(['refresh', 'publish', 'skip'] as const)('%s failure stays beside its own button', async action => {
    const api = action === 'refresh' ? refreshCornerDraft : action === 'publish' ? publishCornerDraft : skipCornerDraft;
    vi.mocked(api).mockRejectedValue({ data: { code: 'save_failed' } });
    await mount();
    if (action === 'refresh') type('Anything on at Test Campus this week?', 'Answer');
    const label = action === 'refresh' ? 'Add this to the draft' : action === 'publish' ? PUBLISH : 'Not this week';
    await press(label);
    expect(button(label)?.parentElement?.querySelector('[role="alert"]')?.textContent).toBe('That did not save. Try again.');
  });

  it('busy actions remain enabled and repeated taps cannot write twice', async () => {
    const pending = deferred<Awaited<ReturnType<typeof publishCornerDraft>>>();
    vi.mocked(publishCornerDraft).mockReturnValue(pending.promise);
    await mount();
    await press(PUBLISH);
    expect(el.querySelector('[disabled]')).toBeNull();
    expect(button('Putting it up…')?.getAttribute('aria-busy')).toBe('true');
    await press('Putting it up…');
    await press('Not this week');
    await press('Use the form instead');
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
    expect(skipCornerDraft).not.toHaveBeenCalled();
    expect(onJob).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ campusId: 'us-test', campusName: 'Test Campus', item: { title: '', content: '' } }));
  });

  it('shows only a small loading line while the initial read is pending', async () => {
    const pending = deferred<Awaited<ReturnType<typeof getCornerDraft>>>();
    vi.mocked(getCornerDraft).mockReturnValue(pending.promise);
    await mount();
    expect(el.textContent).toBe("Loading this week's corner…");
    expect(el.querySelector('section')).toBeNull();
    await act(async () => pending.resolve(response(null)));
    expect(el.innerHTML).toBe('');
  });

  it('an empty note is never published; the error sits beside the button', async () => {
    await mount();
    type('The corner note', '   ');
    await press(PUBLISH);
    expect(publishCornerDraft).not.toHaveBeenCalled();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('Write something first, then put it on the corner.');
  });

  it('the tap publishes the edited words, once, then done points at the corner', async () => {
    await mount();
    type('The corner note', 'My own words.');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
    expect(publishCornerDraft).toHaveBeenCalledWith('My own words.', '', undefined, 'v1');
    expect(el.textContent).toContain("It's on the Test Campus corner.");
    expect(el.textContent).toContain('People at Test Campus see it under Campus.');
    expect(el.querySelector('[role="region"]')).toBeNull();
    expect(button('Copy my words')).toBeUndefined();
    expect(el.querySelectorAll('.dw-next')).toHaveLength(0);
  });

  it('Not this week skips; Use the form instead opens the three-field form', async () => {
    await mount();
    await press('Use the form instead');
    expect(onJob).toHaveBeenCalledWith('campus', undefined);
    await press('Not this week');
    expect(skipCornerDraft).toHaveBeenCalledWith(undefined, 'v1');
    expect(publishCornerDraft).not.toHaveBeenCalled();
    expect(el.textContent).toContain('No corner this week.');
    onJob.mockClear();
    await press('Use the form instead');
    expect(onJob).toHaveBeenCalledWith('campus', undefined);
  });

  it('a Futuros draft speaks Spanish, errors included, never the server English', async () => {
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ lang: 'es' })));
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code: 'preview' }, message: 'Server English' });
    await mount();
    expect(el.textContent).toContain('El rincón de esta semana para Test Campus está listo para revisar.');
    expect(el.textContent).toContain('Hazlo tuyo: añade algo que solo tú dirías.');
    expect(button('Esta semana no')).toBeTruthy();
    await press('Ponlo en el rincón del campus');
    expect(el.querySelector('[role="alert"]')?.textContent).toBe('Publica el rincón desde futuresdailyword.com, no desde una vista previa.');
    expect(el.textContent).not.toContain('Server English');
  });

  it('refresh_cap: the line says so and the questions give way to "change the words yourself"', async () => {
    vi.mocked(refreshCornerDraft).mockRejectedValue({ data: { code: 'refresh_cap' } });
    await mount();
    type('Anything on at Test Campus this week?', 'Something');
    await press('Add this to the draft');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('five times this week');
    expect(el.textContent).toContain('Change the words yourself above.');
    expect(button('Add this to the draft')).toBeUndefined();
  });

  it.each([
    ['other_campus', 'This draft is not yours to put up.'],
    ['save_failed', 'That did not save. Try again.'],
    ['', 'That did not save. Try again.'],
  ])('maps %s to its own words', async (code, words) => {
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code } });
    await mount();
    await press(PUBLISH);
    expect(el.querySelector('[role="alert"]')?.textContent).toBe(words);
  });
});

describe('CornerDraftCard, admin', () => {
  beforeEach(() => {
    vi.mocked(listCornerDrafts).mockResolvedValue([
      { campusId: 'us-test', campusName: 'Test Campus', weekOf: '2026-10-05', writtenBy: 'model' },
      { campusId: 'us-two', campusName: 'Second Campus', weekOf: '2026-10-05', writtenBy: 'template' },
    ]);
  });

  it.each(['null', 'published', 'skipped', 'no_draft', 'not_draft'] as const)(
    'round 4 MUST: a %s read keeps the campus reachable and opens recovery for local edits', async result => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      clipboard({ writeText });
      vi.mocked(getCornerDraft).mockImplementation(async campusId => response(draft({
        campusId, campusName: campusId === 'us-two' ? 'Second Campus' : 'Test Campus', prayerPoint: 'Original prayer',
      })));
      await mount(true);
      await press('Corner draft waiting: Test Campus');
      type('The corner note', 'My unpublished note');
      type('Prayer point (your words)', 'My unpublished prayer');
      type('Anything on at Test Campus this week?', 'My unpublished answer');
      await press('Corner draft waiting: Second Campus');
      if (result === 'no_draft' || result === 'not_draft') {
        vi.mocked(getCornerDraft).mockRejectedValueOnce({ data: { code: result } });
      } else {
        vi.mocked(getCornerDraft).mockResolvedValueOnce(response(result === 'null' ? null : draft({ status: result })));
      }
      await press('Corner draft waiting: Test Campus');
      const kept = 'My unpublished note\n\nMy unpublished prayer\n\nMy unpublished answer';
      const recovery = () => [...el.querySelectorAll('[role="region"]')].find(region => !region.closest('[hidden]'));
      expect(button('Test Campus: your unsaved words')).toBeTruthy();
      expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
      expect(recovery()?.textContent).toBe(kept);
      expect(recovery()?.parentElement?.textContent).toContain("This week's draft is already done.");
      expect(button(PUBLISH)).toBeUndefined();
      expect([...el.querySelectorAll('.dw-next.dw-campus-main')].filter(b => !b.closest('[hidden]'))).toHaveLength(1);
      expect(el.querySelector('[disabled]')).toBeNull();
      await press('Corner draft waiting: Second Campus');
      const reads = vi.mocked(getCornerDraft).mock.calls.length;
      await press('Test Campus: your unsaved words');
      expect(getCornerDraft).toHaveBeenCalledTimes(reads);
      expect(recovery()?.textContent).toBe(kept);
      await press('Copy my words');
      expect(writeText).toHaveBeenCalledWith(kept);
      await press('Use the form instead');
      expect(onJob).toHaveBeenCalledWith('campus', 'us-test');
      expect(publishCornerDraft).not.toHaveBeenCalled();
      expect(refreshCornerDraft).not.toHaveBeenCalled();
      expect(skipCornerDraft).not.toHaveBeenCalled();
    },
  );

  it.each(['note', 'prayer', 'answer'] as const)(
    'round 4 MUST: late %s words after publishing stay reachable across campus switches', async changed => {
      const pending = deferred<Awaited<ReturnType<typeof publishCornerDraft>>>();
      const writeText = vi.fn().mockResolvedValue(undefined);
      clipboard({ writeText });
      vi.mocked(getCornerDraft).mockImplementation(async campusId => response(draft({
        campusId, campusName: campusId === 'us-two' ? 'Second Campus' : 'Test Campus', prayerPoint: 'Original prayer',
      })));
      vi.mocked(publishCornerDraft).mockReturnValue(pending.promise);
      await mount(true);
      await press('Corner draft waiting: Test Campus');
      type('The corner note', 'Submitted note');
      await press(PUBLISH);
      type(changed === 'note' ? 'The corner note' : changed === 'prayer' ? 'Prayer point (your words)'
        : 'Anything on at Test Campus this week?', 'Late words');
      await act(async () => pending.resolve({ campusId: 'us-test', campusName: 'Test Campus', item: { title: '', content: '' } }));
      expect(publishCornerDraft).toHaveBeenCalledExactlyOnceWith('Submitted note', 'Original prayer', 'us-test', 'v1');
      expect(button('Test Campus: your unsaved words')).toBeTruthy();
      await press('Corner draft waiting: Second Campus');
      expect(button(PUBLISH)).toBeTruthy();
      const reads = vi.mocked(getCornerDraft).mock.calls.length;
      await press('Test Campus: your unsaved words');
      expect(getCornerDraft).toHaveBeenCalledTimes(reads);
      expect(button(PUBLISH)).toBeUndefined();
      const recovery = [...el.querySelectorAll('[role="region"]')].find(region => !region.closest('[hidden]'));
      expect(recovery?.parentElement?.textContent).toContain('Words you typed after it went up (not on the corner):');
      const kept = [changed === 'note' ? 'Late words' : 'Submitted note',
        changed === 'prayer' ? 'Late words' : 'Original prayer', changed === 'answer' ? 'Late words' : ''].filter(Boolean).join('\n\n');
      expect(recovery?.textContent).toBe(kept);
      expect([...el.querySelectorAll('.dw-next.dw-campus-main')].filter(b => !b.closest('[hidden]'))).toHaveLength(1);
      await press('Copy my words');
      expect(writeText).toHaveBeenCalledWith(kept);
      await press('Use the form instead');
      expect(onJob).toHaveBeenCalledWith('campus', 'us-test');
    },
  );

  it('round 3 MUST: keeps each editor mounted, including recovery state, with only one visible main button', async () => {
    vi.mocked(getCornerDraft).mockImplementation(async campusId => response(draft({
      campusId, campusName: campusId === 'us-two' ? 'Second Campus' : 'Test Campus',
    })));
    vi.mocked(publishCornerDraft).mockRejectedValueOnce({ data: { code: 'stale' } });
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    const firstNote = field('The corner note');
    type('The corner note', 'Keep these unsaved words');
    vi.mocked(getCornerDraft).mockRejectedValueOnce(new Error('offline'));
    await press(PUBLISH);
    await press('Corner draft waiting: Second Campus');
    const secondNote = field('The corner note');
    expect(firstNote?.isConnected).toBe(true);
    expect(firstNote?.closest('[hidden]')).not.toBeNull();
    expect(secondNote?.closest('[hidden]')).toBeNull();
    expect([...el.querySelectorAll('.dw-next')].filter(b => !b.closest('[hidden]'))).toHaveLength(1);
    expect(el.querySelectorAll('.dw-next')).toHaveLength(2);
    await press('Corner draft waiting: Test Campus');
    expect(field('The corner note')).toBe(firstNote);
    expect(firstNote?.value).toBe('Keep these unsaved words');
    expect(firstNote?.closest('[hidden]')).toBeNull();
    expect(secondNote?.isConnected).toBe(true);
    expect(secondNote?.closest('[hidden]')).not.toBeNull();
    expect(button('Try again')?.parentElement?.textContent).toContain('The corner draft did not load.');
    expect([...el.querySelectorAll('.dw-next')].filter(b => !b.closest('[hidden]'))).toHaveLength(1);
    await press('Try again');
    expect(button('Try again')).toBeUndefined();
    expect(button(PUBLISH)?.parentElement?.textContent).not.toContain('The corner draft did not load.');
    expect(publishCornerDraft).toHaveBeenCalledTimes(1);
  });

  it('round 3: remembers each campus note, prayer, question and answer across switches', async () => {
    // Deliberately share an id: the session must be keyed by campus and week.
    vi.mocked(getCornerDraft).mockImplementation(async campusId => response(draft({
      campusId, campusName: campusId === 'us-two' ? 'Second Campus' : 'Test Campus', prayerPoint: 'Original prayer',
    })));
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    type('The corner note', 'First campus note');
    type('Prayer point (your words)', 'First campus prayer');
    await press('Skip this question');
    type('A prayer point for your people?', 'First campus answer');
    await press('Corner draft waiting: Second Campus');
    expect(field('The corner note')?.value).toBe('A note for this week.');
    type('The corner note', 'Second campus note');
    type('Prayer point (your words)', 'Second campus prayer');
    type('Anything on at Second Campus this week?', 'Second campus answer');
    await press('Corner draft waiting: Test Campus');
    expect(field('The corner note')?.value).toBe('First campus note');
    expect(field('Prayer point (your words)')?.value).toBe('First campus prayer');
    expect(field('A prayer point for your people?')?.value).toBe('First campus answer');
    await press('Corner draft waiting: Second Campus');
    expect(field('The corner note')?.value).toBe('Second campus note');
    expect(field('Prayer point (your words)')?.value).toBe('Second campus prayer');
    expect(field('Anything on at Second Campus this week?')?.value).toBe('Second campus answer');
    expect(publishCornerDraft).not.toHaveBeenCalled();
    expect(refreshCornerDraft).not.toHaveBeenCalled();
    vi.mocked(getCornerDraft).mockResolvedValue(response(draft({ weekOf: '2026-10-12', body: 'Next week note' })));
    await press('Corner draft waiting: Test Campus');
    expect(field('The corner note')?.value).toBe('Next week note');
    expect(field('Anything on at Test Campus this week?')?.value).toBe('');
  });

  it('round 3: remembers a pending answer after the refresh limit across campus switches', async () => {
    vi.mocked(getCornerDraft).mockImplementation(async campusId => response(draft({
      campusId, campusName: campusId === 'us-two' ? 'Second Campus' : 'Test Campus',
    })));
    vi.mocked(refreshCornerDraft).mockRejectedValue({ data: { code: 'refresh_cap' } });
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    type('Anything on at Test Campus this week?', 'Keep this pending answer');
    await press('Add this to the draft');
    await press('Corner draft waiting: Second Campus');
    await press('Corner draft waiting: Test Campus');
    expect(field('Anything on at Test Campus this week?')?.value).toBe('Keep this pending answer');
    expect(button('Add this to the draft')).toBeUndefined();
    await press('Add my words to the note');
    expect(field('The corner note')?.value).toBe('A note for this week.\n\nKeep this pending answer');
  });

  it('round 3: focuses loading beside the selected campus while its read is pending', async () => {
    const pending = deferred<Awaited<ReturnType<typeof getCornerDraft>>>();
    vi.mocked(getCornerDraft).mockReturnValue(pending.promise);
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    const feedback = button('Corner draft waiting: Test Campus')?.parentElement?.querySelector('[tabindex="-1"]');
    expect(feedback?.textContent).toBe("Loading this week's corner…");
    expect(document.activeElement).toBe(feedback);
    expect(button('Corner draft waiting: Second Campus')?.parentElement?.querySelector('[role="status"]')).toBeNull();
    await act(async () => pending.resolve(response(draft())));
    expect(document.activeElement).toBe(el.querySelector('h3'));
  });

  it('renders nothing when nothing is waiting', async () => {
    vi.mocked(listCornerDrafts).mockResolvedValue([]);
    await mount(true);
    expect(el.innerHTML).toBe('');
    expect(getCornerDraft).not.toHaveBeenCalled();
  });

  it('MUST 4: admin list failures show the same retry', async () => {
    vi.mocked(listCornerDrafts).mockRejectedValueOnce(new Error('offline'));
    await mount(true);
    expect(el.textContent).toContain('The corner draft did not load.');
    await press('Try again');
    expect(button('Corner draft waiting: Test Campus')).toBeTruthy();
  });

  it('a chosen campus read can retry; the card scrolls into view and focuses its heading', async () => {
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    try {
      vi.mocked(getCornerDraft).mockRejectedValueOnce(new Error('offline'));
      await mount(true);
      await press('Corner draft waiting: Test Campus');
      expect(el.textContent).toContain('The corner draft did not load.');
      const feedback = button('Try again')?.parentElement;
      expect(feedback?.parentElement).toBe(button('Corner draft waiting: Test Campus')?.parentElement);
      expect(document.activeElement).toBe(feedback);
      await press('Try again');
      expect(getCornerDraft).toHaveBeenLastCalledWith('us-test');
      expect(document.activeElement).toBe(el.querySelector('h3'));
      expect(el.querySelector('h3')?.style.scrollMarginTop).toBe('96px');
      expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
      await press('Use the form instead');
      expect(onJob).toHaveBeenCalledWith('campus', 'us-test');
    } finally { HTMLElement.prototype.scrollIntoView = original; }
  });

  it.each(['no_draft', 'not_draft'])('%s removes a finished campus and all publishing controls', async code => {
    vi.mocked(publishCornerDraft).mockRejectedValue({ data: { code } });
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    await press(PUBLISH);
    expect(el.querySelector('[role="status"]')?.textContent).toBe("This week's draft is already done.");
    expect(button(PUBLISH)).toBeUndefined();
    expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
    expect(button('Corner draft waiting: Second Campus')).toBeTruthy();
  });

  it.each(['refresh', 'skip'] as const)('terminal %s errors remove the campus and card', async action => {
    vi.mocked(action === 'refresh' ? refreshCornerDraft : skipCornerDraft).mockRejectedValue({ data: { code: 'no_draft' } });
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    if (action === 'refresh') type('Anything on at Test Campus this week?', 'Answer');
    await press(action === 'refresh' ? 'Add this to the draft' : 'Not this week');
    expect(button(PUBLISH)).toBeUndefined();
    expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
    expect(el.textContent).toContain("This week's draft is already done.");
  });

  it('a stale admin draft that is now gone removes the campus', async () => {
    vi.mocked(skipCornerDraft).mockRejectedValue({ data: { code: 'stale' } });
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    vi.mocked(getCornerDraft).mockResolvedValue(response(null));
    await press('Not this week');
    expect(getCornerDraft).toHaveBeenLastCalledWith('us-test');
    expect(button(PUBLISH)).toBeUndefined();
    expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
    expect(el.textContent).toContain("This week's draft is already done.");
  });

  it('admin refresh and skip carry campus and current version; skipped keeps the form handoff', async () => {
    vi.mocked(refreshCornerDraft).mockResolvedValue(draft({ version: 'v2', answered: { extra: true, prayerPoint: false } }));
    await mount(true);
    await press('Corner draft waiting: Test Campus');
    type('Anything on at Test Campus this week?', 'Answer');
    await press('Add this to the draft');
    expect(refreshCornerDraft).toHaveBeenCalledWith({ extra: 'Answer' }, 'us-test', 'v1');
    await press('Not this week');
    expect(skipCornerDraft).toHaveBeenCalledWith('us-test', 'v2');
    await press('Use the form instead');
    expect(onJob).toHaveBeenCalledWith('campus', 'us-test');
  });

  it('lists waiting campuses quietly; the chosen campus rides on every write', async () => {
    await mount(true);
    expect(el.querySelector('.dw-next')).toBeNull();
    await press('Corner draft waiting: Test Campus');
    expect(getCornerDraft).toHaveBeenCalledWith('us-test');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledWith('A note for this week.', '', 'us-test', 'v1');
    expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
    expect(button('Corner draft waiting: Second Campus')).toBeTruthy();
  });
});
