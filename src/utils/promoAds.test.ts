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
    expect(ads).toMatch('promo_selah_title');
    expect(ads).toMatch('promo_selah_cta');
  });
});
