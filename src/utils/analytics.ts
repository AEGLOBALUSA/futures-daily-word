/**
 * GA4 analytics helper with campus auto-injection.
 * Activity tracking via /api/track-activity.
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

export function gaEvent(eventName: string, params: Record<string, string | number> = {}) {
  if (!window.gtag) return;
  window.gtag('event', eventName, {
    ...params,
    campus: params.campus || currentCampus || 'none',
  });
}

const TRACKED_EVENTS = [
  'daily_reading', 'translation_switch', 'audio_play', 'highlight_add',
  'journal_save', 'prayer_submit', 'prayer_agree', 'chat_message',
  'book_chapter', 'plan_start', 'plan_complete', 'pathway_complete',
  'campus_switched', 'profile_update', 'push_subscribe', 'share',
];

export async function trackActivity(
  email: string,
  eventType: string,
  detail: string = ''
): Promise<void> {
  if (!TRACKED_EVENTS.includes(eventType)) return;
  try {
    await fetch('/api/track-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, event_type: eventType, detail: detail.slice(0, 500) }),
    });
  } catch {
    // Non-critical, silently fail
  }
}
