/**
 * Unified analytics — fires BOTH GA4 and Supabase activity tracking.
 * Import `track` from this module and call it on every meaningful user action.
 */
import { API_BASE } from './api-base';
import { TRACKED_EVENTS } from './tracked-events';
import { getEventPath, getJourneyDay } from './event-context';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    gaSetCampus?: (campus: string) => void;
  }
}

let currentCampus = '';

export function setCampus(campus: string) {
  currentCampus = campus;
  window.gaSetCampus?.(campus);
}

// ── GA4 event ──
export function gaEvent(eventName: string, params: Record<string, string | number> = {}) {
  if (!window.gtag) return;
  window.gtag('event', eventName, {
    ...params,
    campus: params.campus || currentCampus || 'none',
  });
}

// ── Supabase activity event (server-side storage) ──

export type EventContext = { path?: string | null; journeyDay?: number | null };

/** Pure builder: shapes the event payload trackActivity POSTs, path/journey_day attached when known. */
export function buildActivityEvent(eventType: string, detail: string = '', ctx: EventContext = {}) {
  const event: { type: string; detail: string; path?: string; journey_day?: number } = {
    type: eventType,
    detail: detail.slice(0, 500),
  };
  if (ctx.path != null) event.path = ctx.path;
  if (ctx.journeyDay != null) event.journey_day = ctx.journeyDay;
  return event;
}

export async function trackActivity(
  email: string,
  eventType: string,
  detail: string = '',
  ctx: EventContext = {}
): Promise<void> {
  if (!TRACKED_EVENTS.includes(eventType as (typeof TRACKED_EVENTS)[number])) {
    if (import.meta.env.DEV) console.warn('[analytics] event not in TRACKED_EVENTS, dropped:', eventType);
    return;
  }
  try {
    const { authHeaders, setSessionToken } = await import('./sessionToken');
    const resp = await fetch(`${API_BASE}/api/track-activity`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, events: [buildActivityEvent(eventType, detail, ctx)] }),
    });
    if (resp.ok) {
      try {
        const data = await resp.json();
        if (data.sessionToken) setSessionToken(data.sessionToken);
      } catch { /* response parsing optional */ }
    }
  } catch {
    // Non-critical, silently fail
  }
}

/**
 * Unified track() — fires GA4 + Supabase in one call.
 * Pulls email automatically from localStorage.
 * Call this for every meaningful user action.
 */
export function track(eventName: string, detail: string = '', extraParams: Record<string, string | number> = {}) {
  const path = getEventPath();
  const journeyDay = getJourneyDay();

  // GA4 — path/journey_day give GA a persona dimension too
  const gaParams: Record<string, string | number> = { ...extraParams, detail };
  if (path != null) gaParams.path = path;
  if (journeyDay != null) gaParams.journey_day = journeyDay;
  gaEvent(eventName, gaParams);

  // Supabase activity log (non-blocking)
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || '{}');
    if (profile.email) {
      trackActivity(profile.email, eventName, detail, { path, journeyDay });
    }
  } catch {
    // No profile, skip Supabase tracking
  }
}
