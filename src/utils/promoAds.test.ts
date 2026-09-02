import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');

describe('house ads placement', () => {
  it('keeps PromoAds off sermon notes, staff, Plans, Notes, and Campus', () => {
    expect(src('components/SermonNotesSurface.tsx')).not.toMatch('PromoAds');
    expect(src('staff/StaffApp.tsx')).not.toMatch('PromoAds');
    expect(src('screens/SermonNotesScreen.tsx')).not.toMatch('PromoAds');
    expect(src('screens/PlansScreen.tsx')).not.toMatch('PromoAds');
    expect(src('screens/JournalScreen.tsx')).not.toMatch('<PromoAds');
    expect(src('screens/MessagesScreen.tsx')).not.toMatch('<PromoAds');
  });

  it('shows PromoAds only on Home and More', () => {
    expect(src('screens/HomeScreen.tsx')).toMatch('<PromoAds');
    expect(src('screens/MoreScreen.tsx')).toMatch('<PromoAds');
  });

  it('links Selah to the church site, not a store download', () => {
    const ads = src('components/PromoAds.tsx');
    expect(ads).toMatch("SELAH_HREF = 'https://futures.church/'");
    expect(ads).not.toMatch(/play\.google|apps\.apple/i);
    expect(ads).toMatch('promo_selah_name');
    expect(ads).toMatch('promo_coming');
  });
});

describe('More from Futures', () => {
  const ads = src('components/PromoAds.tsx');
  const css = src('index.css');

  it('is one labelled block with at most three 3:2 cards', () => {
    expect(ads).toMatch('more_from_futures');
    expect(ads).toMatch('dw-more-from');
    expect((ads.match(/dw-more-from-card/g) || []).length).toBeLessThanOrEqual(4);
    expect(css).toMatch(/aspect-ratio:\s*3\s*\/\s*2/);
  });

  it('does not paint three equal black strips', () => {
    expect(ads).not.toMatch('dw-promo-strip');
    expect(css).not.toMatch(/\.dw-promo-card[\s\S]*background:\s*#17130F/);
  });
});

describe('New to Faith sage tokens', () => {
  it('keeps the live --dw-new values and no invented greens', () => {
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
  });
});
