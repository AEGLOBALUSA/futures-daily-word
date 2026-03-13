/**
 * Personalization engine — turns a BehaviorProfile + persona into
 * surfaced passage suggestions, plan ordering, and a human-readable insight.
 */

import type { BehaviorProfile } from './behavior'
import type { PlanDef } from '../data/plans'

// ── Passage pool per signal ───────────────────────────────────────────────────

const COMFORT_PASSAGES = [
  'Psalm 23', 'Psalm 46', 'Psalm 91', 'Psalm 139', 'Isaiah 40', 'Isaiah 43',
  'Romans 8', 'John 14', 'Matthew 6', 'Philippians 4', '2 Corinthians 1',
  'Lamentations 3', 'Psalm 34', 'Psalm 121', 'Isaiah 41',
]

const DEPTH_PASSAGES = [
  'John 1', 'Romans 9', 'Hebrews 1', 'Colossians 1', 'Ephesians 1',
  'Revelation 1', 'Genesis 1', 'Exodus 3', 'Isaiah 6', 'Daniel 7',
  'John 17', 'Romans 11', 'Hebrews 7', 'Revelation 21', 'Job 38',
]

const TEACHING_PASSAGES = [
  'Matthew 5', 'Matthew 6', 'Matthew 7', 'Proverbs 3', 'James 1',
  'Romans 12', 'Colossians 3', 'Ephesians 4', 'Hebrews 12', '1 Peter 2',
  'Galatians 5', '1 Corinthians 13', 'Philippians 2', 'Titus 2', '2 Timothy 2',
]

const WORSHIP_PASSAGES = [
  'Psalm 103', 'Psalm 145', 'Psalm 100', 'Revelation 4', 'Isaiah 6',
  'Psalm 8', 'Psalm 19', 'Habakkuk 3', 'Luke 1', 'Exodus 15',
]

const FOUNDATION_PASSAGES = [
  'John 3', 'Romans 5', 'Ephesians 2', 'Romans 10', '1 John 1',
  'Hebrews 11', 'James 2', 'Luke 15', 'Romans 3', 'Galatians 2',
]

// ── Plan priority per signal ──────────────────────────────────────────────────

const PLAN_PRIORITY_BY_SIGNAL: Record<string, string[]> = {
  comfort: ['psalms-30', 'prayer-life', 'armor-of-god', 'faith-pathway', 'psalms-proverbs'],
  depth:   ['nt-60', 'wisdom-lit', 'gospels-89', 'through-bible-year', 'psalms-proverbs'],
  teach:   ['gospels-acts', 'new-testament-90', 'nt-60', 'armor-of-god', 'acts-28'],
  worship: ['psalms-30', 'psalms-proverbs', 'wisdom-lit', 'gospels-acts', 'gospel-john'],
  new:     ['faith-pathway', 'gospel-john', 'acts-28', 'prayer-life', 'armor-of-god'],
  short:   ['armor-of-god', 'psalms-30', 'acts-28', 'gospel-john', 'prayer-life'],
  audio:   ['ashley-jane-daily-word', 'gospel-john', 'acts-28', 'gospels-89', 'nt-60'],
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface PersonalizationResult {
  /** 2–4 passage references to surface as "For You" suggestions */
  suggestedPassages: string[]
  /** Ranked plan ids, most relevant first */
  rankedPlanIds: string[]
  /** Short human-readable insight about this user's reading style */
  insight: string | null
  /** Detected signal (used for UI labelling) */
  signal: 'comfort' | 'depth' | 'teach' | 'worship' | 'new' | 'audio' | 'mixed' | null
}

export function personalize(
  profile: BehaviorProfile,
  persona: string,
  activePlanIds: string[],
  allPlans: PlanDef[],
): PersonalizationResult {

  // ── 1. Determine dominant signal ─────────────────────────────────────────
  let signal: PersonalizationResult['signal'] = null

  // Override from persona if no behavior yet
  if (profile.totalEvents < 5) {
    signal = persona === 'difficult' ? 'comfort'
           : persona === 'deeper'    ? 'depth'
           : persona === 'pastor'    ? 'teach'
           : persona === 'new_returning' ? 'new'
           : null
  } else {
    // Derive from behavior
    const { dominantReaction, usesGreekHebrew, usesAI, writesNotes, prefersAudio,
            counts, planCompletionRate } = profile

    if (dominantReaction === '🙏') signal = 'comfort'
    else if (dominantReaction === '❤️') signal = 'worship'
    else if (dominantReaction === '🤔' || usesGreekHebrew) signal = 'depth'
    else if (usesAI && writesNotes) signal = 'teach'
    else if (prefersAudio && counts.audio_played > 5) signal = 'audio'
    else if (planCompletionRate < 0.4 && profile.plansDropped > 1) signal = 'short' // tends to drop plans — suggest shorter ones
    else if (profile.daysActive < 5) signal = 'new'
    else signal = 'mixed'
  }

  // ── 2. Pick suggested passages ───────────────────────────────────────────
  const passagePool =
    signal === 'comfort' ? COMFORT_PASSAGES :
    signal === 'depth'   ? DEPTH_PASSAGES :
    signal === 'teach'   ? TEACHING_PASSAGES :
    signal === 'worship' ? WORSHIP_PASSAGES :
    signal === 'new'     ? FOUNDATION_PASSAGES :
    signal === 'audio'   ? [...FOUNDATION_PASSAGES, ...WORSHIP_PASSAGES] :
    [...COMFORT_PASSAGES, ...DEPTH_PASSAGES, ...TEACHING_PASSAGES]

  // Deterministically pick 3 based on today's date + signal so they rotate daily
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const seedOffset = (signal?.charCodeAt(0) || 0)
  const suggestions: string[] = []
  for (let i = 0; i < 3; i++) {
    const idx = (dayOfYear + seedOffset + i * 7) % passagePool.length
    const passage = passagePool[idx]
    if (passage && !suggestions.includes(passage)) suggestions.push(passage)
  }

  // ── 3. Rank plans ────────────────────────────────────────────────────────
  const priorityIds = signal && PLAN_PRIORITY_BY_SIGNAL[signal]
    ? PLAN_PRIORITY_BY_SIGNAL[signal]
    : PLAN_PRIORITY_BY_SIGNAL['new']

  const rankedPlanIds = allPlans
    .filter(p => !activePlanIds.includes(p.id)) // exclude already-active
    .sort((a, b) => {
      const ai = priorityIds.indexOf(a.id)
      const bi = priorityIds.indexOf(b.id)
      if (ai !== -1 && bi === -1) return -1
      if (ai === -1 && bi !== -1) return 1
      if (ai !== -1 && bi !== -1) return ai - bi
      return 0
    })
    .map(p => p.id)

  // ── 4. Human-readable insight ────────────────────────────────────────────
  let insight: string | null = null

  if (profile.totalEvents >= 5) {
    const { prefersAudio, usesGreekHebrew, writesNotes, readsDaily,
            dominantReaction, engagementScore } = profile

    if (readsDaily && engagementScore >= 60) {
      insight = 'You\'re building a strong daily habit — keep going.'
    } else if (prefersAudio && profile.counts.audio_played > 3) {
      insight = 'You\'re an audio reader — we\'re queuing chapters you\'ll love to hear.'
    } else if (usesGreekHebrew) {
      insight = 'You go deep. We\'re surfacing passages with rich original-language layers.'
    } else if (writesNotes && profile.counts.note_created > 2) {
      insight = 'You write as you read — a sign of genuine engagement with the Word.'
    } else if (dominantReaction === '🙏') {
      insight = 'You often find exactly what you needed. We\'re leaning into that.'
    } else if (dominantReaction === '🤔') {
      insight = 'You\'re a thinker. We\'re surfacing passages that reward reflection.'
    } else if (dominantReaction === '❤️') {
      insight = 'You respond with your heart. We\'re surfacing passages of deep love and worship.'
    } else if (profile.daysActive >= 14) {
      insight = `${profile.daysActive} days reading so far — you're consistent.`
    }
  }

  return { suggestedPassages: suggestions, rankedPlanIds, insight, signal }
}

// ── Helper: label for signal type ─────────────────────────────────────────────

export function signalLabel(signal: PersonalizationResult['signal']): string {
  switch (signal) {
    case 'comfort':  return 'passages of comfort'
    case 'depth':    return 'passages for deeper study'
    case 'teach':    return 'passages for application'
    case 'worship':  return 'passages of worship'
    case 'new':      return 'foundational passages'
    case 'audio':    return 'passages to listen to'
    case 'short':    return 'focused reading'
    default:         return 'passages for you'
  }
}
