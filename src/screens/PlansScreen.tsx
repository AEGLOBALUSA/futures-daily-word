import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { CheckCircle, Clock, ArrowRight, Play, RotateCcw, BookOpen } from 'lucide-react';
import { getDailyPassages } from '../utils/daily-passages';

/* ── Plan catalogue ── */
interface PlanDef {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  category: string;
  passages: string[]; // one passage per day
}

const PLAN_CATALOGUE: PlanDef[] = [
  {
    id: 'faith-pathway',
    title: '30-Day Faith Pathway',
    description: 'A guided journey through the foundations of faith for new believers.',
    totalDays: 30,
    category: 'Foundation',
    passages: [
      'John 3','Romans 3','Ephesians 2','John 1','Romans 5','Romans 6','Romans 8',
      'Galatians 5','Philippians 4','Colossians 3','1 John 1','1 John 3','1 John 4',
      'James 1','James 2','Hebrews 11','Hebrews 12','Psalm 23','Psalm 27','Psalm 37',
      'Psalm 91','Psalm 139','Proverbs 3','Isaiah 40','Isaiah 55','Matthew 5',
      'Matthew 6','Matthew 7','Luke 15','Revelation 21',
    ],
  },
  {
    id: 'psalms-30',
    title: 'Psalms in 30 Days',
    description: 'Read through the entire book of Psalms with daily reflections.',
    totalDays: 30,
    category: 'Bible Reading',
    passages: Array.from({ length: 30 }, (_, i) => `Psalm ${i * 5 + 1}-${(i + 1) * 5}`),
  },
  {
    id: 'prayer-life',
    title: 'Building a Prayer Life',
    description: 'Learn different prayer models and build a consistent prayer habit.',
    totalDays: 14,
    category: 'Spiritual Growth',
    passages: [
      'Matthew 6','Luke 11','1 Thessalonians 5','Philippians 4','James 5',
      'Psalm 5','Psalm 63','Daniel 6','Nehemiah 1','Acts 4',
      'Ephesians 6','Colossians 4','1 Timothy 2','Jude 1',
    ],
  },
  {
    id: 'gospel-john',
    title: 'Gospel of John',
    description: 'Walk through the Gospel of John chapter by chapter.',
    totalDays: 21,
    category: 'Bible Reading',
    passages: Array.from({ length: 21 }, (_, i) => `John ${i + 1}`),
  },
  {
    id: 'armor-of-god',
    title: 'The Armor of God',
    description: 'Study each piece of spiritual armor described in Ephesians 6.',
    totalDays: 7,
    category: 'Spiritual Growth',
    passages: ['Ephesians 6','Isaiah 59','Romans 13','1 Thessalonians 5','2 Corinthians 10','Hebrews 4','Psalm 18'],
  },
];

/* ── localStorage helpers ── */
interface PlanProgress {
  startedAt: string;
  completedDays: number[];
  lastDay: number;
}

function getActivePlans(): Record<string, PlanProgress> {
  try {
    return JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
  } catch { return {}; }
}

function savePlans(plans: Record<string, PlanProgress>) {
  localStorage.setItem('dw_activeplans', JSON.stringify(plans));
}

function getStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem('dw_streak') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (data.lastDate === today) return data.count || 0;
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (data.lastDate === yesterday.toISOString().slice(0, 10)) return data.count || 0;
    return 0;
  } catch { return 0; }
}

function recordStreak() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = JSON.parse(localStorage.getItem('dw_streak') || '{}');
    if (data.lastDate === today) return; // already recorded today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const count = data.lastDate === yesterday.toISOString().slice(0, 10) ? (data.count || 0) + 1 : 1;
    localStorage.setItem('dw_streak', JSON.stringify({ lastDate: today, count }));
  } catch {
    localStorage.setItem('dw_streak', JSON.stringify({ lastDate: today, count: 1 }));
  }
}

export function PlansScreen() {
  const { userProfile } = useUser();
  const [activeView, setActiveView] = useState<'active' | 'browse'>('active');
  const [activePlans, setActivePlans] = useState<Record<string, PlanProgress>>(getActivePlans);
  const [streak, setStreak] = useState(getStreak);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Persona-based plan suggestions
  const persona = (() => {
    try {
      return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || '';
    } catch { return ''; }
  })();

  const activePlanIds = Object.keys(activePlans);
  const todayPassages = getDailyPassages(0);

  const startPlan = useCallback((planId: string) => {
    const updated = {
      ...getActivePlans(),
      [planId]: { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 },
    };
    savePlans(updated);
    setActivePlans(updated);
  }, []);

  const completePlanDay = useCallback((planId: string, dayNum: number) => {
    const plans = getActivePlans();
    const plan = plans[planId];
    if (!plan) return;
    if (!plan.completedDays.includes(dayNum)) {
      plan.completedDays.push(dayNum);
      plan.lastDay = Math.max(plan.lastDay, dayNum);
    }
    plans[planId] = plan;
    savePlans(plans);
    setActivePlans({ ...plans });
    recordStreak();
    setStreak(getStreak());
  }, []);

  const resetPlan = useCallback((planId: string) => {
    const plans = getActivePlans();
    delete plans[planId];
    savePlans(plans);
    setActivePlans({ ...plans });
  }, []);

  // Auto-suggest faith-pathway for new believers
  useEffect(() => {
    if (persona === 'new_believer' && !activePlans['faith-pathway']) {
      // Don't auto-start, just show browse view
    }
  }, [persona]);

  const myPlans = PLAN_CATALOGUE.filter(p => activePlanIds.includes(p.id));
  const browsePlans = PLAN_CATALOGUE.filter(p => !activePlanIds.includes(p.id));

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26, fontWeight: 400,
          color: 'var(--dw-text-primary)',
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Reading Plans
        </h1>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Stay on track with guided reading and growth plans
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--dw-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {(['active', 'browse'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                flex: 1,
                background: activeView === view ? 'var(--dw-accent)' : 'transparent',
                color: activeView === view ? '#fff' : 'var(--dw-text-muted)',
                border: 'none', borderRadius: 8, padding: '10px 0',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                minHeight: 44, fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {view === 'active' ? `My Plans (${myPlans.length})` : `Browse All (${browsePlans.length})`}
            </button>
          ))}
        </div>

        {activeView === 'active' ? (
          <>
            {myPlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 16 }}>
                <BookOpen size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  No active plans yet
                </p>
                <button className="dw-btn-primary" style={{ fontSize: 13 }} onClick={() => setActiveView('browse')}>
                  Browse Plans
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPlans.map(plan => {
                  const progress = activePlans[plan.id];
                  if (!progress) return null;
                  const completedCount = progress.completedDays.length;
                  const pct = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
                  const isComplete = completedCount >= plan.totalDays;
                  const nextDay = progress.lastDay + 1;
                  const isExpanded = expandedPlan === plan.id;

                  return (
                    <Card key={plan.id} onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                          }}>
                            {plan.category}
                          </span>
                          <p className="text-card-title" style={{ marginTop: 8 }}>{plan.title}</p>
                        </div>
                        {isComplete ? (
                          <CheckCircle size={22} style={{ color: '#6ac895', flexShrink: 0 }} />
                        ) : (
                          <ArrowRight size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExpanded ? 12 : 0 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: isComplete ? '#6ac895' : 'var(--dw-accent)',
                            borderRadius: 2, transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                          {completedCount}/{plan.totalDays}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 8 }}>
                          {!isComplete && nextDay <= plan.totalDays && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
                                Day {nextDay}: {plan.passages[nextDay - 1] || '—'}
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); completePlanDay(plan.id, nextDay); }}
                                className="dw-btn-primary"
                                style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                <CheckCircle size={14} /> Mark Day {nextDay} Complete
                              </button>
                            </div>
                          )}
                          {isComplete && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); resetPlan(plan.id); }}
                                className="dw-btn-secondary"
                                style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                <RotateCcw size={14} /> Restart
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {browsePlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                  You've started all available plans!
                </p>
              </Card>
            ) : (
              browsePlans.map(plan => (
                <Card key={plan.id}>
                  <span style={{
                    background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                  }}>
                    {plan.category}
                  </span>
                  <p className="text-card-title" style={{ marginTop: 8 }}>{plan.title}</p>
                  <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                    {plan.description}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                    {plan.totalDays} days · {plan.passages.length} passages
                  </p>
                  <button
                    onClick={() => { startPlan(plan.id); setActiveView('active'); }}
                    className="dw-btn-primary"
                    style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Play size={14} /> Start Plan
                  </button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Reading streak */}
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Clock size={24} style={{ color: 'var(--dw-accent)', marginBottom: 8 }} />
          <p className="text-card-title" style={{ marginBottom: 4 }}>
            {streak > 0 ? `${streak} Day Streak` : 'Start Your Streak'}
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            {streak > 0
              ? `Keep going! You've read for ${streak} day${streak > 1 ? 's' : ''} in a row.`
              : 'Complete a plan day to start your reading streak.'}
          </p>
        </Card>

        {/* Suggested faith pathway for new believers */}
        {persona === 'new_believer' && !activePlans['faith-pathway'] && (
          <Card style={{ marginTop: 16, borderLeft: '3px solid var(--dw-accent)' }}>
            <p className="text-section-header" style={{ marginBottom: 8 }}>RECOMMENDED FOR YOU</p>
            <p className="text-card-title" style={{ marginBottom: 4 }}>30-Day Faith Pathway</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
              Perfect for new believers — a guided journey through the foundations of faith.
            </p>
            <button
              onClick={() => { startPlan('faith-pathway'); setActiveView('active'); }}
              className="dw-btn-primary"
              style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Play size={14} /> Start Faith Pathway
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
