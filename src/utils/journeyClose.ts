/**
 * Close the Day — pure helpers for the sage "day closes" card and the
 * post-journey handoff card on the new_to_faith Day N surface.
 *
 * The three close questions ride in the SAME per-day record the two lesson
 * questions already use (dw_pathway_qa_<day>, see PathwayAnswer.tsx), under
 * string slots 'c0'..'c2' — the lesson questions own numeric slots 0 and 1,
 * so a numeric slot here would silently overwrite a reader's lesson answer.
 */
import { syncMisc } from './cloudSync';

export const CLOSE_QUESTION_KEYS = ['j_close_q1', 'j_close_q2', 'j_close_q3'] as const;

/** Deterministic 3-way rotation of the identity line, keyed off the day number. */
export function identityLineKey(day: number): string {
  return 'j_close_identity_' + (((day - 1) % 3 + 3) % 3 + 1);
}

function closeStorageKey(day: number): string {
  return 'dw_pathway_qa_' + day;
}

function loadRecord(day: number): Record<string, string> {
  try {
    const raw = localStorage.getItem(closeStorageKey(day));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Always returns 3 slots ('' when absent), tolerant of a corrupt record. */
export function loadCloseAnswers(day: number): string[] {
  const rec = loadRecord(day);
  return [0, 1, 2].map(i => (typeof rec['c' + i] === 'string' ? rec['c' + i] : ''));
}

/** Re-reads the record at call time and touches only its own slot — never
 *  rebuilds the record, so a concurrent lesson-question write (slots 0/1)
 *  is preserved. */
export function saveCloseAnswer(day: number, i: number, text: string): void {
  const key = closeStorageKey(day);
  const all = { ...loadRecord(day), ['c' + i]: text };
  const json = JSON.stringify(all);
  // Guarded: a bare setItem threw out of the textarea's onChange when storage
  // was full, and syncMisc (which has its own guard) was never reached.
  try { localStorage.setItem(key, json); } catch { /* quota */ }
  syncMisc(key, json);
}

export const HANDOFF_KEY = 'dw_journey_handoff';
export type HandoffStage = 'd14' | 'd40';

/** d40 (finished) takes priority over d14 (partway); null before day 14. */
export function handoffStage(completedCount: number, totalDays: number): HandoffStage | null {
  if (totalDays > 0 && completedCount >= totalDays) return 'd40';
  if (completedCount >= 14) return 'd14';
  return null;
}

export function readHandoff(): Partial<Record<HandoffStage, 'dismissed' | 'opened'>> {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** d14 is a one-time nudge — it shows only while its slot is unset (opened or
 *  dismissed both retire it). d40 is the durable "you're done" next step —
 *  it keeps showing after 'opened' and only retires on 'dismissed'. */
export function shouldShowHandoff(stage: HandoffStage): boolean {
  const rec = readHandoff();
  if (stage === 'd14') return rec.d14 === undefined;
  return rec.d40 !== 'dismissed';
}

export function markHandoff(stage: HandoffStage, value: 'dismissed' | 'opened'): void {
  const rec = { ...readHandoff(), [stage]: value };
  const json = JSON.stringify(rec);
  try { localStorage.setItem(HANDOFF_KEY, json); } catch { /* quota */ }
  syncMisc(HANDOFF_KEY, json);
}
