import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const home = readFileSync(resolve(__dirname, '../screens/HomeScreen.tsx'), 'utf8');
const landing = readFileSync(resolve(__dirname, 'Day1Landing.tsx'), 'utf8');
const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const more = readFileSync(resolve(__dirname, '../screens/MoreScreen.tsx'), 'utf8');

describe('front-page language switch (Ashley, 2 Sep 2026)', () => {
  it('sits in the Home header next to the theme toggle', () => {
    const sw = home.indexOf('<LanguageSwitch');
    const theme = home.indexOf('<ThemeToggle />');
    expect(sw).toBeGreaterThan(-1);
    expect(theme).toBeGreaterThan(sw);
    expect(theme - sw).toBeLessThan(200);
  });

  it('sits in the Day 1 landing header, and the landing follows the language live', () => {
    expect(landing).toMatch(/<LanguageSwitch className="dw-day1-lang" \/>/);
    expect(landing).toMatch(/addEventListener\('dw-lang-changed'/);
  });

  it('App remounts HomeScreen on a language change (mount-time copy follows)', () => {
    expect(app).toMatch(/<HomeScreen key=\{langKey\}/);
    expect(app).toMatch(/addEventListener\('dw-lang-changed'/);
  });

  it('Settings and the switch share one applyLanguage', () => {
    expect(more).toMatch(/applyLanguage\(val\)/);
    expect(more).not.toMatch(/LANG_DEFAULT_TRANSLATION/);
  });
});
