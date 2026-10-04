/**
 * B09-08 step 5: Home is the word plus one next step; everything else sits,
 * unchanged and in today's order, under "More for today". Source-order
 * guards in the style of home-wave-b.test.ts (HomeScreen is not
 * unit-renderable).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME = readFileSync(join(__dirname, 'HomeScreen.tsx'), 'utf-8');
const SYNC = readFileSync(join(__dirname, '../utils/cloudSync.ts'), 'utf-8');

const card = HOME.indexOf('<NextStepCard\n');
const moreOpen = HOME.search(/<details\s+className="dw-more"/);
const moreClose = HOME.indexOf('</details>', moreOpen);
const inMore = HOME.slice(moreOpen, moreClose);
const dateNav = HOME.indexOf("{t('todays_reading')}");
const bottom = HOME.indexOf('{/* Bottom spacing */}');
const promo = HOME.indexOf('{!isNewPath && heroChapterRefs.length > 0 && <PromoAds />}');

describe('Home: one next step, then More for today', () => {
  it('the card sits under the date navigation and before the More for today row', () => {
    expect(dateNav).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(dateNav);
    expect(moreOpen).toBeGreaterThan(card);
    expect(moreClose).toBeGreaterThan(moreOpen);
    expect(inMore).toMatch(/<summary[^>]*className="dw-more-row"/);
    expect(inMore).toMatch(/tI18n\('more_for_today', lang\)/);
    expect(inMore).toMatch(/moreForTodayNames\(/);
  });

  it('More for today opens closed each day and remembers its open state per day', () => {
    expect(HOME).toMatch(/useState\(\(\) => readMoreOpen\(\)\)/);
    expect(HOME).toMatch(/writeMoreOpen\(/);
  });

  it('every section moved, none deleted: they all render inside More for today', () => {
    for (const marker of [
      '<PastoralReflectionSection',
      '{!isNewPath && sermonNotesRow}',
      '<PastorStudyOnboarding',
      '<ComfortVerseBannerSection',
      '<ComfortSection',
      '<BibleAIPromptSection',
      'pf.bookCards.length > 0',
      "personaConfig.sectionOrder.includes('plan_scripture') && (() =>",
      "personaConfig.sectionOrder.includes('scripture') && (() =>",
      '<DailyWordCard',
      '<WeeklyReviewCard',
      "pf.campusCount !== 'hidden'",
      'homeActivePlans.length > 0',
      "personaConfig.persona === 'pastor_leader' && (() =>",
    ]) {
      expect(inMore.includes(marker), marker).toBe(true);
    }
  });

  it('the card owns the set-up asks: install, email and upgrade render only through it, each marked as the next step', () => {
    expect(inMore).not.toMatch(/<PWAInstallBanner/);
    expect(inMore).not.toMatch(/<EmailNudgeCard/);
    expect(inMore).not.toMatch(/<UpgradePromptCard/);
    expect(HOME).toMatch(/<PWAInstallBanner next \/>/);
    expect(HOME).toMatch(/<EmailNudgeCard next \/>/);
    expect(HOME).toMatch(/<UpgradePromptCard\s+next/);
    expect(HOME.split('<PWAInstallBanner').length - 1).toBe(1);
    expect(HOME.split('<EmailNudgeCard').length - 1).toBe(1);
    expect(HOME.split('<UpgradePromptCard').length - 1).toBe(1);
  });

  it('PromoAds keeps its rule and its place: after More for today and the bottom spacing, condition unchanged', () => {
    expect(promo).toBeGreaterThan(-1);
    expect(promo).toBeGreaterThan(moreClose);
    expect(promo).toBeGreaterThan(bottom);
    expect(HOME.split('<PromoAds').length - 1).toBe(1);
  });

  it('Write it down opens the existing in-place reflection; there is still one Mark as read, at the end of the passage', () => {
    expect(HOME).toMatch(/<InlineReflection[\s\S]{0,400}openSignal=\{reflectOpenSignal\}/);
    expect(HOME.split("tI18n('mark_as_read', lang)").length - 1).toBe(1);
  });

  it('an open passage: Home tells the chooser, and the one Mark as read is the pulsing step only while the card is quiet', () => {
    expect(HOME).toMatch(/useHomeNextStep\(\{[\s\S]{0,300}passage: heroChapterRefs\[heroChapterIndex\][\s\S]{0,120}passageOpen: isReadingOpen\(heroChapterRefs\[heroChapterIndex\]/);
    expect(HOME).toMatch(/journeyInHero,[\s\S]{0,40}journeyDayDone/);
    expect(HOME.split('<NextPill />').length - 1).toBe(1);
    const mark = HOME.indexOf('onClick={() => handleMarkRead(readRef)}');
    expect(mark).toBeGreaterThan(-1);
    const markTag = HOME.slice(mark, HOME.indexOf('>', HOME.indexOf('style={{', mark)));
    expect(markTag).toMatch(/homeNext\.step\.action === 'none'[\s\S]*!readDoneToday \? 'dw-next dw-next-main'/);
    // On Home itself only two buttons can carry the pulse, each only while the card is quiet:
    // this Mark as read and the journey hero's Read (the card's own button is in NextStepCard).
    expect(HOME.split("'dw-next dw-next-main'").length - 1).toBe(2);
    expect(HOME.split("'dw-next'").length - 1).toBe(0);
    expect(HOME).toMatch(/homeNext\.step\.kind === 'journey_day' && homeNext\.step\.action === 'none' \? 'dw-next dw-next-main'/);
  });

  it('dw_next_skips never syncs and the screen never writes it', () => {
    expect(SYNC).not.toMatch(/dw_next_skips/);
    expect(HOME).not.toMatch(/dw_next_skips/);
  });
});
