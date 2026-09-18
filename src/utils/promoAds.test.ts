import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'fs';
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

// Ashley, 18 Sep 2026: the ads "should be as good as the ones on the
// futures.church site". These pin that standard. The 2 Sep ivory back page
// (small covers, text links, no button, no fan) is what they replaced — if one
// of these fails because someone quietened the block again, that is the test
// doing its job.
describe('house ads match the futures.church invitation', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');
  const promoCss = css.slice(css.indexOf('.dw-promo-block'), css.indexOf('.dw-sermon-notes-phone'));

  it('is one dark scene in the church site\'s ink, cream and ginger', () => {
    expect(promoCss).toMatch(/--promo-ink:\s*#1C1A17/);
    expect(promoCss).toMatch(/--promo-cream:\s*#FDFBF6/);
    expect(promoCss).toMatch(/--promo-ginger:\s*#FF8432/);
    expect(promoCss).toMatch(/\.dw-promo-books\s*\{[^}]*background:\s*var\(--promo-ink\)/);
    expect(promoCss).toMatch(/border-radius:\s*28px/);
  });

  it('keeps its own colours on every path and in both themes', () => {
    expect(promoCss).not.toMatch('--dw-accent');
    expect(promoCss).not.toMatch('--dw-new');
    expect(ads).not.toMatch('--dw-accent');
    expect(ads).not.toMatch('--dw-new');
  });

  it('leads with the eyebrow, a display headline, the description and a ginger button', () => {
    const books = ads.slice(ads.indexOf('house_ad_books'), ads.indexOf('house_ad_college'));
    expect(books).toMatch(/promo_books_eyebrow[\s\S]*promo_books_headline[\s\S]*promo_books_desc[\s\S]*promo_books_cta/);
    expect(promoCss).toMatch(/\.dw-promo-books-title\s*\{[^}]*font-family:\s*var\(--font-serif\)/);
    expect(promoCss).toMatch(/\.dw-promo-books-title\s*\{[^}]*font-size:\s*clamp\(/);
    expect(promoCss).toMatch(/\.dw-promo-cta\s*\{[^}]*background:\s*var\(--promo-ginger\)/);
    expect(promoCss).toMatch(/\.dw-promo-cta\s*\{[^}]*border-radius:\s*999px/);
    expect(promoCss).toMatch(/\.dw-promo-cta\s*\{[^}]*min-height:\s*48px/);
  });

  it('fans the three real covers under a glow', () => {
    expect(ads).toMatch('book-no-more-fear.jpg');
    expect(ads).toMatch('book-scarcity-to-supply.jpg');
    expect(ads).toMatch('book-multiply-or-die.jpg');
    expect(promoCss).toMatch(/\.dw-promo-cover\.is-left\s*\{[^}]*rotate\(-11deg\)/);
    expect(promoCss).toMatch(/\.dw-promo-cover\.is-right\s*\{[^}]*rotate\(10deg\)/);
    expect(promoCss).toMatch(/\.dw-promo-cover\.is-centre\s*\{[^}]*z-index:\s*1/);
    expect(promoCss).toMatch(/\.dw-promo-cover\s*\{[^}]*object-fit:\s*contain/);
    expect(promoCss).toMatch(/\.dw-promo-glow\s*\{[^}]*radial-gradient/);
  });

  it('makes each whole graphic the link: three anchors, the button is not a fourth', () => {
    expect((ads.match(/<a\b/g) || []).length).toBe(3);
    expect(ads).toMatch(/<span className="dw-promo-cta">/);
    expect(ads).toMatch("href=\"https://futures.church/books\"");
  });

  it('is three offers in order, not a carousel', () => {
    expect(ads).toMatch('promo_more_from');
    expect(ads).not.toMatch('house_ad_multiply');
    expect(ads).not.toMatch('PromoVariant');
    expect(ads).not.toMatch('dw-promo-dots');
    expect(ads.indexOf('dw-promo-books')).toBeLessThan(ads.indexOf('dw-promo-college'));
    expect(ads.indexOf('dw-promo-college')).toBeLessThan(ads.indexOf('dw-promo-selah'));
  });

  it('moves once when first seen and never loops, and not at all under reduced motion', () => {
    expect(ads).toMatch('data-promo-scene');
    expect(ads).toMatch("dataset.visible = 'true'");
    expect(ads).toMatch('seen.unobserve');
    expect(promoCss).not.toMatch('infinite');
    const motion = promoCss.slice(promoCss.indexOf('@media (prefers-reduced-motion: no-preference)'));
    expect(motion).toMatch(/\[data-visible='true'\]\s+\.dw-promo-fan\s*\{[^}]*animation:/);
    const beforeMotion = promoCss.slice(0, promoCss.indexOf('@media (prefers-reduced-motion: no-preference)'));
    expect(beforeMotion).not.toMatch(/animation:/);
  });
});

describe('house ads college and Selah cards', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');
  const promoCss = css.slice(css.indexOf('.dw-promo-block'), css.indexOf('.dw-sermon-notes-phone'));

  it('shows college as one geo offer on a photograph, cream logo over a shade', () => {
    expect(ads).toMatch('college.locKey');
    expect(ads).toMatch('college.href');
    expect(ads).toMatch('promo_college_sub');
    expect(ads).toMatch('promo_college_cta');
    expect(ads).toMatch('/promos/college-students.jpg');
    expect(ads).toMatch('logo-flc-horizontal-cream.svg');
    expect(promoCss).toMatch(/\.dw-promo-photo\s*\{[^}]*object-fit:\s*cover/);
    expect(promoCss).toMatch(/\.dw-promo-shade\s*\{[^}]*linear-gradient/);
  });

  it('ships the college photo small enough for a phone on mobile data', () => {
    const bytes = statSync(join(ROOT, 'public/promos/college-students.jpg')).size;
    expect(bytes).toBeGreaterThan(20_000);
    expect(bytes).toBeLessThan(250_000);
  });

  it('treats Selah as a paper card: Coming above, name, what it is, date at the foot', () => {
    const selah = ads.slice(ads.indexOf('house_ad_selah'));
    expect(selah.indexOf('dw-promo-selah-meta')).toBeLessThan(selah.indexOf('dw-promo-selah-name'));
    expect(selah.indexOf('dw-promo-selah-name')).toBeLessThan(selah.indexOf('dw-promo-selah-sub'));
    expect(selah.indexOf('dw-promo-selah-sub')).toBeLessThan(selah.indexOf('dw-promo-selah-date'));
    expect(promoCss).toMatch(/\.dw-promo-selah\s*\{[^}]*background:\s*#F1EADD/);
    expect(promoCss).toMatch(/\.dw-promo-rules\s*\{[^}]*rotate\(18deg\)/);
  });

  it('stacks on a phone and sits two-up from 700px', () => {
    expect(promoCss).toMatch(/@media\s*\(min-width:\s*700px\)\s*\{[\s\S]*\.dw-promo-aside\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/);
    expect(promoCss).toMatch(/@media\s*\(min-width:\s*700px\)\s*\{[\s\S]*\.dw-promo-books\s*\{[^}]*grid-template-columns:/);
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
