import { describe, it, expect } from 'vitest';
import { staffTabFromRaw, staffViewFor } from './StaffApp';

describe('staffTabFromRaw', () => {
  it('opens on Staff home when the address names no screen (launcher tile, fresh sign-in)', () => {
    expect(staffTabFromRaw('')).toBe('home');
    expect(staffTabFromRaw(null)).toBe('home');
    expect(staffTabFromRaw(undefined)).toBe('home');
  });

  it('sends the retired questions tab home', () => {
    expect(staffTabFromRaw('questions')).toBe('home');
    expect(staffTabFromRaw('Questions')).toBe('home');
    expect(staffTabFromRaw(' questions ')).toBe('home');
  });

  it('keeps the remaining staff screens, Sunday’s notes included', () => {
    expect(staffTabFromRaw('home')).toBe('home');
    expect(staffTabFromRaw('notes')).toBe('notes');
    expect(staffTabFromRaw('form')).toBe('form');
    expect(staffTabFromRaw('review')).toBe('review');
    expect(staffTabFromRaw('people')).toBe('people');
    expect(staffTabFromRaw('campuses')).toBe('campuses');
  });
});

describe('staffViewFor', () => {
  const admin = { isAdmin: true, role: 'admin' as const };
  const hub = { isAdmin: false, role: 'hub' as const };
  const media = { isAdmin: false, role: 'media' as const };
  const campus = { isAdmin: false, role: 'campus' as const };

  it('home is home for everyone', () => {
    for (const s of [admin, hub, media, campus]) expect(staffViewFor('home', s)).toBe('home');
  });

  it('a notes link opens Sunday’s notes for admin, hub and media; a campus pastor lands on home', () => {
    expect(staffViewFor('notes', admin)).toBe('notes');
    expect(staffViewFor('notes', hub)).toBe('notes');
    expect(staffViewFor('notes', media)).toBe('notes');
    expect(staffViewFor('notes', campus)).toBe('home');
  });

  it('owner screens open for the owner only; anyone else lands on home, never a blank page', () => {
    for (const t of ['people', 'review', 'campuses'] as const) {
      expect(staffViewFor(t, admin)).toBe(t);
      expect(staffViewFor(t, hub)).toBe('home');
      expect(staffViewFor(t, campus)).toBe('home');
    }
  });
});
