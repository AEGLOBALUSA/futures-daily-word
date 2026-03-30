-- Required Supabase Indexes for futuresdailyword.com
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- These indexes support the query patterns used by the Netlify functions.
-- Without them, queries fall back to sequential scans as the tables grow.

-- ═══════════════════════════════════════════════════════════════
-- profiles table
-- ═══════════════════════════════════════════════════════════════

-- Primary lookup: email is the primary key / unique constraint (should already exist)
-- Used by: user-profile.js, user-sync.js, auth.js, pco-sync.js
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Analytics: "users active today/this week/this month"
-- Used by: analytics-dashboard.js lines 60-62
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles (last_active_at);

-- Analytics: "new registrations this month"
-- Used by: analytics-dashboard.js line 68
CREATE INDEX IF NOT EXISTS idx_profiles_registered_at ON profiles (registered_at);

-- Auth: token-based authentication lookup
-- Used by: auth.js line 66-69 — contains() on jsonb array
CREATE INDEX IF NOT EXISTS idx_profiles_session_token_hashes ON profiles USING gin (session_token_hashes);

-- ═══════════════════════════════════════════════════════════════
-- activity_events table
-- ═══════════════════════════════════════════════════════════════

-- Analytics: "events this week/month" range scans
-- Used by: analytics-dashboard.js lines 63-64, 71-72
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON activity_events (created_at);

-- Export: "activity log for a specific user"
-- Used by: export-profiles.js lines 91-94
CREATE INDEX IF NOT EXISTS idx_activity_events_email_created ON activity_events (email, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- prayers table
-- ═══════════════════════════════════════════════════════════════

-- Prayer wall: "most recent prayers"
-- Used by: prayer-wall.js line 86
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers (created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- push_subscriptions table
-- ═══════════════════════════════════════════════════════════════

-- Push: lookup by endpoint hash
-- Used by: push-subscribe.js lines 61, 74, 90
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_hash ON push_subscriptions (endpoint_hash);

-- ═══════════════════════════════════════════════════════════════
-- campus_content table
-- ═══════════════════════════════════════════════════════════════

-- Admin: delete by campus + id
-- Used by: pastor-admin.js line 100
CREATE INDEX IF NOT EXISTS idx_campus_content_campus ON campus_content (campus);
