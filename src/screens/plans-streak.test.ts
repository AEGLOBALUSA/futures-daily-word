import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source contract: the Plans tab shows the same streak number Home shows.
// A freeze-covered two-day gap once read as alive on Home (resolveStreak) and
// as broken on Plans (its own today/yesterday check). One reader, one number.
const PLANS = readFileSync(resolve(__dirname, 'PlansScreen.tsx'), 'utf8');

describe('Plans tab streak', () => {
  it('reads the streak through resolveStreak, never its own break rule', () => {
    expect(PLANS).toMatch(/import \{ resolveStreak \} from '\.\.\/utils\/streak'/);
    expect(PLANS).toMatch(/function streakDisplay\(\): number \{\s*return resolveStreak\(\)\.count \|\| 0;/);
    expect(PLANS).not.toMatch(/lastDate === yesterday/);
    expect(PLANS).not.toContain('getStreakState');
  });
});
