/**
 * usePushReadingState (MOS-to-8 build B09-17): Home tells this device's own
 * reminder what she is reading, and notes when she opens the app.
 *
 * On every open (Home mounting, the app coming back to the front) it records
 * the first open of the day on this device (openTimes.ts, never sent) and
 * reports the open with the reading state; a changed state (Mark as read, a
 * new day) is reported on its own. Reports wait two seconds for Home to settle
 * and go through syncReadingState, which sends nothing without reminders on
 * and holds the same state for ten minutes. No name, email or account id.
 */
import { useEffect, useMemo, useRef } from 'react';
import { recordOpen } from './openTimes';
import { readingStateOf, syncReadingState } from './pushReadingState';
import { tomorrowPassage } from './homeToday';
import { getReadDays } from './readDays';
import { getLang } from './i18n';
import { PLAN_CATALOGUE } from '../data/plans';
import { BOOK_CHAPTERS } from '../data/bible-books';
import type { HomeNextStepInput } from './useHomeNextStep';

/** How long Home has to settle (the passage and journey arrive after mount). */
export const SETTLE_MS = 2000;

const STATE_EVENTS = ['dw-read-day', 'dw-reading-completed', 'dw-lang-changed'];

function latestReadDay(): string | null {
  const days = getReadDays();
  return days.length ? [...days].sort().slice(-1)[0] : null;
}

export function usePushReadingState(input: HomeNextStepInput, today: string): void {
  const firstPlan = input.planPassages[0] || null;
  const planKey = firstPlan ? `${firstPlan.planId}:${firstPlan.dayNum}` : '';
  const slotKey = input.firstSlot ? `${input.firstSlot.book}:${input.firstSlot.currentChapter}` : '';

  const tomorrow = useMemo(() => {
    const def = firstPlan ? PLAN_CATALOGUE.find((p) => p.id === firstPlan.planId) : undefined;
    return tomorrowPassage({
      persona: input.persona,
      isNewPath: input.isNewPath,
      plan: def && firstPlan ? { passages: def.passages, totalDays: def.totalDays, dayNum: firstPlan.dayNum } : null,
      slot: input.firstSlot
        ? { ...input.firstSlot, maxChapter: BOOK_CHAPTERS[input.firstSlot.book] || input.firstSlot.currentChapter }
        : null,
      pathway: input.pathwayData ? { days: input.pathwayData.days || [], displayDay: input.pathwayDisplayDay } : null,
      dayIndex: input.dayIndex,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.persona, input.isNewPath, planKey, slotKey, input.pathwayData, input.pathwayDisplayDay, input.dayIndex]);

  const doneToday = input.readDoneToday || (input.isNewPath && input.journeyDayDone);

  // The latest inputs, read when the settle timer fires.
  const latest = useRef({ input, today, tomorrow, doneToday });
  latest.current = { input, today, tomorrow, doneToday };
  const openPending = useRef(false);
  const timer = useRef<number | null>(null);

  const schedule = useRef(() => {});
  schedule.current = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const { input: i, today: d, tomorrow: tm, doneToday: done } = latest.current;
      const plan = i.planPassages[0] ? { planId: i.planPassages[0].planId, dayNum: i.planPassages[0].dayNum } : null;
      const state = readingStateOf({
        persona: i.persona,
        isNewPath: i.isNewPath,
        passage: i.passage,
        tomorrow: tm,
        doneToday: done,
        pathwayEnrolled: i.pathwayEnrolled,
        pathwayDisplayDay: i.pathwayDisplayDay,
        plan,
        today: d,
        lastReadDate: latestReadDay(),
        lang: getLang(),
      });
      const opened = openPending.current;
      openPending.current = false;
      void syncReadingState(state, opened);
    }, SETTLE_MS);
  };

  // Opens: Home mounting, and the app coming back to the front.
  useEffect(() => {
    const onOpen = () => {
      recordOpen();
      openPending.current = true;
      schedule.current();
    };
    onOpen();
    const onVisible = () => { if (document.visibilityState === 'visible') onOpen(); };
    const onChange = () => schedule.current();
    document.addEventListener('visibilitychange', onVisible);
    STATE_EVENTS.forEach((e) => window.addEventListener(e, onChange));
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      STATE_EVENTS.forEach((e) => window.removeEventListener(e, onChange));
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // A changed reading state (Mark as read, a new day, the passage arriving).
  useEffect(() => {
    schedule.current();
  }, [today, doneToday, input.passage, tomorrow, planKey, input.pathwayDisplayDay, input.persona, input.pathwayEnrolled]);
}
