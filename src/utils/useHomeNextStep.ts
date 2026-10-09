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
 * Sermon Notes: on a Sunday morning it asks whether this week's notes are
 * published for this congregation (the same feed the notes screen reads).
 * Until it knows, the notes count as published, so a slow or failed feed never
 * takes Sunday's notes off an I'm New reader's Home. A failure stays unknown,
 * and while the answer is unknown or "none yet" it asks again on the minute
 * tick and on focus, at most every five minutes, so notes approved mid-morning
 * arrive with the app open. A "yes" is kept for the day.
 *
 * Nothing here sends anything, syncs anything new or reaches a model.
 * dw_next_skips stays on this device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nextStep, readSkips, noteShown, noteQuiet, noteTapped, quietKeyFor, fillParams, type NextAction, type NextStep, type QuietableKind } from './nextStep';
import { applicableSetupAsks } from './setupAsks';
import { isSundayWindow, readerSundayUntil, readerTimeZone } from './sunday';
import { tomorrowPassage, reflectedToday, localToday } from './homeToday';
import { fetchSermonNotesPublished } from './currentSermon';
import { t, getLang } from './i18n';
import { currentReminderOffer, noteOfferShown, formatReminderTime, PUSH_HOUR_EVENT } from './openTimes';
import { usePushReadingState } from './usePushReadingState';
import { readMyPrayers, refreshMyPrayers, prayedCard, noteCardShown, MY_PRAYERS_EVENT } from './myPrayers';
import { useTabShowing } from './useTabShowing';
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
  /** Today's passage is open in the hero right now. */
  passageOpen?: boolean;
  /** I'm New: the journey is the photo hero, with its own Read button. */
  journeyInHero?: boolean;
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
  /** A second, quiet answer beside the main button (the reminder offer's Keep), or null. */
  alt?: { label: string; action: NextAction } | null;
}

/** Fire after a set-up ask is answered or dismissed so Home's one step moves on at once. */
export const NEXT_REFRESH_EVENT = 'dw-next-refresh';

const REFRESH_EVENTS = [
  'dw-reading-completed',
  'dw-journal-updated',
  'dw-streak-recorded',
  'dw-push-onboarded',
  'pwa-installed',
  'dw-lang-changed',
  // A set-up ask was answered or dismissed: show the next thing at once.
  NEXT_REFRESH_EVENT,
  // B09-17: the reminder hour changed (Settings or the offer): the offer's times follow.
  PUSH_HOUR_EVENT,
  // B09-11: a prayer count arrived, or she posted a request.
  MY_PRAYERS_EVENT,
  'focus',
];
const QUIETABLE: QuietableKind[] = ['write', 'install', 'email', 'upgrade'];
/** While the notes are unknown or not up yet, ask again at most this often. */
export const NOTES_RECHECK_MS = 5 * 60_000;

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

  const today = localToday();

  // B09-17: this device's reminder learns what she is reading (no identity).
  usePushReadingState(input, today);
  // B09-17: the one-time "Remind you then?" offer (openTimes.ts, this device only).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const offer = useMemo(() => currentReminderOffer(input.persona, today), [tick, today, input.persona]);

  // This week's notes for this congregation, only on a Sunday morning. Keyed by
  // the day so a Home kept alive into next Sunday asks afresh. true is kept;
  // false (none yet) and null (unknown) are asked again on the tick or focus,
  // at most every NOTES_RECHECK_MS.
  const notesKey = `${input.congregation}|${today}`;
  const [published, setPublished] = useState<Record<string, boolean | null>>({});
  const notesAskedAt = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!sundayWindow || published[notesKey] === true) return;
    const last = notesAskedAt.current[notesKey];
    if (last !== undefined && Date.now() - last < NOTES_RECHECK_MS) return;
    notesAskedAt.current[notesKey] = Date.now();
    fetchSermonNotesPublished(input.congregation)
      .then((v) => setPublished((p) => (p[notesKey] === true ? p : { ...p, [notesKey]: v })))
      .catch(() => { /* unknown stays unknown: the notes keep their place */ });
  }, [sundayWindow, notesKey, input.congregation, published, tick]);

  // B09-11: counts for the requests she posted from this phone. The store asks
  // the server at most once an hour (the tick and focus only re-read it), and
  // fires MY_PRAYERS_EVENT when something changed.
  useEffect(() => {
    void refreshMyPrayers();
  }, [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prayed = useMemo(() => prayedCard(readMyPrayers(), today), [tick, today]);

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
      passageOpen: !!input.passageOpen,
      journeyInHero: !!input.journeyInHero,
      reflectedToday: reflected,
      sundayWindow,
      sermonNotesPublished: published[notesKey] ?? null,
      planSetUp: studyPlanSetUp(),
      setupAsks: applicableSetupAsks(input.persona, input.email).filter(ask => ask !== 'install'),
      tomorrow,
      campusName: campus?.name || null,
      today,
      skips,
      reminderOffer: offer
        ? { time: formatReminderTime(offer.hour, getLang()), keepTime: formatReminderTime(offer.current, getLang()) }
        : null,
      prayed,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tick, today, sundayWindow, published, notesKey, campus?.name, offer?.hour, offer?.current, prayed?.id, prayed?.count,
    input.persona, input.isNewPath, input.passage, input.readDoneToday, input.passageOpen, input.journeyInHero,
    input.pathwayEnrolled, input.pathwayData, input.pathwayDisplayDay, input.journeyDayDone,
    planKey, slotKey, input.email, input.congregation, input.dayIndex,
  ]);

  // Count a showing once per day for the steps that can rest.
  const quietKey = quietKeyFor(step);
  useEffect(() => {
    if (quietKey && !loading) noteShown(quietKey, today);
  }, [quietKey, today, loading]);

  // B09-17: the reminder offer is shown on one day only.
  const offerShown = step.kind === 'reminder_offer' && !loading;
  useEffect(() => {
    if (offerShown) noteOfferShown(today);
  }, [offerShown, today]);
  // B09-11: the count she has now seen. The card stays for the rest of the day
  // and comes back only when the number grows. Home stays mounted behind other
  // tabs, so it counts as seen only while Home is on screen.
  const homeShowing = useTabShowing('home');
  const prayedId = step.kind === 'prayed' && prayed ? prayed.id : null;
  const prayedCount = step.kind === 'prayed' && prayed ? prayed.count : 0;
  useEffect(() => {
    if (prayedId && !loading && homeShowing) noteCardShown({ id: prayedId, count: prayedCount }, today);
  }, [prayedId, prayedCount, today, loading, homeShowing]);

  const onTapped = useCallback(() => {
    if (quietKey) noteTapped(quietKey, today);
  }, [quietKey, today]);

  const label = fillParams(t(step.labelKey), step.params);
  const why = step.whyKey ? fillParams(t(step.whyKey), step.whyParams) : null;
  const alt = step.alt ? { label: fillParams(t(step.alt.labelKey), step.alt.params), action: step.alt.action } : null;
  return { step, loading, label, why, onTapped, alt };
}
