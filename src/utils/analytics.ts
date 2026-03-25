/**
 * Unified analytics — fires BOTH GA4 and Supabase activity tracking.
 * Import `track` from this module and call it on every meaningful user action.
 */

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
const TRACKED_EVENTS = [
  'daily_reading', 'translation_switch', 'audio_play', 'highlight_add',
  'journal_save', 'prayer_submit', 'prayer_agree', 'chat_message',
  'book_chapter', 'plan_start', 'plan_complete', 'pathway_complete',
  'campus_switched', 'profile_update', 'push_subscribe', 'share',
  'app_open', 'page_view', 'persona_change', 'language_change',
];

export async function trackActivity(
  email: string,
  eventType: string,
  detail: string = ''
): Promise<void> {
  if (!TRACKED_EVENTS.includes(eventType)) return;
  try {
    const { authHeaders, setSessionToken } = await import('./sessionToken');
    const resp = await fetch('/api/track-activity', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, events: [{ type: eventType, detail: detail.slice(0, 500) }] }),
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
  // GA4
  gaEvent(eventName, { ...extraParams, detail });

  // Supabase activity log (non-blocking)
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || '{}');
    if (profile.email) {
      trackActivity(profile.email, eventName, detail);
    }
  } catch {
    // No profile, skip Supabase tracking
  }
}
