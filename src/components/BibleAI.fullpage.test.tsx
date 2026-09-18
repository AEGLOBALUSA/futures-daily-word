/**
 * The AI writes on the full page (Ashley, 18 Sep 2026): the surface is the
 * whole screen, not an 82vh sheet behind a backdrop, and an answer is prose
 * across the page, not a chat bubble hemmed to 82%.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ScriptureSelectionProvider } from '../contexts/ScriptureSelectionContext';
import { BibleAI } from './BibleAI';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;

function mount(persona: string) {
  localStorage.setItem('dw_setup', JSON.stringify({ persona, source: 'settings' }));
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <ScriptureSelectionProvider>
        <BibleAI isOpen onClose={() => {}} currentPassage="Psalm 139" />
      </ScriptureSelectionProvider>,
    );
  });
  mounted = { el, root };
  return el;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ content: [{ text: 'My frame was not hidden from you.' }] }) })));
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('BibleAI full page', () => {
  it('is the whole screen: no sheet height, no rounded lid, no backdrop', () => {
    const el = mount('deeper_study');
    const fixed = [...el.querySelectorAll('div')].filter(d => d.style.position === 'fixed');
    const surface = fixed.find(d => d.style.zIndex === '93') as HTMLDivElement;
    expect(surface).toBeTruthy();
    expect(['0', '0px']).toContain(surface.style.inset); // happy-dom drops the unit
    expect(surface.style.height).toBe('');
    expect(surface.style.borderRadius).toBe('');
    // Nothing sits behind it any more.
    expect(fixed.find(d => d.style.zIndex === '92')).toBeUndefined();
    const src = readFileSync(join(__dirname, 'BibleAI.tsx'), 'utf-8');
    expect(src).not.toMatch('82vh');
    expect(src).not.toMatch("'20px 20px 0 0'");
  });

  it('writes the answer on the page, not in a bubble', async () => {
    const el = mount('deeper_study');
    const prompt = [...el.querySelectorAll('button')].find(b => /What does this passage mean/.test(b.textContent || ''));
    expect(prompt).toBeTruthy();
    await act(async () => { prompt!.click(); });
    await flush();
    const answer = el.querySelector('[role="assistant"]') as HTMLElement;
    expect(answer).toBeTruthy();
    expect(answer.textContent).toContain('My frame was not hidden from you.');
    expect(answer.style.width).toBe('100%');
    expect(answer.style.maxWidth).toBe('');
    expect(answer.style.background).toBe('');
    expect(answer.style.borderRadius).toBe('');
    expect(answer.style.fontFamily).toBe('var(--font-serif-text)');
    expect(answer.style.fontStyle).not.toBe('italic');
  });

  it('keeps the reader\'s own question as a small bubble on the right', async () => {
    const el = mount('deeper_study');
    const prompt = [...el.querySelectorAll('button')].find(b => /What does this passage mean/.test(b.textContent || ''));
    await act(async () => { prompt!.click(); });
    await flush();
    const rows = [...el.querySelectorAll('div')].filter(d => d.style.justifyContent === 'flex-end');
    expect(rows.length).toBeGreaterThan(0);
    const bubble = rows[0].firstElementChild as HTMLElement;
    expect(bubble.style.maxWidth).toBe('82%');
  });
});
