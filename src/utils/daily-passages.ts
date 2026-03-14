/**
 * Daily passage assignment system.
 * Each day gets 5-7 passages from different Bible sections,
 * rotating through each section's passages based on the day number.
 */
import { BIBLE_SECTIONS } from '../data/bible-sections';
import { ASHLEY_JANE_DEVOTIONALS, ASHLEY_JANE_PLAN_PASSAGES } from '../data/ashley-jane-plan';

export interface DailyPassage {
  sectionKey: string;
  sectionLabel: string;
  sectionEmoji: string;
  passage: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * Get the day number since epoch for stable daily assignment.
 * dayOffset lets users navigate ±30 days.
 */
export function getDayNumber(dayOffset = 0): number {
  const now = new Date();
  now.setDate(now.getDate() + dayOffset);
  // Day number since Unix epoch
  return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Get the formatted date string for a given day offset.
 */
export function getDateString(dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns today's assigned passages (5-7 passages from different sections).
 */
export function getDailyPassages(dayOffset = 0): DailyPassage[] {
  const dayNum = getDayNumber(dayOffset);
  const passages: DailyPassage[] = [];

  // Always include a psalm, a gospel/acts, and rotate through others
  const activeSections = dayNum % 2 === 0
    ? ['psalms', 'gospels', 'epistles', 'ot_history', 'wisdom']
    : ['psalms', 'gospels', 'prophets', 'wisdom', 'revelation'];

  // On every 3rd day, add acts
  if (dayNum % 3 === 0) {
    activeSections.push('acts');
  }

  for (const key of activeSections) {
    const section = BIBLE_SECTIONS[key];
    if (!section) continue;
    const idx = dayNum % section.passages.length;
    passages.push({
      sectionKey: key,
      sectionLabel: section.label,
      sectionEmoji: section.emoji,
      passage: section.passages[idx],
    });
  }

  return passages;
}

/**
 * Get today's devotion index (cycles through 30 devotions).
 */
export function getDailyDevotionIndex(dayOffset = 0): number {
  const dayNum = getDayNumber(dayOffset);
  return dayNum % 30;
}

/**
 * Get today's quote index (cycles through quotes array).
 */
export function getDailyQuoteIndex(dayOffset = 0, totalQuotes: number): number {
  const dayNum = getDayNumber(dayOffset);
  return dayNum % totalQuotes;
}

/**
 * Get THE single daily devotion for the entire site.
 * Always uses Ashley & Jane devotionals — cycles through 100 by day number.
 * Every screen must use this — never derive devotion independently.
 */
export function getTodaysDevotion(dayOffset = 0): {
  title: string;
  verse: string;
  body: string;
  author: string;
  source: 'ashley-jane';
} {
  const dayNum = getDayNumber(dayOffset);
  const idx = dayNum % ASHLEY_JANE_DEVOTIONALS.length;
  const ajDev = ASHLEY_JANE_DEVOTIONALS[idx];
  return {
    title: ajDev.title,
    verse: ASHLEY_JANE_PLAN_PASSAGES[idx] || '',
    body: ajDev.body,
    author: ajDev.author,
    source: 'ashley-jane',
  };
}
