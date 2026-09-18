import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

const track = vi.fn();
vi.mock('../utils/analytics', () => ({ track: (...args: unknown[]) => track(...args) }));
const syncMisc = vi.fn();
vi.mock('../utils/cloudSync', () => ({ syncMisc: (...args: unknown[]) => syncMisc(...args) }));

import { CloseTheDay } from './CloseTheDay';
import { JourneyHandoffCard } from './JourneyHandoffCard';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  localStorage.clear();
  track.mockClear();
  syncMisc.mockClear();
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

describe('CloseTheDay', () => {
  it('renders exactly 3 textareas', () => {
    const { root } = mount(<CloseTheDay day={3} lang="en" />);
    expect(document.querySelectorAll('textarea').length).toBe(3);
    act(() => root.unmount());
  });

  it('typing into the second writes slot c1 and leaves a pre-seeded slot 0 untouched', () => {
    localStorage.setItem('dw_pathway_qa_3', JSON.stringify({ 0: 'lesson answer' }));
    const { root } = mount(<CloseTheDay day={3} lang="en" />);
    const textareas = document.querySelectorAll('textarea');
    act(() => {
      const el = textareas[1] as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(el, 'my second answer');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const rec = JSON.parse(localStorage.getItem('dw_pathway_qa_3') || '{}');
    expect(rec.c1).toBe('my second answer');
    expect(rec[0]).toBe('lesson answer');
    act(() => root.unmount());
  });

  it('the reread button is absent without onReread', () => {
    const { root } = mount(<CloseTheDay day={3} lang="en" />);
    expect(document.querySelectorAll('button').length).toBe(0);
    act(() => root.unmount());
  });

  it('shows the reread button when onReread is given', () => {
    const { root } = mount(<CloseTheDay day={3} lang="en" onReread={() => {}} />);
    expect(document.querySelectorAll('button').length).toBe(1);
    act(() => root.unmount());
  });
});

describe('JourneyHandoffCard', () => {
  it('renders nothing at 13 completed', () => {
    const { root } = mount(
      <JourneyHandoffCard completedCount={13} totalDays={40} lang="en" onOpenCampus={() => {}} />
    );
    expect(document.querySelector('[role="group"]')).toBeNull();
    act(() => root.unmount());
  });

  it('renders at 14 completed', () => {
    const { root } = mount(
      <JourneyHandoffCard completedCount={14} totalDays={40} lang="en" onOpenCampus={() => {}} />
    );
    expect(document.querySelector('[role="group"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('renders nothing after Not now is clicked, and stays hidden on a fresh mount', () => {
    const { root, el } = mount(
      <JourneyHandoffCard completedCount={14} totalDays={40} lang="en" onOpenCampus={() => {}} />
    );
    const buttons = [...document.querySelectorAll('button')];
    const notNow = buttons[buttons.length - 1];
    expect(notNow).toBeTruthy();
    act(() => { (notNow as HTMLButtonElement).click(); });
    expect(document.querySelector('[role="group"]')).toBeNull();
    act(() => root.unmount());
    document.body.removeChild(el);

    // Fresh mount, same localStorage state.
    const remount = mount(
      <JourneyHandoffCard completedCount={14} totalDays={40} lang="en" onOpenCampus={() => {}} />
    );
    expect(document.querySelector('[role="group"]')).toBeNull();
    act(() => remount.root.unmount());
  });
});
