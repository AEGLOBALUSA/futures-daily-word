-- ============================================================
-- Futures Daily Word — Poll System Schema
-- Run this in Supabase SQL Editor (one-time setup)
-- ============================================================

-- 1. Create the poll_responses table
CREATE TABLE IF NOT EXISTS poll_responses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_version  TEXT NOT NULL DEFAULT 'v1',
  campus        TEXT,
  home_clutter  TEXT NOT NULL,
  home_priority TEXT[] NOT NULL DEFAULT '{}',
  submitted_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_poll_version ON poll_responses (poll_version);
CREATE INDEX IF NOT EXISTS idx_poll_campus ON poll_responses (campus);
CREATE INDEX IF NOT EXISTS idx_poll_submitted ON poll_responses (submitted_at DESC);

-- 3. Row Level Security
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous poll submission)
CREATE POLICY "Anyone can submit poll"
  ON poll_responses FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read (admin dashboard)
CREATE POLICY "Authenticated users can read poll"
  ON poll_responses FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Summary views (power the admin dashboard)

-- Q1: Home screen clutter breakdown
CREATE OR REPLACE VIEW poll_clutter_summary AS
SELECT
  poll_version,
  home_clutter,
  COUNT(*) AS votes,
  ROUND(COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY poll_version), 0) * 100, 1) AS pct
FROM poll_responses
GROUP BY poll_version, home_clutter
ORDER BY poll_version, votes DESC;

-- Q2: Priority items ranked by vote count
CREATE OR REPLACE VIEW poll_priority_summary AS
SELECT
  poll_version,
  unnest(home_priority) AS priority_item,
  COUNT(*) AS votes
FROM poll_responses
GROUP BY poll_version, priority_item
ORDER BY poll_version, votes DESC;

-- Campus breakdown
CREATE OR REPLACE VIEW poll_campus_summary AS
SELECT
  poll_version,
  COALESCE(campus, 'Unknown') AS campus,
  COUNT(*) AS responses,
  MIN(submitted_at) AS first_response,
  MAX(submitted_at) AS last_response
FROM poll_responses
GROUP BY poll_version, campus
ORDER BY poll_version, responses DESC;

-- Daily volume
CREATE OR REPLACE VIEW poll_daily_volume AS
SELECT
  poll_version,
  DATE(submitted_at) AS day,
  COUNT(*) AS responses
FROM poll_responses
GROUP BY poll_version, day
ORDER BY poll_version, day DESC;
