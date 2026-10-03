/**
 * Wall-clock time in a named zone, with Intl only (no library).
 *
 * The same pattern as netlify/functions/lib/sermon-window.js (the functions
 * folder is CommonJS, so the reader app keeps its own copy). Every function
 * takes the instant, so tests can run at any moment. Never add hours to get a
 * local time: daylight saving moves on different Sundays in different places
 * (South Australia on Sun 4 Oct 2026, the USA on Sun 1 Nov 2026).
 */

export interface ZonedParts {
  year: number;
  month: number;   // 1-12
  day: number;     // 1-31
  hour: number;    // 0-23
  minute: number;  // 0-59
  weekday: number; // 0 = Sunday … 6 = Saturday
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** True when Intl knows the zone name (a typo in the campus list must not break Home). */
export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** This device's own zone, or UTC when the browser will not say. */
export function deviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The wall-clock parts of an instant in a zone (an unknown zone reads as the device's). */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const tz = isValidTimeZone(timeZone) ? timeZone : deviceTimeZone();
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  const hour = Number(out.hour);
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(out.minute),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

/** The local calendar date (YYYY-MM-DD) of an instant in a zone. */
export function zonedDate(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** "HH:MM" → minutes after midnight; anything else → null. */
export function parseHHMM(value: string | null | undefined): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** A YYYY-MM-DD date moved by whole days (calendar arithmetic, no zone involved). */
export function addDays(date: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}
