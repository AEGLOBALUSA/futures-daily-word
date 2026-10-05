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
  return [...el.querySelectorAll('button')].find(b => (b.textContent || '').trim() === name);
}
async function press(name: string) {
  const b = button(name);
  if (!b) throw new Error(`no button "${name}" in: ${el.textContent}`);
  await act(async () => { b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await flush();
}
function field(label: string): HTMLTextAreaElement | null {
  const l = [...el.querySelectorAll('label')].find(x => (x.textContent || '').trim() === label);
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
afterEach(() => { act(() => root.unmount()); el.remove(); });

describe('CornerDraftCard, campus pastor', () => {
  it.each([
    ['no draft', null],
    ['published', draft({ status: 'published' })],
    ['skipped', draft({ status: 'skipped' })],
  ])('renders nothing when there is %s', async (_n, d) => {
    vi.mocked(getCornerDraft).mockResolvedValue(response(d));
    await mount();
    expect(el.innerHTML).toBe('');
  });

  it('renders nothing when the read fails', async () => {
    vi.mocked(getCornerDraft).mockRejectedValue(new Error('down'));
    await mount();
    expect(el.innerHTML).toBe('');
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
    expect(refreshCornerDraft).toHaveBeenCalledWith({ extra: 'A shared meal on Friday' }, undefined);
    expect(field('The corner note')?.value).toBe('A refreshed note.');
    expect(field('A prayer point for your people?')).not.toBeNull();
  });

  it.skip('an empty answer is not sent (it would spend one of the five refreshes)', async () => {
    await mount();
    await press('Add this to the draft');
    expect(refreshCornerDraft).not.toHaveBeenCalled();
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
    expect(publishCornerDraft).toHaveBeenCalledWith('My own words.', '', undefined);
    expect(el.textContent).toContain("It's on the Test Campus corner.");
    expect(el.textContent).toContain('People at Test Campus see it under Messages.');
    expect(el.querySelectorAll('.dw-next')).toHaveLength(0);
  });

  it('Not this week skips; Use the form instead opens the three-field form', async () => {
    await mount();
    await press('Use the form instead');
    expect(onJob).toHaveBeenCalledWith('campus');
    await press('Not this week');
    expect(skipCornerDraft).toHaveBeenCalledWith(undefined);
    expect(publishCornerDraft).not.toHaveBeenCalled();
    expect(el.textContent).toContain('No corner this week.');
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
    expect(el.textContent).toContain('Change the words yourself below.');
    expect(button('Add this to the draft')).toBeUndefined();
  });

  it.each([
    ['other_campus', 'This draft is not yours to put up.'],
    ['not_draft', "This week's draft is already done."],
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

  it('renders nothing when nothing is waiting', async () => {
    vi.mocked(listCornerDrafts).mockResolvedValue([]);
    await mount(true);
    expect(el.innerHTML).toBe('');
    expect(getCornerDraft).not.toHaveBeenCalled();
  });

  it('lists waiting campuses quietly; the chosen campus rides on every write', async () => {
    await mount(true);
    expect(el.querySelector('.dw-next')).toBeNull();
    await press('Corner draft waiting: Test Campus');
    expect(getCornerDraft).toHaveBeenCalledWith('us-test');
    await press(PUBLISH);
    expect(publishCornerDraft).toHaveBeenCalledWith('A note for this week.', '', 'us-test');
    expect(button('Corner draft waiting: Test Campus')).toBeUndefined();
    expect(button('Corner draft waiting: Second Campus')).toBeTruthy();
  });
});
