import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { HomeContextChips } from './HomeContextChips';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

function click(el: Element) {
  act(() => { (el as HTMLElement).click(); });
}

describe('HomeContextChips', () => {
  it('opens persona options on the chip and applies the pick there', () => {
    const onPersona = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={onPersona}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /church member/i.test(b.textContent || ''));
    expect(personaChip).toBeTruthy();
    click(personaChip!);
    const option = [...document.querySelectorAll('[role="option"]')].find(b => /i'm new to this/i.test(b.textContent || ''));
    expect(option).toBeTruthy();
    click(option!);
    expect(onPersona).toHaveBeenCalledWith('new_to_faith');
    act(() => root.unmount());
  });

  it('opens campus options on the chip and applies the pick there', () => {
    const onCampus = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="new_to_faith"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={onCampus}
      />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /gwinnett/i.test(b.textContent || ''));
    expect(campusChip).toBeTruthy();
    click(campusChip!);
    const option = [...document.querySelectorAll('[role="option"]')].find(b => (b.textContent || '').includes('Futures Kennesaw'));
    expect(option).toBeTruthy();
    click(option!);
    expect(onCampus).toHaveBeenCalledWith('us-kennesaw');
    act(() => root.unmount());
  });

  it('paints I\'m New to This green in the persona list', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /church member/i.test(b.textContent || ''));
    click(personaChip!);
    const newOption = [...document.querySelectorAll('[role="option"]')].find(b => /i'm new to this/i.test(b.textContent || '')) as HTMLElement;
    const memberOption = [...document.querySelectorAll('[role="option"]')].find(b => /church member/i.test(b.textContent || '')) as HTMLElement;
    expect(newOption).toBeTruthy();
    expect((newOption.querySelector('span') as HTMLElement).style.color).toBe('var(--dw-new)');
    expect(memberOption.style.background).toBe('var(--dw-accent)');
    expect(newOption.style.background).toBe('var(--dw-new-soft)');
    expect(newOption.style.color).toBe('var(--dw-text-primary)');
    act(() => root.unmount());
  });

  it('paints selected I\'m New as a sage object, title and desc on-fill', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="new_to_faith"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /i'm new to this/i.test(b.textContent || ''));
    click(personaChip!);
    const newOption = [...document.querySelectorAll('[role="option"]')].find(b => /i'm new to this/i.test(b.textContent || '')) as HTMLElement;
    const spans = [...newOption.querySelectorAll('span')] as HTMLElement[];
    expect(newOption.style.background).toBe('var(--dw-new)');
    expect(newOption.style.color).toBe('var(--dw-new-on-fill)');
    expect(spans[0].style.color).toBe('var(--dw-new-on-fill)');
    expect(spans[1].style.color).toBe('var(--dw-new-on-fill)');
    act(() => root.unmount());
  });

  it('uses the new-life green token on the I\'m New to This chip', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="new_to_faith"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /i'm new to this/i.test(b.textContent || ''));
    expect(personaChip).toBeTruthy();
    expect((personaChip as HTMLElement).style.color).toBe('var(--dw-new)');
    act(() => root.unmount());
  });

  it('keeps terracotta on other persona chips', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /church member/i.test(b.textContent || ''));
    expect(personaChip).toBeTruthy();
    expect((personaChip as HTMLElement).style.color).toBe('var(--dw-accent)');
    act(() => root.unmount());
  });

  it('still shows a campus chip when none is set', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId=""
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /campus/i.test(b.getAttribute('aria-label') || ''));
    expect(campusChip).toBeTruthy();
    act(() => root.unmount());
  });
  it('locks the persona chip while a pastor is signed in and offers sign-out instead', () => {
    const onPersona = vi.fn();
    const onSignOut = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="pastor_leader"
        campusId="us-gwinnett"
        onPersonaChange={onPersona}
        onCampusChange={vi.fn()}
        pastorLocked
        onPastorSignOut={onSignOut}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /leader \/ pastor/i.test(b.textContent || ''));
    expect(personaChip).toBeTruthy();
    expect(personaChip!.getAttribute('aria-haspopup')).toBe('dialog');
    click(personaChip!);
    expect(document.querySelectorAll('[role="option"]').length).toBe(0);
    const panel = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Signed in as pastor');
    expect(panel.textContent).not.toContain('Back to Leader / Pastor');
    const signOut = [...panel.querySelectorAll('button')].find(b => /sign out of pastor account/i.test(b.textContent || ''));
    expect(signOut).toBeTruthy();
    click(signOut!);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onPersona).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => root.unmount());
  });

  it('a signed-in pastor on another path can only go back to Leader / Pastor or sign out', () => {
    const onPersona = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={onPersona}
        onCampusChange={vi.fn()}
        pastorLocked
        onPastorSignOut={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /church member/i.test(b.textContent || ''));
    click(personaChip!);
    expect(document.querySelectorAll('[role="option"]').length).toBe(0);
    const back = [...document.querySelectorAll('button')].find(b => /back to leader \/ pastor/i.test(b.textContent || ''));
    expect(back).toBeTruthy();
    click(back!);
    expect(onPersona).toHaveBeenCalledWith('pastor_leader');
    act(() => root.unmount());
  });

  it('the campus chip still opens normally while the persona chip is locked', () => {
    const onCampus = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="pastor_leader"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={onCampus}
        pastorLocked
        onPastorSignOut={vi.fn()}
      />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /gwinnett/i.test(b.textContent || ''));
    click(campusChip!);
    const option = [...document.querySelectorAll('[role="option"]')].find(b => (b.textContent || '').includes('Futures Alpharetta'));
    expect(option).toBeTruthy();
    click(option!);
    expect(onCampus).toHaveBeenCalledWith('us-alpharetta');
    act(() => root.unmount());
  });

  it('without the lock the persona list is unchanged (nothing changes for non-pastors)', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="pastor_leader"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /leader \/ pastor/i.test(b.textContent || ''));
    expect(personaChip!.getAttribute('aria-haspopup')).toBe('listbox');
    click(personaChip!);
    expect(document.querySelectorAll('[role="option"]').length).toBe(5);
    expect(document.body.textContent).not.toContain('Sign out of pastor account');
    act(() => root.unmount());
  });
});
