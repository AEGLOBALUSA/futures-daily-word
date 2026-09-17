import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');
const root = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

describe('I\'m New path — sage chrome, one lever', () => {
  it('index.css maps --dw-accent to sage under body.dw-persona-new', () => {
    const css = src('index.css');
    expect(css).toMatch(/body\.dw-persona-new\s*\{[^}]*--dw-accent:\s*var\(--dw-new\)/);
    expect(css).toMatch(/body\.dw-persona-new\s*\.dw-btn-primary\s*\{[^}]*color:\s*var\(--dw-new-on-fill\)/);
  });

  it('App.tsx toggles dw-persona-new off isNewChristianPersona(setup?.persona)', () => {
    const app = root('src/App.tsx');
    expect(app).toMatch("import { isNewChristianPersona } from './utils/persona-config'");
    expect(app).toMatch("classList.toggle('dw-persona-new', isNewChristianPersona(setup?.persona))");
  });

  it('leaves the house ads on More for every path, this one included', () => {
    // Ashley, 18 Sep 2026: the ads should be seen, and as good as the church
    // site's. An earlier cut of this branch hid them here for I'm New.
    const more = readFileSync(join(ROOT, 'src/screens/MoreScreen.tsx'), 'utf-8');
    expect(more).toMatch(/<PromoAds \/>/);
    expect(more).not.toMatch(/!newPathSettings\s*&&\s*\(\s*<div[^>]*>\s*<PromoAds/);
  });

  it('plans.ts renames faith-pathway to Bible Basics and drops the old title', () => {
    const plans = src('data/plans.ts');
    expect(plans).toMatch(/id:\s*'faith-pathway'/);
    expect(plans).toMatch(/title:\s*'Bible Basics: 30 Days'/);
    expect(plans).not.toMatch('Foundations of Faith');
  });
});
