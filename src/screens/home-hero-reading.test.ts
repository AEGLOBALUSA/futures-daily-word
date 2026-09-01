/**
 * Invariant: today's scripture starts hidden; Read reveals it.
 * Carried over from the old HomeScreen guard (PR #66/#68) when TodayScreen
 * replaced it (1 Sep 2026): the reading must never auto-open on load.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TODAY = readFileSync(join(__dirname, '../screens/TodayScreen.tsx'), 'utf-8');

describe("Today's scripture starts hidden", () => {
  it('showScripture initialises to false', () => {
    expect(TODAY).toMatch(/const \[showScripture, setShowScripture\] = useState\(false\)/);
  });

  it('a new day resets the panel to hidden', () => {
    expect(TODAY).toMatch(/setShowScripture\(false\); setPassageText\(''\)/);
  });

  it('only the Read toggle opens it (no auto-open effect)', () => {
    const opens = TODAY.match(/setShowScripture\(true\)/g) || [];
    expect(opens.length).toBe(1);
  });
});
