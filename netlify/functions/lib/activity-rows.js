// Builds insertable activity_events rows from client-submitted events.
// event_type is gated against TRACKED_EVENTS below — the same list the client
// enforces in src/utils/tracked-events.ts — because the origin check alone is
// not a name gate for a non-browser caller (curl can set Origin). This list
// MUST match src/utils/tracked-events.ts exactly (same convention as
// netlify/functions/lib/congregations.js mirroring src/data/congregations.ts).
// path is gated against the five real personas in src/utils/persona-config.ts.

const NAME_RE = /^[a-z][a-z0-9_]{2,47}$/;

const TRACKED_EVENTS = new Set([
  'daily_reading', 'translation_switch', 'audio_play', 'highlight_add',
  'journal_save', 'prayer_submit', 'prayer_agree', 'chat_message',
  'book_chapter', 'plan_start', 'plan_complete', 'pathway_complete',
  'campus_switched', 'profile_update', 'push_subscribe', 'share',
  'app_open', 'page_view', 'persona_change', 'language_change',
  'pwa_install', 'pwa_install_prompt_shown', 'pwa_ios_hint',
  'read_day',
  'journey_day_open', 'journey_day_complete',
  'pastor_prompt',
  'comfort_opened', 'comfort_listen_started', 'comfort_listen_completed',
  'comfort_passage_read', 'comfort_prayer_opened', 'comfort_care_tapped',
  'comfort_line_shown', 'comfort_care_recipient_missing', 'comfort_safety_shown',
  'comfort_safety_dismissed', 'comfort_steady_saved', 'comfort_steady_opened',
  'comfort_return_next_day', 'comfort_daily_inferred', 'comfort_offline_render',
  'comfort_tap', 'comfort_tap_from_journey',
  'paper_mode', 'catchup_shown', 'catchup_read', 'catchup_rebase',
  'plan_finished', 'plan_started_after_finish', 'comfort_peek',
  'reminder_set', 'push_unsubscribe', 'offline_read', 'greek_hebrew',
  'ai_prompt',
  'congregation_sheet_open', 'congregation_chosen', 'path_sheet_open',
  'path_chosen', 'pastor_sign_in', 'pastor_sign_out', 'new_to_faith_start',
  'house_ad_books', 'house_ad_college', 'house_ad_selah',
  'plan_day_manual_nav', 'plan_day_calendar_rollover', 'plans_search_row',
  // I'm New close + handoff, 17 Sep 2026
  'journey_close_answered', 'journey_handoff_open', 'journey_handoff_dismiss',
]);

// The five personas in src/utils/persona-config.ts (ALL_PERSONAS).
const PERSONAS = new Set(['new_to_faith', 'congregation', 'deeper_study', 'pastor_leader', 'comfort']);

function buildActivityRows(cleanEmail, events) {
  const rows = [];
  for (const evt of events) {
    if (!evt || typeof evt.type !== 'string' || !NAME_RE.test(evt.type)) continue;
    if (!TRACKED_EVENTS.has(evt.type)) continue;

    const detail = typeof evt.detail === 'string' ? evt.detail.slice(0, 500) : '';
    const path = typeof evt.path === 'string' && PERSONAS.has(evt.path) ? evt.path : null;
    const journeyDay = Number.isInteger(evt.journey_day) && evt.journey_day >= 1 && evt.journey_day <= 1000
      ? evt.journey_day
      : null;

    rows.push({
      email: cleanEmail,
      event_type: evt.type,
      detail,
      path,
      journey_day: journeyDay
    });
  }
  return rows;
}

module.exports = { buildActivityRows };
