import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');

describe('house ads placement', () => {
  it('keeps PromoAds out of the ivory sermon canvas and off /staff', () => {
    expect(src('components/SermonNotesSurface.tsx')).not.toMatch('PromoAds');
    expect(src('staff/StaffApp.tsx')).not.toMatch('PromoAds');
    expect(src('screens/SermonNotesScreen.tsx')).not.toMatch('PromoAds');
    expect(src('screens/SermonNotesScreen.tsx')).not.toMatch('sermon-notes-ads');
  });

  it('shows PromoAds on congregation Home (when a reading exists) and More only', () => {
    expect(src('screens/HomeScreen.tsx')).toMatch('<PromoAds');
    expect(src('screens/HomeScreen.tsx')).toMatch('!isNewPath && heroChapterRefs.length > 0 && <PromoAds');
    expect(src('screens/MoreScreen.tsx')).toMatch('<PromoAds');
    for (const file of [
      'screens/PlansScreen.tsx',
      'screens/JournalScreen.tsx',
      'screens/MessagesScreen.tsx',
      'screens/SermonNotesScreen.tsx',
      'components/NewBelieverLessonCard.tsx',
    ]) {
      expect(src(file).includes('<PromoAds'), `${file} should not render PromoAds`).toBe(false);
    }
  });

  it('keeps More ads above the church footer, never under © Futures Global', () => {
    const more = src('screens/MoreScreen.tsx');
    expect(more.indexOf('<PromoAds')).toBeGreaterThan(-1);
    expect(more.indexOf('<PromoAds')).toBeLessThan(more.indexOf('<SeamFooter'));
    expect(more).toMatch(/<PromoAds \/>[\s\S]*<SeamFooter/);
    expect(more).not.toMatch(/<SeamFooter \/>[\s\S]*<PromoAds/);
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

describe('house ads ivory journal', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');
  const promoCss = css.slice(css.indexOf('.dw-promo-block'), css.indexOf('.dw-sermon-notes-phone'));

  it('is paper, not charcoal tiles or cream-on-black banners', () => {
    expect(promoCss).toMatch(/background:\s*#FAF6EF/);
    expect(promoCss).toMatch(/#241E17/);
    expect(promoCss).not.toMatch('#17130F');
    expect(ads).not.toMatch('#17130F');
    expect(ads).not.toMatch('#1A0E04');
    expect(ads).not.toMatch('#0A1520');
    expect(ads).not.toMatch('#0D1A2A');
    expect(promoCss).not.toMatch(/border-radius:\s*12px/);
    expect(promoCss).not.toMatch(/border-radius:\s*14px/);
    expect(promoCss).toMatch(/box-shadow:\s*none/);
    expect(promoCss).not.toMatch(/box-shadow:\s*[0-9]/);
    expect(ads).not.toMatch('#C8926E');
    expect(ads).not.toMatch('--dw-new');
    expect(promoCss).not.toMatch('--dw-new');
  });

  it('is one More from Futures block of three offers, not a carousel', () => {
    expect(ads).toMatch('promo_more_from');
    expect(ads).toMatch('dw-promo-books');
    expect(ads).toMatch('dw-promo-college');
    expect(ads).toMatch('dw-promo-selah');
    expect(ads).not.toMatch('house_ad_multiply');
    expect(ads).not.toMatch('PromoVariant');
    expect(ads).not.toMatch('dw-promo-dots');
    expect(ads).not.toMatch('variant');
    expect(ads.indexOf('dw-promo-books')).toBeLessThan(ads.indexOf('dw-promo-college'));
    expect(ads.indexOf('dw-promo-college')).toBeLessThan(ads.indexOf('dw-promo-selah'));
  });

  it('uses text links, not cream buttons or Shop/Explore chrome', () => {
    expect(ads).toMatch('promo_shop_books');
    expect(ads).toMatch('promo_college_cta');
    expect(promoCss).toMatch(/\.dw-promo-link\s*\{[^}]*text-decoration:\s*underline/);
    expect(promoCss).toMatch(/\.dw-promo-link\s*\{[^}]*text-underline-offset:\s*3px/);
    expect(promoCss).toMatch(/\.dw-promo-link\s*\{[^}]*font-size:\s*14px/);
    expect(promoCss).not.toMatch(/\.dw-promo-cta/);
    expect(ads).not.toMatch('promo_shop,');
    expect(ads).not.toMatch('promo_explore');
  });

  it('labels the block in the 11px secondary UI face, not muted-on-ivory', () => {
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*font-family:\s*var\(--font-ui\)/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*font-size:\s*11px/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*font-weight:\s*600/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*letter-spacing:\s*0\.08em/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*text-transform:\s*uppercase/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*color:\s*#564B3F/);
    expect(promoCss).toMatch(/\.dw-promo-heading\s*\{[^}]*margin:\s*0 0 32px/);
  });
});

describe('house ads photography and type', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');
  const promoCss = css.slice(css.indexOf('.dw-promo-block'), css.indexOf('.dw-sermon-notes-phone'));

  it('lays covers in a still-life row at natural height, not a 3:2 well or fan', () => {
    expect(ads).toMatch('dw-promo-covers');
    expect(ads).not.toMatch(/rotate\(/);
    expect(ads).not.toMatch('width: 52');
    expect(ads).not.toMatch('height: 72');
    expect(ads).not.toMatch('marginLeft');
    expect(promoCss).toMatch(/\.dw-promo-covers\s*\{[^}]*gap:\s*16px/);
    expect(promoCss).toMatch(/\.dw-promo-covers img\s*\{[^}]*object-fit:\s*contain/);
    expect(promoCss).toMatch(/\.dw-promo-covers img\s*\{[^}]*max-height:\s*180px/);
    expect(promoCss).toMatch(/max-height:\s*240px/);
    expect(promoCss).not.toMatch(/aspect-ratio:\s*3\s*\/\s*2/);
    expect(promoCss).not.toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    expect(promoCss).not.toMatch(/\.dw-promo-covers img\s*\{[^}]*object-fit:\s*cover/);
    expect(promoCss).not.toMatch(/\.dw-promo-covers img\s*\{[^}]*flex:\s*1/);
  });

  it('features Books full-width with title and Shop the books under the photo row', () => {
    const books = ads.slice(ads.indexOf('house_ad_books'), ads.indexOf('house_ad_college'));
    expect(books).toMatch(/dw-promo-covers[\s\S]*dw-promo-books-title[\s\S]*promo_shop_books/);
    expect(promoCss).toMatch(/\.dw-promo-books-title\s*\{[^}]*font-size:\s*28px/);
    expect(promoCss).toMatch(/\.dw-promo-books-title\s*\{[^}]*color:\s*#241E17/);
  });

  it('pairs College and Selah as type columns, not filled squares', () => {
    expect(promoCss).toMatch(/\.dw-promo-aside\s*\{[^}]*display:\s*grid/);
    expect(promoCss).toMatch(/\.dw-promo-strip\s*\{[^}]*gap:\s*24px/);
    expect(promoCss).not.toMatch(/\.dw-promo-college[\s\S]{0,120}aspect-ratio/);
    expect(promoCss).not.toMatch(/\.dw-promo-selah[\s\S]{0,120}aspect-ratio/);
  });

  it('desktop magazine grid is 2fr 1fr with 40px air in the right stack', () => {
    expect(promoCss).toMatch(/@media\s*\(min-width:\s*700px\)\s*\{[\s\S]*\.dw-promo-strip\s*\{[^}]*grid-template-columns:\s*2fr\s+1fr/);
    expect(promoCss).toMatch(/@media\s*\(min-width:\s*700px\)\s*\{[\s\S]*\.dw-promo-aside\s*\{[^}]*gap:\s*40px/);
  });

  it('keeps college as one geo offer with an ink logo and loc stacked over Explore', () => {
    expect(ads).not.toMatch('#232A24');
    expect(ads).not.toMatch('#35403A');
    expect(ads).not.toMatch('linear-gradient');
    expect(ads).toMatch('promo_college_cta');
    expect(ads).toMatch('college.locKey');
    expect(ads).not.toMatch('promo_college_sub');
    expect(ads).toMatch('logo-flc-horizontal-ink.svg');
    expect(ads).not.toMatch('logo-flc-horizontal-cream.svg');
    expect(promoCss).toMatch(/\.dw-promo-logo\s*\{[^}]*height:\s*24px/);
    expect(promoCss).toMatch(/\.dw-promo-college-loc\s*\{[^}]*font-size:\s*22px/);
    expect(promoCss).toMatch(/font-size:\s*18px/);
    expect(promoCss).toMatch(/-webkit-line-clamp:\s*2/);
  });

  it('treats Selah as a poster on paper — Coming above, date under, no Explore', () => {
    const selah = ads.slice(ads.indexOf('house_ad_selah'));
    expect(selah).not.toMatch('dw-promo-band');
    expect(selah).toMatch('promo_selah_name');
    expect(selah).toMatch('promo_selah_date');
    expect(selah).toMatch('promo_coming');
    expect(selah).toMatch('dw-promo-selah-meta');
    expect(selah.indexOf('dw-promo-selah-meta')).toBeLessThan(selah.indexOf('dw-promo-selah-name'));
    expect(selah.indexOf('dw-promo-selah-name')).toBeLessThan(selah.indexOf('dw-promo-selah-date'));
    expect(selah).not.toMatch('promo_explore');
    expect(selah).not.toMatch('promo_college_cta');
    expect(selah).not.toMatch('dw-promo-title-row');
    expect(promoCss).toMatch(/\.dw-promo-selah-name\s*\{[^}]*font-size:\s*36px/);
    expect(promoCss).toMatch(/\.dw-promo-selah-date\s*\{[^}]*font-size:\s*22px/);
    expect(promoCss).toMatch(/\.dw-promo-selah-meta\s*\{[^}]*text-transform:\s*uppercase/);
  });

  it('hides the AI FAB while the promo block is in view', () => {
    expect(ads).toMatch('dw-promo-in-view');
    expect(css).toMatch(/body\.dw-promo-in-view\s+\.dw-ai-launcher/);
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
