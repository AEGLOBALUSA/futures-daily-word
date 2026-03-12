import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { DEVOTIONS } from '../data/devotions';
import { CAMPUSES } from '../data/tokens';
import { CheckCircle, Clock, ArrowRight, Play, RotateCcw, BookOpen, MapPin, Video, Heart, Scroll, ChevronRight } from 'lucide-react';

/* ── Plan catalogue ── */
interface PlanDef {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  category: string;
  passages: string[]; // one passage per day
}

interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
}

const BOOKS: Book[] = [
  { id: 'from-scarcity', title: 'From Scarcity to Abundance', description: 'A guide to God\'s provision', author: 'Ps A' },
  { id: 'church', title: 'The Church Awakening', description: 'Understanding our purpose in faith', author: 'Ps A' },
  { id: 'no-more-fear', title: 'No More Fear', description: 'Living boldly in faith', author: 'Ps A' },
];

const JANE_BOOKS: Book[] = [
  { id: 'jane-book-1', title: 'Grace & Truth', description: 'Biblical foundations for living', author: 'Ps Jane' },
];

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
  const [showPlanDetail, setShowPlanDetail] = useState(false);
  const [plansView, setPlanView] = useState<'active' | 'browse'>('active');
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
    if (persona === 'new_returning' && !activePlans['faith-pathway']) {
      // Don't auto-start, just show browse view
    }
  }, [persona]);

  const myPlans = PLAN_CATALOGUE.filter(p => activePlanIds.includes(p.id));
  const browsePlans = PLAN_CATALOGUE.filter(p => !activePlanIds.includes(p.id));
  const campusData = userProfile?.campus ? CAMPUSES.find(c => c.id === userProfile.campus) : null;
  const devotion = DEVOTIONS[0]; // Today's devotion

  // Hub view (V1 structure) - the main Plans & More page
  if (!showPlanDetail) {
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
            Plans & More
          </h1>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
            Your reading plans, devotion, and community
          </p>

          {/* Devotion of the Day */}
          {devotion && (
            <Card style={{ marginBottom: 24, borderLeft: '3px solid var(--dw-accent)' }}>
              <p className="text-section-header" style={{ marginBottom: 8 }}>DEVOTION OF THE DAY</p>
              <p className="text-card-title" style={{ marginBottom: 8 }}>{devotion.title}</p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                {devotion.verse}
              </p>
              <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
                {devotion.body}
              </p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                — {devotion.author}
              </p>
            </Card>
          )}

          {/* My Campus */}
          {campusData && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={18} style={{ color: 'var(--dw-accent)' }} />
                  <div>
                    <p className="text-card-title">{campusData.name}</p>
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                      {campusData.city}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--dw-text-muted)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="dw-btn-secondary" style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Heart size={14} /> Prayer Wall
                </button>
                {campusData.videoUrl && (
                  <button className="dw-btn-secondary" style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Video size={14} /> Live Stream
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Your Plans */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>YOUR PLANS</p>
            {myPlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  No active plans
                </p>
                <button className="dw-btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => setShowPlanDetail(true)}>
                  Browse Plans
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myPlans.slice(0, 2).map(plan => {
                  const progress = activePlans[plan.id];
                  if (!progress) return null;
                  const completedCount = progress.completedDays.length;
                  const pct = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
                  return (
                    <Card key={plan.id} style={{ cursor: 'pointer' }} onClick={() => setShowPlanDetail(true)}>
                      <p className="text-card-title" style={{ marginBottom: 8 }}>{plan.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: 'var(--dw-accent)',
                            borderRadius: 2, transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                          {completedCount}/{plan.totalDays}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ps A's Books */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>PS A'S BOOKS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BOOKS.map(book => (
                <Card key={book.id} style={{ cursor: 'pointer' }}>
                  <p className="text-card-title" style={{ marginBottom: 4 }}>{book.title}</p>
                  <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                    {book.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Ps Jane's Books */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>PS JANE'S BOOKS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {JANE_BOOKS.map(book => (
                <Card key={book.id} style={{ cursor: 'pointer' }}>
                  <p className="text-card-title" style={{ marginBottom: 4 }}>{book.title}</p>
                  <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                    {book.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Essays */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>ESSAYS</p>
            <Card style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Scroll size={18} style={{ color: 'var(--dw-accent)' }} />
                <div>
                  <p className="text-card-title">Knocking on the Door</p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    Conflict personas & biblical guard rails
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Plans detail view
  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setShowPlanDetail(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dw-accent)',
              cursor: 'pointer',
              padding: 0,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              minHeight: 44,
            }}
          >
            ← Back
          </button>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26, fontWeight: 400,
          color: 'var(--dw-text-primary)',
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Your Plans
        </h1>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Browse and manage your reading plans
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--dw-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {(['active', 'browse'] as const).map(view => (
            <button
              key={view}
              onClick={() => setPlanView(view)}
              style={{
                flex: 1,
                background: plansView === view ? 'var(--dw-accent)' : 'transparent',
                color: plansView === view ? '#fff' : 'var(--dw-text-muted)',
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

        {plansView === 'active' ? (
          <>
            {myPlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 16 }}>
                <BookOpen size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  No active plans yet
                </p>
                <button className="dw-btn-primary" style={{ fontSize: 13 }} onClick={() => { setShowPlanDetail(true); setPlanView('browse'); }}>
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
                    onClick={() => { startPlan(plan.id); setPlanView('active'); }}
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
        {persona === 'new_returning' && !activePlans['faith-pathway'] && (
          <Card style={{ marginTop: 16, borderLeft: '3px solid var(--dw-accent)' }}>
            <p className="text-section-header" style={{ marginBottom: 8 }}>RECOMMENDED FOR YOU</p>
            <p className="text-card-title" style={{ marginBottom: 4 }}>30-Day Faith Pathway</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
              Perfect for new believers — a guided journey through the foundations of faith.
            </p>
            <button
              onClick={() => { startPlan('faith-pathway'); }}
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
