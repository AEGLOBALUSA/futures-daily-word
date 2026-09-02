/**
 * Source-text guards for "Choose your path" (Ashley, 2 Sep 2026): one chooser
 * sheet, three doors, never a gate. Locks the contract the way home-journey /
 * language-switch lock theirs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sheet = readFileSync(resolve(__dirname, 'ChoosePathSheet.tsx'), 'utf8');
const asked = readFileSync(resolve(__dirname, 'PathAskedOnce.tsx'), 'utf8');
const landing = readFileSync(resolve(__dirname, 'Day1Landing.tsx'), 'utf8');
const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const home = readFileSync(resolve(__dirname, '../screens/HomeScreen.tsx'), 'utf8');
const more = readFileSync(resolve(__dirname, '../screens/MoreScreen.tsx'), 'utf8');
const sync = readFileSync(resolve(__dirname, '../utils/cloudSync.ts'), 'utf8');
const helper = readFileSync(resolve(__dirname, '../utils/choosePath.ts'), 'utf8');

describe('the sheet', () => {
  it('is a sub-view with one live history entry, never a focus-trapped gate', () => {
    expect(sheet).toMatch(/useSubView\(open, onClose\)/);
    expect(sheet).not.toMatch(/import .*useModalA11y/);
    expect(sheet).not.toContain('aria-modal');
  });
  it('writes only real-choice sources — never default', () => {
    expect(sheet).toMatch(/choiceSourceFor\(setup\?\.source\)/);
    expect(sheet).not.toMatch(/source:\s*'default'/);
    expect(helper).toMatch(/isRealChoiceSource\(currentSource\) \? 'settings' : 'onboarding'/);
  });
  it('lands via the arrival machinery, not handleRead', () => {
    expect(sheet).not.toMatch(/handleRead/);
    expect(app).toMatch(/const homeKey = `\$\{langKey\}:\$\{setup\?\.persona \|\| ''\}`/);
  });
  it('keeps brand tones off inline color (dark-mode force-white trap)', () => {
    expect(sheet).toMatch(/className="dw-path-marker"/);
    expect(sheet).not.toMatch(/color:\s*'#[0-9A-Fa-f]{6}'/);
    expect(asked).not.toMatch(/color:\s*'#[0-9A-Fa-f]{6}'/);
  });
});

describe('the three doors', () => {
  it('Door 1 — one text link under Read on the landing, sheet hosted inside the dialog', () => {
    expect(landing).toMatch(/className="dw-day1-path-link"/);
    expect(landing).toMatch(/<ChoosePathSheet[\s\S]*?door="landing"/);
    expect(landing).toMatch(/if \(persona !== 'new_to_faith'\) window\.setTimeout\(\(\) => onDone\?\.\(\), 0\)/);
  });
  it('Door 2 — the path swatch sits in the header row for every persona', () => {
    const sw = home.indexOf('<PathSwatch');
    const lang = home.indexOf('<LanguageSwitch />');
    expect(sw).toBeGreaterThan(-1);
    expect(lang).toBeGreaterThan(sw);
    // Not behind the I'm-New gate that hides the campus chip.
    const line = home.slice(home.lastIndexOf('\n', sw), sw);
    expect(line).not.toContain('isNewPath');
  });
  it('Door 3 — asked once, before the push ask, never stacked, cookie banner defers', () => {
    expect(app).toMatch(/&& !showPathAsk;/);
    expect(app).toMatch(/\{!needsPushOnboarding && !showPathAsk && <CookieConsent \/>\}/);
    expect(app.indexOf('<PathAskedOnce')).toBeLessThan(app.indexOf('<PushOptIn'));
    expect(app).toMatch(/<ChoosePathSheet open=\{pathSheet\.open\}/);
    expect(sync).toMatch(/'dw_path_asked'/);
  });
  it('Settings opens the same sheet and the two-step picker is gone', () => {
    expect(more).toMatch(/openChoosePath\('settings'\)/);
    expect(more).not.toContain('Save & Apply');
    expect(more).not.toContain('pendingPersona');
  });
});
