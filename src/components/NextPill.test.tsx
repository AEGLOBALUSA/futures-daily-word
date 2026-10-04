/**
 * B09-08 (rule 3): the Next pill appears only when the one .dw-next is off
 * screen, and never when there is none or it is in view.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { NextPill } from './NextPill';

beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  document.body.innerHTML = '';
  root = null; host = null;
});

function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => { root!.render(<NextPill />); });
}

function placeNext(top: number) {
  const b = document.createElement('button');
  b.className = 'dw-next';
  b.textContent = 'Mark as read';
  b.getBoundingClientRect = () => ({ top, bottom: top + 56, left: 0, right: 300, width: 300, height: 56, x: 0, y: top, toJSON: () => ({}) });
  document.body.appendChild(b);
  return b;
}

describe('NextPill', () => {
  it('nothing to point at: no pill', () => {
    mount();
    act(() => { document.dispatchEvent(new Event('scroll')); });
    expect(document.querySelector('.dw-next-pill')).toBeNull();
  });

  it('the next step in view: no pill', async () => {
    placeNext(100);
    mount();
    await act(async () => { document.dispatchEvent(new Event('scroll')); });
    expect(document.querySelector('.dw-next-pill')).toBeNull();
  });

  it('the next step below the screen: the pill names it', async () => {
    placeNext(window.innerHeight + 400);
    mount();
    await act(async () => { document.dispatchEvent(new Event('scroll')); });
    const pill = document.querySelector('.dw-next-pill');
    expect(pill?.textContent).toContain('Mark as read');
  });
});
