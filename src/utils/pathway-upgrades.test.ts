import { describe, it, expect, beforeEach } from 'vitest';
import { UPGRADE_CONDITIONS, checkForUpgrade } from './pathway-upgrades';

beforeEach(() => {
  localStorage.clear();
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('UPGRADE_CONDITIONS', () => {
  it('has no new_to_faith / Ready for More entry', () => {
    expect(UPGRADE_CONDITIONS.some(u => u.from === 'new_to_faith')).toBe(false);
    expect(UPGRADE_CONDITIONS.some(u => u.label === 'Ready for More?')).toBe(false);
  });

  it('keeps congregation → deeper_study; comfort has NO graduation prompt', () => {
    const congregation = UPGRADE_CONDITIONS.find(u => u.from === 'congregation');
    expect(congregation?.to).toBe('deeper_study');
    expect(congregation?.label).toBe('Go Deeper?');
    // Persona-flow spec (1 Sep 2026): someone in a hard season is never nudged
    // onward — 'Feeling Stronger?' must not come back.
    expect(UPGRADE_CONDITIONS.some(u => u.from === 'comfort')).toBe(false);
    expect(UPGRADE_CONDITIONS.some(u => u.label === 'Feeling Stronger?')).toBe(false);
  });
});

describe('checkForUpgrade — new_to_faith never upgrades', () => {
  it('returns null even when dw_first_open is 60+ days old', () => {
    localStorage.setItem('dw_first_open', daysAgo(90));
    expect(checkForUpgrade('new_to_faith')).toBeNull();
    expect(checkForUpgrade('new_returning')).toBeNull();
    expect(checkForUpgrade('new_believer')).toBeNull();
  });

  it('returns null even when the 40-day pathway is complete', () => {
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true,
      currentDay: 41,
      completedDays: Array.from({ length: 40 }, (_, i) => i + 1),
    }));
    localStorage.setItem('dw_first_open', daysAgo(90));
    expect(checkForUpgrade('new_to_faith')).toBeNull();
  });
});

describe('checkForUpgrade — other paths unchanged', () => {
  it('offers Go Deeper? when congregation has enough plans', () => {
    localStorage.setItem('dw_activeplans', JSON.stringify({
      a: { completedDays: [1] },
      b: { completedDays: [1] },
      c: { completedDays: [1] },
    }));
    const upgrade = checkForUpgrade('congregation');
    expect(upgrade?.label).toBe('Go Deeper?');
    expect(upgrade?.to).toBe('deeper_study');
  });

  it('never offers comfort an upgrade, however long they have been active', () => {
    localStorage.setItem('dw_first_open', daysAgo(365));
    expect(checkForUpgrade('comfort')).toBeNull();
  });

  it('does not offer comfort an upgrade early either', () => {
    localStorage.setItem('dw_first_open', daysAgo(10));
    expect(checkForUpgrade('comfort')).toBeNull();
  });
});
