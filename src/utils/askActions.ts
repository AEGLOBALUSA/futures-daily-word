/**
 * Ask does things (DW-P09): what each Bible AI action does once the reader
 * taps its button. The matcher (askIntents.ts) only names the action; nothing
 * here runs without her tap.
 *
 *  - Navigation uses the app's own tab setter (BibleAI's onNavigate, App's
 *    navigateTab) and the screens' own sub-views: Bible AI closes first and the
 *    tab changes once its history entry is consumed (closeThenNavigate).
 *  - A screen that opens on something (Notes → the passage, Campus → Add prayer
 *    with her words, Plans → start a plan) takes a one-time request held in
 *    memory here, never in storage: her prayer text is never written anywhere
 *    until she taps Post it or Keep it private.
 *  - Settings change only through the setters Settings already uses
 *    (setReaderTranslation, saveReminderHour, chooseCampus). No new storage key.
 *  - The care door is a mailto with no body: the reader writes every word.
 */
import type { TabId } from '../components/TabBar';
import { closeThenNavigate } from './closeThenNavigate';
import { hasChosenCongregation, openCongregationChooser } from './congregation';
import { openChoosePath } from './choosePath';
import { saveReminderHour } from './openTimes';
import { isPushSubscribed, pushSupported } from './push';
import { setReaderTranslation } from './readerTranslation';
import { chooseCampus } from './campusGuess';
import { schedulePush } from './cloudSync';
import { PLAN_CATALOGUE } from '../data/plans';
import type { TranslationCode } from './api';

export interface AskNav {
  /** Closes Bible AI (its sub-view). */
  close: () => void;
  /** The app's tab setter. */
  navigate?: (tab: TabId) => void;
}

/** Go to a tab, unless it is already the one on screen (a re-tap resets it). */
function goTo(tab: TabId, nav: AskNav): void {
  let active: string | undefined;
  try { active = document.body?.dataset?.activeTab; } catch { /* no document */ }
  if (active !== tab) nav.navigate?.(tab);
}

// ── One-time requests a screen takes when it shows ─────────────────────────

type Pending = { passage: string | null; prayer: string | null; plan: string | null };
const pending: Pending = { passage: null, prayer: null, plan: null };

export const ASK_PASSAGE_EVENT = 'dw-ask-open-passage';
export const ASK_PRAYER_EVENT = 'dw-ask-add-prayer';
export const ASK_PLAN_EVENT = 'dw-ask-start-plan';

function request(key: keyof Pending, value: string, event: string): void {
  pending[key] = value;
  try { window.dispatchEvent(new Event(event)); } catch { /* no window */ }
}

function take(key: keyof Pending): string | null {
  const v = pending[key];
  pending[key] = null;
  return v;
}

/** Notes takes the passage to open in its study view (once). */
export function takePassageRequest(): string | null { return take('passage'); }
/** Campus: is an Add-prayer request waiting? (Campus switches to its Prayer Wall; the wall takes it.) */
export function hasPrayerRequest(): boolean { return pending.prayer !== null; }
/** The Prayer Wall takes her words for the Add-prayer box (once). */
export function takePrayerRequest(): string | null { return take('prayer'); }
/** Plans takes the plan to start (once). */
export function takePlanRequest(): string | null { return take('plan'); }

// ── Navigation actions ──────────────────────────────────────────────────────

/** "read Psalm 23": Notes opens its study view at that chapter, in her translation. */
export function openPassage(ref: string, nav: AskNav): void {
  closeThenNavigate(nav.close, () => {
    goTo('journal', nav);
    request('passage', ref, ASK_PASSAGE_EVENT);
  });
}

/** "where are Sunday's notes": her church's Sermon Notes, or the chooser first (as Home does). */
export function openSundayNotes(nav: AskNav): void {
  closeThenNavigate(nav.close, () => {
    if (hasChosenCongregation()) goTo('sermon-notes', nav);
    else openCongregationChooser('open');
  });
}

/** "I'm new to all this": the Choose your path sheet (I'm New is its first door). */
export function openImNew(nav: AskNav): void {
  closeThenNavigate(nav.close, () => openChoosePath('home'));
}

/** "please pray for …": the Prayer Wall's Add-prayer box with her own words in it. Posts nothing. */
export function openAddPrayer(text: string, nav: AskNav): void {
  const words = String(text || '').trim();
  if (!words) return;
  closeThenNavigate(nav.close, () => {
    goTo('messages', nav);
    request('prayer', words, ASK_PRAYER_EVENT);
  });
}

/** The plan cards' Start: Plans starts it with its own startPlan (a plan already running is left as it is). */
export function startPlanFromAsk(planId: string, nav: AskNav): void {
  if (!PLAN_CATALOGUE.some((p) => p.id === planId)) return;
  closeThenNavigate(nav.close, () => {
    goTo('plans', nav);
    request('plan', planId, ASK_PLAN_EVENT);
  });
}

/** Turning reminders on is Settings' job (a permission prompt and an email). */
export function openReminderSettings(nav: AskNav): void {
  closeThenNavigate(nav.close, () => goTo('more', nav));
}

// ── Setting changes (each one only after her Yes) ───────────────────────────

/** Use this translation from now on. False (nothing changed) for one not offered in her language. */
export function confirmTranslation(code: TranslationCode, lang: string): boolean {
  return setReaderTranslation(code, lang);
}

/**
 * How "remind me at 6" can be done on this phone:
 *  'move'     reminders are on: Yes moves them to that hour;
 *  'settings' reminders are off: turning them on happens in Settings;
 *  'calendar' this host has no push: Settings adds a calendar reminder.
 */
export type ReminderRoute = 'move' | 'settings' | 'calendar';
export function reminderRoute(): ReminderRoute {
  if (isPushSubscribed()) return 'move';
  return pushSupported() ? 'settings' : 'calendar';
}

/** Yes on "Remind you at 6:00 am each day?": the same save Settings uses. True when the server took it. */
export async function confirmReminder(hour: number): Promise<boolean> {
  if (reminderRoute() !== 'move') return false;
  try { return await saveReminderHour(hour); } catch { return false; }
}

/** Yes on "Set your campus to …?": the same save the campus question uses. */
export function confirmCampus<P extends object>(
  campusId: string,
  deps: { userProfile: P | null | undefined; saveProfile: (p: P) => void; requireEmail: () => void },
): 'saved' | 'needs-email' | 'ignored' {
  return chooseCampus(campusId, deps);
}

// ── Plans ───────────────────────────────────────────────────────────────────

export interface AskPlanCard {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  /** Already running on this phone: Start opens it instead of starting it again. */
  active: boolean;
}

function activePlanIds(): Set<string> {
  try { return new Set(Object.keys(JSON.parse(localStorage.getItem('dw_activeplans') || '{}') || {})); } catch { return new Set(); }
}

/** The plan cards for the matched plans, in her language. */
export function planCards(planIds: string[], lang: string): AskPlanCard[] {
  const active = activePlanIds();
  return planIds
    .map((id) => PLAN_CATALOGUE.find((p) => p.id === id))
    .filter((p): p is (typeof PLAN_CATALOGUE)[number] => !!p)
    .map((p) => ({
      id: p.id,
      title: (lang === 'es' && p.titleEs) || (lang === 'pt' && p.titlePt) || (lang === 'id' && p.titleId) || p.title,
      description: (lang === 'es' && p.descriptionEs) || (lang === 'pt' && p.descriptionPt) || (lang === 'id' && p.descriptionId) || p.description,
      totalDays: p.totalDays,
      active: active.has(p.id),
    }));
}

// ── Prayer: Keep it private ─────────────────────────────────────────────────

/**
 * Keep it private: her words go to her own prayers in Notes (a journal entry
 * of type 'prayer', synced only to her account), never to the wall. Returns
 * false when the phone could not save it.
 */
export function keepPrayerPrivate(text: string, title: string): boolean {
  const body = String(text || '').trim();
  if (!body) return false;
  try {
    const journal = JSON.parse(localStorage.getItem('dw_journal') || '[]');
    const entries = Array.isArray(journal) ? journal : [];
    entries.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toISOString(),
      title: String(title || '').trim() || body.slice(0, 60),
      body,
      tags: ['prayer'],
      type: 'prayer',
    });
    localStorage.setItem('dw_journal', JSON.stringify(entries));
  } catch {
    return false;
  }
  try { const p = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (p.email) schedulePush(p.email); } catch { /* no profile */ }
  try { window.dispatchEvent(new Event('dw-journal-updated')); } catch { /* no window */ }
  return true;
}

// ── Care ────────────────────────────────────────────────────────────────────

/** The pastoral care door: an empty email to the care team. Never a body. */
export const CARE_MAILTO = 'mailto:care@futures.church';

/**
 * The care door's crisis line (988) is a United States number: shown to a
 * reader whose campus is in the US, or, with no campus yet, whose phone is on
 * a US time zone. Elsewhere it would not connect, so it is left out.
 */
export function showsUsCrisisLine(campusId: string | null | undefined, timeZone?: string): boolean {
  const id = String(campusId || '');
  if (id && id !== 'other') return id.startsWith('us-');
  let tz = timeZone;
  if (tz === undefined) {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { tz = ''; }
  }
  return /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Sitka|Nome|Adak|Metlakatla|Yakutat|Menominee|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/Honolulu|US\/.+)$/.test(tz || '');
}
