/**
 * Invariant (rewritten for the persona-flow spec, 1 Sep 2026): arrival IS the
 * reading. The four returning personas land with today's chapter already open
 * — seeded WITHOUT crediting the plan day — while I'm New is exempt (its
 * journey opens full-screen from the journey hero) and completion everywhere
 * stays a deliberate act (Mark as read / Mark Complete).
 *
 * History: PR 66/68 made readings hidden-until-Read because the old Read-first
 * effect also existed for I'm New and the control arrived as Hide. The owner's
 * 1 Sep spec reverses the default for the returning personas only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME = readFileSync(join(__dirname, '../screens/HomeScreen.tsx'), 'utf-8');

describe('Home arrival-open contract', () => {
  it('seeds today\'s chapter open for the returning personas, exempting I\'m New', () => {
    // The seed effect exists…
    expect(HOME).toMatch(/Arrival IS the reading, already open/);
    // …and bails for new-Christian personas before seeding.
    const seed = HOME.slice(HOME.indexOf('Arrival IS the reading'), HOME.indexOf('Arrival IS the reading') + 1400);
    expect(seed).toMatch(/isNewChristianPersona\(personaConfig\.persona\)\) return/);
    expect(seed).toMatch(/setExpandedPassages\(new Set\(\[/);
  });

  it('the seed never credits a plan day or fires analytics', () => {
    const seed = HOME.slice(HOME.indexOf('Arrival IS the reading'), HOME.indexOf('Arrival IS the reading') + 1400);
    expect(seed).not.toMatch(/handleRead\(/);
    expect(seed).not.toMatch(/markPlanDayComplete/);
    expect(seed).not.toMatch(/trackBehavior|track\(/);
  });

  it('expandedPassages still starts empty (the seed is an effect, not state)', () => {
    expect(HOME).toMatch(/useState<Set<string>>\(new Set\(\)\)/);
  });

  it('slot chapters beyond the seeded hero chapter stay hidden until Read', () => {
    expect(HOME).toMatch(/Scripture content — hidden until Read \(same as hero\)/);
  });
});
