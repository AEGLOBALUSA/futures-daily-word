import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');

describe('house ads placement', () => {
  it('keeps PromoAds out of the ivory sermon canvas and off /staff', () => {
    expect(src('components/SermonNotesSurface.tsx')).not.toMatch('PromoAds');
    expect(src('staff/StaffApp.tsx')).not.toMatch('PromoAds');
    expect(src('screens/SermonNotesScreen.tsx')).toMatch('PromoAds');
    expect(src('screens/SermonNotesScreen.tsx')).toMatch('data-testid="sermon-notes-ads"');
  });

  it('shows PromoAds on every congregation tab', () => {
    for (const file of [
      'screens/HomeScreen.tsx',
      'screens/PlansScreen.tsx',
      'screens/JournalScreen.tsx',
      'screens/MessagesScreen.tsx',
      'screens/MoreScreen.tsx',
      'screens/SermonNotesScreen.tsx',
    ]) {
      expect(src(file).includes('<PromoAds'), `${file} should render PromoAds`).toBe(true);
    }
  });

  it('links Selah to the church site, not a store download', () => {
    const ads = src('components/PromoAds.tsx');
    expect(ads).toMatch("SELAH_HREF = 'https://futures.church/'");
    expect(ads).not.toMatch(/play\.google|apps\.apple/i);
    expect(ads).toMatch('promo_selah_name');
    expect(ads).toMatch('promo_selah_date');
    expect(ads).toMatch('promo_coming');
  });
});

describe('house ads commercial strip', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');

  it('uses one charcoal field, 12px radius, no shadow or gold kicker', () => {
    expect(css).toMatch(/\.dw-promo-card[\s\S]*border-radius:\s*12px/);
    expect(css).toMatch(/\.dw-promo-card[\s\S]*box-shadow:\s*none/);
    expect(ads).not.toMatch('#C8926E');
    expect(ads).not.toMatch('promo_books_label');
    expect(ads).not.toMatch('promo_selah_label');
    expect(ads).not.toMatch(/→/);
  });

  it('lays covers in a still-life row, not a fanned 52px stack', () => {
    expect(ads).toMatch('dw-promo-covers');
    expect(ads).not.toMatch(/rotate\(/);
    expect(ads).not.toMatch('width: 52');
    expect(ads).not.toMatch('height: 72');
    expect(ads).not.toMatch('marginLeft');
  });

  it('keeps college as one geo card on the same charcoal field', () => {
    expect(ads).not.toMatch('#232A24');
    expect(ads).not.toMatch('#35403A');
    expect(ads).not.toMatch('linear-gradient');
    expect(ads).toMatch('promo_explore');
    expect(ads).toMatch('college.locKey');
    expect(ads).not.toMatch('promo_college_sub');
  });

  it('does not pretend Selah is a live shop', () => {
    expect(ads).not.toMatch('promo_selah_cta');
    expect(ads).not.toMatch('promo_selah_sub');
  });
});

describe('I\'m New sage tokens', () => {
  it('replaces the rejected greens in both themes', () => {
    const css = src('index.css');
    expect(css).toMatch('--dw-new: #8FAF90');
    expect(css).toMatch('--dw-new-hover: #A3B89A');
    expect(css).toMatch('--dw-new-soft: #8FAF9038');
    expect(css).toMatch('--dw-new: #3F5E46');
    expect(css).toMatch('--dw-new-hover: #334F3D');
    expect(css).toMatch('--dw-new-soft: #3F5E4624');
    expect(css).not.toMatch('#1B7A4A');
    expect(css).not.toMatch('#3D9B68');
    expect(css).not.toMatch('#4AAD76');
    expect(css).not.toMatch('#176B41');
  });

  it('recolors only the new_to_faith journey card on Plans, not every tile', () => {
    const plans = src('screens/PlansScreen.tsx');
    const css = src('index.css');
    expect(plans).toMatch('dw-plan-sd-card-new');
    expect(css).toMatch(/\.dw-plan-sd-card-new[\s\S]*border-color:\s*var\(--dw-new\)/);
    const accentCount = (plans.match(/--dw-accent/g) || []).length;
    const newCount = (plans.match(/--dw-new/g) || []).length;
    expect(accentCount).toBeGreaterThan(10);
    expect(newCount).toBe(0);
  });
});
