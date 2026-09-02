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

describe('house ads mosaic', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');

  it('is a mosaic of three offers, not a carousel or a fourth clone', () => {
    expect(css).toMatch(/\.dw-promo-strip\s*\{[^}]*display:\s*grid/);
    expect(css).not.toMatch(/\.dw-promo-band\s*\{[^}]*height:\s*140px/);
    expect(ads).not.toMatch('PromoVariant');
    expect(ads).not.toMatch('house_ad_multiply');
    expect(ads).not.toMatch('setInterval');
    expect(ads).toMatch('dw-promo-books');
    expect(ads).toMatch('dw-promo-college');
    expect(ads).toMatch('dw-promo-selah');
    expect(ads.indexOf('dw-promo-books')).toBeLessThan(ads.indexOf('dw-promo-college'));
    expect(ads.indexOf('dw-promo-college')).toBeLessThan(ads.indexOf('dw-promo-selah'));
  });

  it('features Books full-width with a 16:10 still-life band and copy underneath', () => {
    expect(css).toMatch(/\.dw-promo-books\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(css).toMatch(/\.dw-promo-books\s+\.dw-promo-band\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
    const books = ads.slice(ads.indexOf('house_ad_books'), ads.indexOf('house_ad_college'));
    expect(books).toMatch(/dw-promo-band[\s\S]*dw-promo-covers[\s\S]*dw-promo-copy/);
    expect(books).toMatch('promo_books_title');
    expect(books).toMatch('promo_shop');
  });

  it('pairs College and Selah as 1:1 companions', () => {
    expect(css).toMatch(/\.dw-promo-college,\s*\n?\.dw-promo-selah\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/);
  });

  it('desktop magazine grid is 2fr 1fr with Books spanning both rows', () => {
    expect(css).toMatch(/@media\s*\(min-width:\s*700px\)\s*\{[\s\S]*\.dw-promo-strip\s*\{[^}]*grid-template-columns:\s*2fr\s+1fr/);
    expect(css).toMatch(/\.dw-promo-books\s*\{[^}]*grid-area:\s*1\s*\/\s*1\s*\/\s*3\s*\/\s*2/);
    expect(css).toMatch(/\.dw-promo-college\s*\{[^}]*grid-area:\s*1\s*\/\s*2\s*\/\s*2\s*\/\s*3/);
    expect(css).toMatch(/\.dw-promo-selah\s*\{[^}]*grid-area:\s*2\s*\/\s*2\s*\/\s*3\s*\/\s*3/);
  });

  it('keeps book covers at natural aspect — contain, not cover or flex-grow', () => {
    expect(css).toMatch(/\.dw-promo-covers img\s*\{[^}]*object-fit:\s*contain/);
    expect(css).toMatch(/\.dw-promo-covers img\s*\{[^}]*width:\s*auto/);
    expect(css).not.toMatch(/\.dw-promo-covers img\s*\{[^}]*object-fit:\s*cover/);
    expect(css).not.toMatch(/\.dw-promo-covers img\s*\{[^}]*flex:\s*1/);
  });

  it('treats Selah type as the image — no empty band, no Explore', () => {
    const selah = ads.slice(ads.indexOf('house_ad_selah'));
    expect(selah).not.toMatch('dw-promo-band');
    expect(selah).toMatch('promo_selah_name');
    expect(selah).toMatch('promo_selah_date');
    expect(selah).toMatch('dw-promo-date');
    expect(selah).toMatch('promo_coming');
    expect(selah).not.toMatch('promo_explore');
    expect(selah).not.toMatch('dw-promo-copy');
  });

  it('sizes the college logo at 28px in the upper mark field', () => {
    expect(ads).toMatch('dw-promo-logo');
    expect(ads).toMatch('dw-promo-mark');
    expect(css).toMatch(/\.dw-promo-logo\s*\{[^}]*height:\s*28px/);
    expect(css).toMatch(/\.dw-promo-logo\s*\{[^}]*max-width:\s*80%/);
    expect(css).toMatch(/\.dw-promo-logo\s*\{[^}]*object-fit:\s*contain/);
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
