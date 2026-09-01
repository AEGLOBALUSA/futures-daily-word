/**
 * Invariant: Home plan readings start hidden. Read reveals them.
 * PR 66 only closed the new-Christian Day 1 landing; Home still auto-opened
 * today's chapter for every persona (control arrived as Hide). This guard
 * fails if that Read-first auto-open effect comes back.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME = readFileSync(join(__dirname, '../screens/HomeScreen.tsx'), 'utf-8');

describe('Home hero reading starts hidden', () => {
  it('does not auto-open today\'s scripture on load', () => {
    expect(HOME).toMatch(/Hero scripture stays collapsed until Read/);
    expect(HOME).not.toMatch(/Read-first: open today's current scripture/);
  });

  it('expandedPassages still starts empty', () => {
    expect(HOME).toMatch(/useState<Set<string>>\(new Set\(\)\)/);
  });

  it('Today\'s Chapters plan passages stay hidden until Read', () => {
    expect(HOME).toMatch(/Scripture content — hidden until Read \(same as hero\)/);
  });
});
