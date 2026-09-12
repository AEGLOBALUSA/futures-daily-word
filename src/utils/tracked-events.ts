/**
 * Single allowlist for every event name the app is permitted to send to
 * Supabase activity tracking (trackActivity). Names not in this list are
 * dropped silently in prod, with a dev-only console warning.
 */
export const TRACKED_EVENTS = [
  // existing names, moved verbatim from analytics.ts:31-38
  'daily_reading', 'translation_switch', 'audio_play', 'highlight_add',
  'journal_save', 'prayer_submit', 'prayer_agree', 'chat_message',
  'book_chapter', 'plan_start', 'plan_complete', 'pathway_complete',
  'campus_switched', 'profile_update', 'push_subscribe', 'share',
  'app_open', 'page_view', 'persona_change', 'language_change',
  'pwa_install', 'pwa_install_prompt_shown', 'pwa_ios_hint',

  // dw_read_days — wave 0 (this wave)
  'read_day',

  // new_to_faith.md:469-472 — Day N journey surface
  'journey_day_open', 'journey_day_complete',

  // No call site in src emits any of the names below yet (spec'd ahead of
  // build, per the doc refs) — this is an allowlist, not a list of events
  // that currently fire.

  // pastor_leader.md:684
  'pastor_prompt',

  // comfort.md:555-565 — comfort persona event set
  'comfort_opened', 'comfort_listen_started', 'comfort_listen_completed',
  'comfort_passage_read', 'comfort_prayer_opened', 'comfort_care_tapped',
  'comfort_line_shown', 'comfort_care_recipient_missing', 'comfort_safety_shown',
  'comfort_safety_dismissed', 'comfort_steady_saved', 'comfort_steady_opened',
  'comfort_return_next_day', 'comfort_daily_inferred', 'comfort_offline_render',
  'comfort_tap', 'comfort_tap_from_journey',

  // deeper_study.md:675-690 — deeper_study event set
  'paper_mode', 'catchup_shown', 'catchup_read', 'catchup_rebase',
  'plan_finished', 'plan_started_after_finish', 'comfort_peek',
  'reminder_set', 'push_unsubscribe', 'offline_read', 'greek_hebrew',
  'ai_prompt',

  // verified track('...') call sites missing from the allowlist (wave 0 repairs)
  'congregation_sheet_open', 'congregation_chosen', 'path_sheet_open',
  'path_chosen', 'pastor_sign_in', 'pastor_sign_out', 'new_to_faith_start',
  'house_ad_books', 'house_ad_college', 'house_ad_selah',
  'plan_day_manual_nav', 'plan_day_calendar_rollover', 'plans_search_row',
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];
