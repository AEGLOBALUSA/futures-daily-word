import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { MoreScreen } from './MoreScreen';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const setup = { persona: 'new_to_faith', source: 'settings' };

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    userProfile: {
      firstName: 'Ashley', lastName: '', email: 'a@example.com',
      phone: '', church: '', city: '', campus: '',
    },
    profilePic: '',
    requireEmail: () => {},
    setup,
    saveProfile: () => {},
    saveSetup: () => {},
    isAuthenticated: true,
    showEmailGate: false,
    setShowEmailGate: () => {},
    setProfilePic: () => {},
    emailGateCallback: { current: null },
  }),
}));

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

describe('MoreScreen Settings avatar', () => {
  it('locks I\'m New ring and glyph to --dw-new', () => {
    setup.persona = 'new_to_faith';
    const { el, root } = mount(<MoreScreen />);
    const ring = el.querySelector('.dw-settings-avatar-new') as HTMLElement | null;
    expect(ring).toBeTruthy();
    const ringCss = ring!.getAttribute('style') || '';
    expect(ringCss).toContain('var(--dw-new)');
    expect(ringCss).not.toContain('var(--dw-accent)');
    const glyph = ring!.querySelector('svg') as SVGElement | null;
    expect(glyph).toBeTruthy();
    expect(glyph!.getAttribute('style') || '').toContain('var(--dw-new)');
    act(() => root.unmount());
  });

  it('keeps other personas on --dw-accent', () => {
    setup.persona = 'congregation';
    const { el, root } = mount(<MoreScreen />);
    expect(el.querySelector('.dw-settings-avatar-new')).toBeNull();
    const circles = [...el.querySelectorAll('div')].filter(d => d.style.borderRadius === '50%');
    expect(circles.length).toBeGreaterThan(0);
    const circleCss = circles[0].getAttribute('style') || '';
    expect(circleCss).toContain('var(--dw-accent)');
    expect(circleCss).not.toContain('var(--dw-new)');
    act(() => root.unmount());
  });
});
