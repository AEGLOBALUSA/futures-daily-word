/**
 * Behavior tracking — lightweight event log stored in localStorage.
 * Drives personalization without any server calls.
 *
 * Events are stored as a rolling window (last 60 days, max 500 events).
 */

export type BehaviorEventType =
  | 'reaction'        // emoji reaction to today's reading
  | 'audio_played'    // tapped listen on a passage
  | 'passage_read'    // expanded a passage to read the text
  | 'devotion_tapped' // opened a devotion card
  | 'ai_prompt'       // used a Bible AI quick prompt
  | 'note_created'    // wrote a verse note or journal entry
  | 'plan_started'    // added a reading plan
  | 'plan_dropped'    // removed an active plan
  | 'greek_hebrew'    // tapped the Gk/Heb word tool

export interface BehaviorEvent {
  type: BehaviorEventType
  date: string              // ISO date string YYYY-MM-DD
  ts: number                // unix ms
  meta?: string             // passage ref, emoji, prompt text, plan id, etc.
}

const KEY = 'dw_behavior_v1'
const MAX_EVENTS = 500
const MAX_DAYS   = 60

// ── Read / write ─────────────────────────────────────────────────────────────

function readEvents(): BehaviorEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as BehaviorEvent[]
  } catch { return [] }
}

function writeEvents(events: BehaviorEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Record a single behavior event. */
export function trackBehavior(type: BehaviorEventType, meta?: string) {
  try {
    const cutoff = Date.now() - MAX_DAYS * 86400000
    const existing = readEvents().filter(e => e.ts > cutoff)
    const next: BehaviorEvent = {
      type,
      date: new Date().toISOString().slice(0, 10),
      ts: Date.now(),
      meta,
    }
    const trimmed = [...existing, next].slice(-MAX_EVENTS)
    writeEvents(trimmed)
  } catch {}
}

// ── Profile derivation ────────────────────────────────────────────────────────

export interface BehaviorProfile {
  totalEvents: number
  daysActive: number

  // Reading style
  prefersAudio: boolean       // true if audio > text expansions
  readsDaily: boolean         // 5+ active days in last 7

  // Depth signal
  usesAI: boolean             // has used Bible AI
  usesGreekHebrew: boolean    // has used the Gk/Heb tool
  writesNotes: boolean        // has created notes

  // Emotional/tonal signal from reactions
  dominantReaction: '❤️' | '🤔' | '🙏' | null

  // Plan behaviour
  plansStarted: number
  plansDropped: number
  planCompletionRate: number  // 0–1

  // Engagement score 0–100
  engagementScore: number

  // Raw counts for finer personalization
  counts: Record<BehaviorEventType, number>
}

export function getBehaviorProfile(): BehaviorProfile {
  const events = readEvents()
  const now = Date.now()
  const week = 7 * 86400000
  const recent = events.filter(e => now - e.ts < week * 4) // last 28 days

  const counts: Record<BehaviorEventType, number> = {
    reaction: 0, audio_played: 0, passage_read: 0, devotion_tapped: 0,
    ai_prompt: 0, note_created: 0, plan_started: 0, plan_dropped: 0,
    greek_hebrew: 0,
  }
  for (const e of recent) counts[e.type] = (counts[e.type] || 0) + 1

  // Days active in last 7
  const last7 = events.filter(e => now - e.ts < week)
  const activeDates = new Set(last7.map(e => e.date))
  const daysActive = activeDates.size

  // Days active total (unique dates)
  const allDates = new Set(events.map(e => e.date))

  // Audio vs reading
  const prefersAudio = counts.audio_played > counts.passage_read

  // Dominant reaction
  const reactions = recent.filter(e => e.type === 'reaction')
  const reactionCounts: Record<string, number> = {}
  for (const r of reactions) {
    if (r.meta) reactionCounts[r.meta] = (reactionCounts[r.meta] || 0) + 1
  }
  const topReaction = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as BehaviorProfile['dominantReaction'] || null

  // Plan behaviour
  const plansStarted = counts.plan_started
  const plansDropped = counts.plan_dropped
  const planCompletionRate = plansStarted > 0
    ? Math.max(0, 1 - plansDropped / plansStarted)
    : 0

  // Engagement score (0–100)
  // Components: consistency (days active), depth (AI/notes/Gk), audio, reactions
  const consistencyScore = Math.min(daysActive / 7, 1) * 35        // 0–35
  const depthScore = Math.min((counts.ai_prompt + counts.note_created + counts.greek_hebrew) / 5, 1) * 30  // 0–30
  const habitScore = Math.min((counts.audio_played + counts.passage_read) / 10, 1) * 20  // 0–20
  const reactScore  = Math.min(counts.reaction / 3, 1) * 15         // 0–15
  const engagementScore = Math.round(consistencyScore + depthScore + habitScore + reactScore)

  return {
    totalEvents: recent.length,
    daysActive: allDates.size,
    prefersAudio,
    readsDaily: daysActive >= 5,
    usesAI: counts.ai_prompt > 0,
    usesGreekHebrew: counts.greek_hebrew > 0,
    writesNotes: counts.note_created > 0,
    dominantReaction: topReaction,
    plansStarted,
    plansDropped,
    planCompletionRate,
    engagementScore,
    counts,
  }
}

/** Returns true once enough behavior has been collected to personalize meaningfully. */
export function hasEnoughBehavior(): boolean {
  const events = readEvents()
  const week = 7 * 86400000
  const recent = events.filter(e => Date.now() - e.ts < week * 2)
  return recent.length >= 5
}
