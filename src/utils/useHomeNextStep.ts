/**
 * useHomeNextStep — Home's one next step, worked out from what Home already
 * knows (B09-08). The thinking is in nextStep.ts (pure); this hook gathers the
 * facts, keeps them fresh on a keep-alive Home and resolves the words.
 *
 * Recomputes on: Mark as read (dw-reading-completed), a saved reflection
 * (dw-journal-updated), a streak or push answer, an install, a language
 * change, the tab coming back (focus / visibilitychange) and once a minute,
 * so the Sunday card leaves at the campus's closing time with the app open.
 *
 * Sermon Notes: on a Sunday morning it asks once per congregation per session
 * whether this week's notes are published (the same feed the notes screen
 * reads). Until it knows, the notes count as published, so a slow feed never
 * takes Sunday's notes off an I'm New reader's Home.
 *
 * Nothing here sends anything, syncs anything new or reaches a model.
 * dw_next_skips stays on this device.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nextStep, readSkips, noteShown, noteQuiet, noteTapped, quietKeyFor, fillParams, type NextStep, type QuietableKind } from './nextStep';
import { applicableSetupAsks } from './setupAsks';
import { isSundayWindow, readerSundayUntil, readerTimeZone } from './sunday';
import { tomorrowPassage, reflectedToday, localToday } from './homeToday';
import { fetchCurrentSermon } from './currentSermon';
import { t } from './i18n';
import { findCampus } from '../data/campuses';
import { PLAN_CATALOGUE } from '../data/plans';
import { BOOK_CHAPTERS } from '../data/bible-books';
import type { CongregationId } from '../data/congregations';
import type { PathwayData } from '../data/pathway-types';

export interface HomeNextStepInput {
  persona: string;
  isNewPath: boolean;
  /** Today's hero reading (heroChapterRefs[0]). */
  passage: string | null;
  readDoneToday: boolean;
  /** I'm New: the journey, the day on screen and whether today's day is finished. */
  pathwayEnrolled: boolean;
  pathwayData: PathwayData | null;
  pathwayDisplayDay: number;
  journeyDayDone: boolean;
  /** Today's plan passages (Home's todaysPlanPassages). */
  planPassages: Array<{ planId: string; dayNum: number }>;
  /** The first reading slot, when there is one. */
  firstSlot: { book: string; currentChapter: number } | null;
  /** The reader's saved campus id and email (userProfile). */
  campusId: string | null | undefined;
  email: string | null | undefined;
  /** Which church's Sermon Notes this device reads. */
  congregation: CongregationId;
  /** localDayIndex() for the comfort and pastor rotations. */
  dayIndex: number;
}

export interface HomeNextStep {
  step: NextStep;
  /** The journey has not arrived yet: show today's hero skeleton, no button. */
  loading: boolean;
  /** The button's words (or, for done, the quiet line). */
  label: string;
  /** One line of why, when it helps. */
  why: string | null;
  /** Call when the one button is tapped (resets the skip count). */
  onTapped: () => void;
}

const REFRESH_EVENTS = [
  'dw-reading-completed',
  'dw-journal-updated',
  'dw-streak-recorded',
  'dw-push-onboarded',
  'pwa-installed',
  'dw-lang-changed',
  'focus',
];
const QUIETABLE: QuietableKind[] = ['write', 'install', 'email', 'upgrade'];

/** Pastor/study: a plan is running, or the set-up wizard was finished. */
function studyPlanSetUp(): boolean {
  try {
    if (localStorage.getItem('dw_pastor_onboard_completed')) return true;
    const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
    return !!ap && typeof ap === 'object' && Object.keys(ap).length > 0;
  } catch {
    return false;
  }
}

export function useHomeNextStep(input: HomeNextStepInput): HomeNextStep {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    REFRESH_EVENTS.forEach((e) => window.addEventListener(e, bump));
    const onVisible = () => { if (document.visibilityState === 'visible') bump(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(bump, 60_000);
    return () => {
      REFRESH_EVENTS.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [bump]);

  const campus = findCampus(input.campusId || undefined);
  const timeZone = readerTimeZone(campus);
  const until = readerSundayUntil(campus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sundayWindow = useMemo(() => isSundayWindow(new Date(), timeZone, until), [timeZone, until, tick]);

  // This week's notes for this congregation: asked once per session, only on a Sunday morning.
  const [published, setPublished] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!sundayWindow || input.congregation in published) return;
    let live = true;
    fetchCurrentSermon(input.congregation)
      .then((s) => { if (live) setPublished((p) => ({ ...p, [input.congregation]: !!s })); })
      .catch(() => { /* unknown stays unknown: the notes keep their place */ });
    return () => { live = false; };
  }, [sundayWindow, input.congregation, published]);

  const today = localToday();
  const loading = input.isNewPath && input.pathwayEnrolled && !input.pathwayData;

  // Home rebuilds these arrays on every render; key the memo on their content.
  const planKey = input.planPassages.map((p) => `${p.planId}:${p.dayNum}`).join('|');
  const slotKey = input.firstSlot ? `${input.firstSlot.book}:${input.firstSlot.currentChapter}` : '';

  const step = useMemo(() => {
    let skips = readSkips();
    for (const k of QUIETABLE) skips = noteQuiet(k, today, skips);
    const reflected = reflectedToday(today);
    // Writing from the passage itself counts as taking the step.
    if (reflected && skips.write?.tappedAt !== today) skips = noteTapped('write', today, skips);

    const firstPlanEntry = input.planPassages[0];
    const planDef = firstPlanEntry ? PLAN_CATALOGUE.find((p) => p.id === firstPlanEntry.planId) : undefined;
    const tomorrow = tomorrowPassage({
      persona: input.persona,
      isNewPath: input.isNewPath,
      plan: planDef && firstPlanEntry
        ? { passages: planDef.passages, totalDays: planDef.totalDays, dayNum: firstPlanEntry.dayNum }
        : null,
      slot: input.firstSlot
        ? { ...input.firstSlot, maxChapter: BOOK_CHAPTERS[input.firstSlot.book] || input.firstSlot.currentChapter }
        : null,
      pathway: input.pathwayData
        ? { days: input.pathwayData.days || [], displayDay: input.pathwayDisplayDay }
        : null,
      dayIndex: input.dayIndex,
    });

    return nextStep({
      persona: input.persona,
      isNewPath: input.isNewPath,
      journeyDay: input.pathwayEnrolled && input.pathwayData ? input.pathwayDisplayDay : null,
      journeyDayDone: input.journeyDayDone,
      passage: input.passage,
      readDoneToday: input.readDoneToday,
      reflectedToday: reflected,
      sundayWindow,
      sermonNotesPublished: input.congregation in published ? published[input.congregation] : null,
      planSetUp: studyPlanSetUp(),
      setupAsks: applicableSetupAsks(input.persona, input.email),
      tomorrow,
      campusName: campus?.name || null,
      today,
      skips,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tick, today, sundayWindow, published, campus?.name,
    input.persona, input.isNewPath, input.passage, input.readDoneToday,
    input.pathwayEnrolled, input.pathwayData, input.pathwayDisplayDay, input.journeyDayDone,
    planKey, slotKey, input.email, input.congregation, input.dayIndex,
  ]);

  // Count a showing once per day for the steps that can rest.
  const quietKey = quietKeyFor(step);
  useEffect(() => {
    if (quietKey && !loading) noteShown(quietKey, today);
  }, [quietKey, today, loading]);

  const onTapped = useCallback(() => {
    if (quietKey) noteTapped(quietKey, today);
  }, [quietKey, today]);

  const label = fillParams(t(step.labelKey), step.params);
  const why = step.whyKey ? fillParams(t(step.whyKey), step.whyParams) : null;
  return { step, loading, label, why, onTapped };
}
