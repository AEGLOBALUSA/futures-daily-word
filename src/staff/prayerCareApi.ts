/**
 * Prayer care on /staff (MOS-to-8 build B09-12): the client side of intake.js
 * `prayers_week` and `prayer_decide`.
 *
 * The server decides who sees what (a campus pastor their own confirmed
 * campus; hub and admin every campus; media and an unconfirmed campus pastor
 * 403) and strips the name and email from anonymous requests. This file only
 * calls it and builds the address-only `mailto:` for **Write to {first name}**:
 * the pastor's reply is personal, so the app opens an EMPTY email and never
 * writes the words (no subject, no body, no `?` at all).
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
  email?: string;
};

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
 * The address-only link for **Write to {first name}**: `mailto:` plus the
 * encoded address and nothing else. '' when the address is unusable, so the
 * button is not shown rather than opening a broken email.
 */
export function mailtoFor(email: string | undefined | null): string {
  const e = typeof email === 'string' ? email.trim() : '';
  if (!/^[^\s@?&#/\\]+@[^\s@?&#/\\]+\.[^\s@?&#/\\]{2,}$/.test(e)) return '';
  return `mailto:${encodeURIComponent(e)}`;
}
