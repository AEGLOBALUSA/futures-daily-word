/**
 * Prayer care on /staff: the client side of intake.js.
 *   B09-12  `prayers_week` (held posts + the week's list), `prayer_decide`
 *   B09-13  `prayer_lines` ("Needs you"), `prayer_write_link`,
 *           `prayer_line_done`, `prayer_waiting_mute`
 *
 * The server decides who sees what (a campus pastor their own confirmed
 * campus; hub and admin every campus for the week's list, and the campuses
 * with no confirmed pastor for "Needs you"; media and an unconfirmed campus
 * pastor 403) and strips the name from anonymous requests. Neither list ever
 * carries an address: **Write to {first name}** asks `prayer_write_link` for
 * one request's address-only `mailto:`. The pastor's reply is personal, so the
 * app opens an EMPTY email and never writes the words (no subject, no body, no
 * `?` at all). Both lists close through `prayer_line_done`, so they never
 * disagree.
 */
import { intake } from './api';

export type HeldReason = 'contact' | 'link' | 'language';

/** A post waiting for a look: the text and why it waits. Never a name or email. */
export type HeldPrayer = {
  id: string;
  campusId: string;
  campusName: string;
  text: string;
  createdAt: string;
  daysAgo: number;
  heldReason: HeldReason | null;
};

/** One of "Prayer requests this week". Anonymous rows carry no firstName and no email. */
export type WeekPrayer = {
  id: string;
  campusId: string;
  campusName: string;
  text: string;
  prayed: number;
  createdAt: string;
  daysAgo: number;
  status: 'shown' | 'private';
  anonymous: boolean;
  firstName?: string;
  /** A name and an address are on file: Write to {first name} can open an email. */
  canWrite: boolean;
  /** Closed by a pastor (B09-13): Written to | Prayed for. */
  done: PrayerDone | null;
};

export type PrayerDone = 'wrote' | 'prayed';

/** One line on /staff "Needs you" (B09-13): the first name (null when anonymous) and the ask. Never an address. */
export type PrayerLine = {
  id: string;
  firstName: string | null;
  campusId: string;
  campusName: string;
  text: string;
  createdAt: string;
  waitingDays: number;
  canWrite: boolean;
};

export type PrayerLines = { lines: PrayerLine[]; waitingMuted: boolean };

export type PrayerCareScope = { all: true } | { all: false; campusId: string; campusName: string };

export type PrayerCare = { scope: PrayerCareScope; held: HeldPrayer[]; week: WeekPrayer[] };

export type PrayerDecision = 'show' | 'private';

/** Only these roles get the prayer cards; the server is the gate either way. */
export function canSeePrayerCare(staff: { role: string; isAdmin?: boolean }): boolean {
  return !!staff.isAdmin || staff.role === 'admin' || staff.role === 'hub' || staff.role === 'campus';
}

/**
 * The week's prayer care, or `null` when this person may not see it (403):
 * the cards are then simply not shown. Any other failure throws, so the screen
 * can say it did not load, beside a way to try again.
 */
export async function loadPrayerCare(): Promise<PrayerCare | null> {
  try {
    const data = await intake<PrayerCare>('prayers_week');
    return {
      scope: data.scope,
      held: Array.isArray(data.held) ? data.held : [],
      week: Array.isArray(data.week) ? data.week : [],
    };
  } catch (err) {
    if ((err as { status?: number })?.status === 403) return null;
    throw err;
  }
}

/**
 * Show it on the wall | Keep it private. Resolves to the new status, or to
 * `'decided'` when someone else decided it first (409): the screen then simply
 * reloads. Any other failure throws with the server's words in `message`.
 */
export async function decidePrayer(id: string, decision: PrayerDecision): Promise<'shown' | 'private' | 'decided'> {
  try {
    const out = await intake<{ ok: boolean; status: 'shown' | 'private' }>('prayer_decide', { id, decision });
    return out.status;
  } catch (err) {
    if ((err as { status?: number })?.status === 409) return 'decided';
    throw err;
  }
}

/**
 * The server's **Write to {first name}** link, checked once more on the phone:
 * `mailto:` plus one encoded address and nothing else (no `?`, no `&`, no
 * subject, no body). '' when it is anything else, so nothing broken opens.
 */
export function checkedMailto(href: unknown): string {
  if (typeof href !== 'string' || !/^mailto:[^?&#\s]+$/.test(href)) return '';
  let address = '';
  try { address = decodeURIComponent(href.slice('mailto:'.length)); } catch { return ''; }
  return /^[^\s@?&#/\\]+@[^\s@?&#/\\]+\.[^\s@?&#/\\]{2,}$/.test(address) ? href : '';
}

/**
 * "Needs you": this person's open lines, oldest first, and whether they muted
 * the waiting email; `null` when they may not see prayer care (403). Any other
 * failure throws, so the screen can say it did not load.
 */
export async function loadPrayerLines(): Promise<PrayerLines | null> {
  try {
    const data = await intake<PrayerLines>('prayer_lines');
    return { lines: Array.isArray(data.lines) ? data.lines : [], waitingMuted: data.waitingMuted === true };
  } catch (err) {
    if ((err as { status?: number })?.status === 403) return null;
    throw err;
  }
}

/**
 * The address-only `mailto:` for one request, from the server (after its scope
 * check). Throws when the server refuses or the link is not address-only, so
 * the screen can say "Couldn't open the email. Try again." beside the button.
 */
export async function prayerWriteLink(id: string): Promise<string> {
  const out = await intake<{ href?: string }>('prayer_write_link', { id });
  const href = checkedMailto(out.href);
  if (!href) throw Object.assign(new Error('No address to write to'), { status: 400 });
  return href;
}

/**
 * I wrote to {first name} | I prayed for this. Closes the request for both
 * lists. `already` is true when a colleague closed it first (it is closed
 * either way). Any failure throws with the server's words in `message`.
 */
export async function closePrayerLine(id: string, kind: PrayerDone): Promise<{ kind: PrayerDone; already: boolean }> {
  const out = await intake<{ ok: boolean; kind: PrayerDone; already?: boolean }>('prayer_line_done', { id, kind });
  return { kind: out.kind === 'wrote' || out.kind === 'prayed' ? out.kind : kind, already: out.already === true };
}

/** Stop the waiting email (true) or start it again (false). Resolves to the saved setting. */
export async function setWaitingMuted(muted: boolean): Promise<boolean> {
  const out = await intake<{ ok: boolean; waitingMuted: boolean }>('prayer_waiting_mute', { muted });
  return out.waitingMuted === true;
}
