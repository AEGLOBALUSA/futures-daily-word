import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { expect, it, vi } from 'vitest';
import { useKeyboardInset } from './useKeyboardInset';

it('keeps the bar above the visual viewport keyboard and follows viewport scrolling', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const viewport = Object.assign(new EventTarget(), { height: 480, offsetTop: 0, scale: 1 });
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('visualViewport', viewport);
  let inset = 0;
  function Probe() { inset = useKeyboardInset(); return null; }
  const root = createRoot(document.createElement('div'));
  try {
    act(() => root.render(<Probe />));
    expect(inset).toBe(320);
    act(() => { viewport.offsetTop = 80; viewport.dispatchEvent(new Event('scroll')); });
    expect(inset).toBe(240);
    act(() => { viewport.height = 800; viewport.offsetTop = 0; viewport.dispatchEvent(new Event('resize')); });
    expect(inset).toBe(0);
    act(() => { viewport.scale = 2; viewport.height = 400; viewport.dispatchEvent(new Event('resize')); });
    expect(inset).toBe(0);
  } finally { act(() => root.unmount()); vi.unstubAllGlobals(); }
});
