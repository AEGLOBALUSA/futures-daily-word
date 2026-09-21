import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPreachingFocus,
  setPreachingFocus,
  getPrepItems,
  addPrepItem,
  removePrepItem,
  isPastorPersona,
} from './sermonPrep';

// Characterisation tests: assert current behaviour of the sermon-prep store
// (localStorage-backed, misc-synced), added 2026-08-26 per decision 5.
// No fix intended here — see "Observed, not changed" in the PR body.

beforeEach(() => {
  localStorage.clear();
});

describe('getPreachingFocus / setPreachingFocus', () => {
  it('is empty on a fresh device', () => {
    expect(getPreachingFocus()).toBe('');
  });

  it('stores and returns a trimmed value', () => {
    setPreachingFocus('  Romans 8  ');
    expect(getPreachingFocus()).toBe('Romans 8');
    expect(localStorage.getItem('dw_sermon_prep_focus')).toBe('Romans 8');
  });

  it('silently truncates to 200 characters', () => {
    const long = 'x'.repeat(250);
    setPreachingFocus(long);
    expect(getPreachingFocus()).toBe('x'.repeat(200));
  });

  it('dispatches dw-sermon-prep-updated on set', () => {
    let fired = false;
    window.addEventListener('dw-sermon-prep-updated', () => { fired = true; }, { once: true });
    setPreachingFocus('Hebrews 11');
    expect(fired).toBe(true);
  });
});

describe('getPrepItems / addPrepItem / removePrepItem', () => {
  it('is an empty array on a fresh device', () => {
    expect(getPrepItems()).toEqual([]);
  });

  it('returns [] if the stored value is not valid JSON', () => {
    localStorage.setItem('dw_sermon_prep', '{not json');
    expect(getPrepItems()).toEqual([]);
  });

  it('returns [] if the stored value is valid JSON but not an array', () => {
    localStorage.setItem('dw_sermon_prep', JSON.stringify({ not: 'an array' }));
    expect(getPrepItems()).toEqual([]);
  });

  it('adds an item, newest first, with ref/text truncated', () => {
    const longRef = 'r'.repeat(100);
    const longText = 't'.repeat(500);
    const item = addPrepItem(longRef, `  ${longText}  `);

    expect(item.ref).toBe(longRef.slice(0, 80));
    expect(item.text).toBe(longText.slice(0, 400));
    expect(item.id).toMatch(/^prep_/);

    addPrepItem('John 3:16', 'For God so loved the world');
    const items = getPrepItems();
    expect(items).toHaveLength(2);
    // newest first
    expect(items[0].ref).toBe('John 3:16');
    expect(items[1].id).toBe(item.id);
  });

  it('caps stored items at 40, dropping the oldest', () => {
    for (let i = 0; i < 45; i++) {
      addPrepItem(`ref-${i}`, `text-${i}`);
    }
    const items = getPrepItems();
    expect(items).toHaveLength(40);
    // newest (ref-44) survives, earliest adds (ref-0..ref-4) are dropped
    expect(items[0].ref).toBe('ref-44');
    expect(items.some(i => i.ref === 'ref-0')).toBe(false);
  });

  it('removes an item by id and leaves the rest untouched', () => {
    const a = addPrepItem('A', 'first');
    const b = addPrepItem('B', 'second');
    removePrepItem(a.id);
    const items = getPrepItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(b.id);
  });

  it('removing a non-existent id is a no-op', () => {
    addPrepItem('A', 'first');
    removePrepItem('does-not-exist');
    expect(getPrepItems()).toHaveLength(1);
  });
});

describe('isPastorPersona', () => {
  it('is false on a fresh device', () => {
    expect(isPastorPersona()).toBe(false);
  });

  it('is false if dw_setup is not valid JSON', () => {
    localStorage.setItem('dw_setup', 'not json');
    expect(isPastorPersona()).toBe(false);
  });

  it('is true only when persona is exactly pastor_leader', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation' }));
    expect(isPastorPersona()).toBe(false);
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'pastor_leader' }));
    expect(isPastorPersona()).toBe(true);
  });
});
