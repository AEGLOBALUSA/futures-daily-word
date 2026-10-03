/**
 * B09-08 step 4: the card has exactly one pulsing main button (.dw-next) and
 * none when the day is done or still loading. A set-up ask draws its own
 * component, and a tap on it counts as taking the step.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { NextStepCard } from './NextStepCard';
import type { HomeNextStep } from '../utils/useHomeNextStep';
import type { NextStep } from '../utils/nextStep';

beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

let mounted: Array<{ root: Root; el: HTMLElement }> = [];
afterEach(() => {
  for (const m of mounted) { act(() => m.root.unmount()); m.el.remove(); }
  mounted = [];
});

function render(ui: ReactElement) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  mounted.push({ root, el });
  const byTestId = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return {
    container: el,
    getByTestId: (id: string) => { const n = byTestId(id); if (!n) throw new Error(`no ${id}`); return n; },
    queryByTestId: byTestId,
    getByText: (text: string) => {
      const n = [...el.querySelectorAll<HTMLElement>('*')].reverse().find((x) => x.textContent === text);
      if (!n) throw new Error(`no ${text}`);
      return n;
    },
  };
}
const click = (n: HTMLElement) => act(() => { n.click(); });

function make(step: Partial<NextStep>, over: Partial<HomeNextStep> = {}): HomeNextStep {
  return {
    step: { kind: 'read', step: 5, labelKey: 'next_read_passage', params: { passage: 'Luke 5' }, action: 'open_passage', ...step },
    loading: false,
    label: 'Read Luke 5',
    why: null,
    onTapped: vi.fn(),
    ...over,
  };
}

describe('NextStepCard', () => {
  it('renders exactly one .dw-next, the button, with the verb and the object', () => {
    const { container, getByTestId } = render(<NextStepCard next={make({})} onAction={() => {}} />);
    expect(container.querySelectorAll('.dw-next')).toHaveLength(1);
    const btn = getByTestId('next-step-button');
    expect(btn.classList.contains('dw-next')).toBe(true);
    expect(btn.textContent).toContain('Read Luke 5');
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('a tap counts the step as taken and runs its action', () => {
    const next = make({ kind: 'write', step: 7, action: 'write' }, { label: 'Write it down', why: 'What is God saying to you in Luke 5?' });
    const onAction = vi.fn();
    const { getByTestId } = render(<NextStepCard next={next} onAction={onAction} />);
    click(getByTestId('next-step-button'));
    expect(next.onTapped).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('write');
  });

  it('the why-line is read with the button', () => {
    const next = make({ kind: 'sunday_new', step: 2, action: 'open_notes' }, { label: "Open today's sermon notes", why: "It's Sunday morning at Futures Paradise" });
    const { getByTestId, container } = render(<NextStepCard next={next} onAction={() => {}} />);
    const btn = getByTestId('next-step-button');
    const id = btn.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(container.querySelector(`#${CSS.escape(id!)}`)?.textContent).toContain('Sunday morning at Futures Paradise');
  });

  it('done: the quiet line, no button, no pulse', () => {
    const next = make({ kind: 'done', step: 9, labelKey: 'next_tomorrow', params: { passage: 'Luke 6' }, action: 'none' }, { label: 'Tomorrow: Luke 6' });
    const { container, queryByTestId, getByTestId } = render(<NextStepCard next={next} onAction={() => {}} />);
    expect(container.querySelectorAll('.dw-next')).toHaveLength(0);
    expect(queryByTestId('next-step-button')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
    expect(getByTestId('next-step-done').textContent).toContain('Tomorrow: Luke 6');
  });

  it('loading: no button and no pulse', () => {
    const { container } = render(<NextStepCard next={make({}, { loading: true })} onAction={() => {}} />);
    expect(container.querySelectorAll('.dw-next')).toHaveLength(0);
    expect(container.querySelector('[data-testid="next-step-button"]')).toBeNull();
  });

  it("a set-up ask draws the ask's own component, and a tap inside it counts as taken", () => {
    const next = make({ kind: 'setup_ask', step: 8, labelKey: 'next_setup_email', action: 'email' });
    const renderAsk = vi.fn(() => <button type="button" className="dw-next">Back up</button>);
    const { container, getByText } = render(<NextStepCard next={next} onAction={() => {}} renderAsk={renderAsk} />);
    expect(renderAsk).toHaveBeenCalledWith('email');
    expect(container.querySelectorAll('.dw-next')).toHaveLength(1);
    click(getByText('Back up'));
    expect(next.onTapped).toHaveBeenCalled();
  });
});
