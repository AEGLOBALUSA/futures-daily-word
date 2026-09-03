/**
 * "Email these notes to me" on the Sermon Notes page (Ashley, 2 Sep 2026 night).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { SermonNotesSurface, type SermonNotesData } from './SermonNotesSurface';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock('../utils/cloudSync', () => ({ syncMisc: vi.fn() }));

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

const SERMON: SermonNotesData = {
  id: 'grace-2026-09-06',
  title: 'Grace that Holds',
  sections: [{ num: '1', title: 'Nothing left to prove', content: [
    { type: 'text', value: 'Paul writes to a church under pressure.' },
    { type: 'blank', before: 'Grace is' },
  ] }],
  responsePrompts: ['Where do you need grace this week?'],
};

function setValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('SermonNotesSurface — Email these notes to me', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('sends this sermon’s answers to the address typed, and says so', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const { el, root } = mount(<SermonNotesSurface sermon={SERMON} />);
    expect(el.querySelector('[data-testid="sermon-notes-email"]')).toBeTruthy();

    const blank = el.querySelector('textarea.dw-sermon-notes-blank') as HTMLTextAreaElement;
    await act(async () => { setValue(blank, 'a gift'); });

    const input = el.querySelector('[data-testid="sermon-notes-email-input"]') as HTMLInputElement;
    await act(async () => { setValue(input, 'Someone@Example.com'); });
    await act(async () => { (el.querySelector('[data-testid="sermon-notes-email-send"]') as HTMLButtonElement).click(); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/sermon-notes-email');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.sermonId).toBe('grace-2026-09-06');
    expect(body.email).toBe('Someone@Example.com');
    expect(body.responses['blank-grace-2026-09-06-1-1']).toBe('a gift');
    expect(body.lang).toBe('en');
    expect(el.querySelector('[data-testid="sermon-notes-email-msg"]')?.textContent).toBe('Sent. Check your inbox.');
    act(() => root.unmount());
  });

  it('prefills the signed-in address, and refuses a bad one without a request', async () => {
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'me@futures.church', firstName: 'Me' }));
    const { el, root } = mount(<SermonNotesSurface sermon={SERMON} />);
    const input = el.querySelector('[data-testid="sermon-notes-email-input"]') as HTMLInputElement;
    expect(input.value).toBe('me@futures.church');
    await act(async () => { setValue(input, 'not an address'); });
    await act(async () => { (el.querySelector('[data-testid="sermon-notes-email-send"]') as HTMLButtonElement).click(); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="sermon-notes-email-msg"]')?.textContent).toBe('Enter your email address.');
    act(() => root.unmount());
  });

  it('reports a refused send and a rate limit in the person’s words', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'x' }) });
    const { el, root } = mount(<SermonNotesSurface sermon={SERMON} />);
    const input = el.querySelector('[data-testid="sermon-notes-email-input"]') as HTMLInputElement;
    await act(async () => { setValue(input, 'a@b.co'); });
    await act(async () => { (el.querySelector('[data-testid="sermon-notes-email-send"]') as HTMLButtonElement).click(); });
    expect(el.querySelector('[data-testid="sermon-notes-email-msg"]')?.textContent).toBe('Too many sends for now. Try again later.');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { (el.querySelector('[data-testid="sermon-notes-email-send"]') as HTMLButtonElement).click(); });
    expect(el.querySelector('[data-testid="sermon-notes-email-msg"]')?.textContent).toBe("That didn't send. Try again.");
    act(() => root.unmount());
  });

  it('is absent on the read-only outline, the staff preview and a sermon with no id', () => {
    const a = mount(<SermonNotesSurface sermon={SERMON} readOnly />);
    expect(a.el.querySelector('[data-testid="sermon-notes-email"]')).toBeNull();
    const b = mount(<SermonNotesSurface sermon={SERMON} persist={false} />);
    expect(b.el.querySelector('[data-testid="sermon-notes-email"]')).toBeNull();
    const c = mount(<SermonNotesSurface sermon={{ ...SERMON, id: '' }} />);
    expect(c.el.querySelector('[data-testid="sermon-notes-email"]')).toBeNull();
    act(() => { a.root.unmount(); b.root.unmount(); c.root.unmount(); });
  });
});
