/**
 * AnalyticsDashboard — admin view for app analytics.
 * Shows: active users, top features, campus/city breakdown, daily active chart.
 * Auth: pastor code via X-Pastor-Code header.
 * Auto-refreshes every 120 seconds.
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Activity, Users, Globe, Smartphone, TrendingUp, Loader2 } from 'lucide-react';

interface OverviewData {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
}

interface NameCount { name: string; count: number; }
interface EventCount { event: string; count: number; }
interface DailyPoint { date: string; count: number; }
interface Signup { name: string; email: string; campus: string; city: string; registered: string; lastActive: string; }

interface AnalyticsData {
  overview: OverviewData;
  topFeatures: EventCount[];
  topFeaturesWeek: EventCount[];
  campuses: NameCount[];
  cities: NameCount[];
  personas: NameCount[];
  languages: NameCount[];
  dailyActive: DailyPoint[];
  recentSignups: Signup[];
  generatedAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  book_open: 'Book Opened',
  chapter_read: 'Chapter Read',
  audio_play: 'Audio Play',
  ai_chat: 'AI Chat',
  search: 'Search',
  scripture_search: 'Scripture Search',
  highlight_add: 'Highlight Added',
  journal_save: 'Journal Saved',
  share: 'Shared',
  version_switch: 'Translation Switch',
  persona_change: 'Persona Change',
  language_change: 'Language Change',
  chapter_change: 'Chapter Change',
  pathway_start: 'Plan Started',
  pathway_complete: 'Plan Completed',
  pathway_lesson: 'Lesson Completed',
  push_subscribe: 'Push Subscribed',
  push_unsubscribe: 'Push Unsubscribed',
  app_open: 'App Opened',
  page_view: 'Page View',
  tts_play: 'TTS Play',
  login: 'Login',
  heartbeat: 'Heartbeat',
  profile_update: 'Profile Updated',
  ai_question: 'AI Question',
};

const PERSONA_LABELS: Record<string, string> = {
  new_believer: 'New Believer',
  growing_christian: 'Growing Christian',
  mature_believer: 'Mature Believer',
  pastor_leader: 'Pastor / Leader',
  pastor: 'Pastor',
  seeker: 'Seeker',
  youth: 'Youth',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', pt: 'Portuguese', id: 'Indonesian',
};

interface Props {
  pastorCode: string;
  onClose: () => void;
}

export function AnalyticsDashboard({ pastorCode, onClose }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'features' | 'audience' | 'signups'>('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics-dashboard', {
        headers: { 'X-Pastor-Code': pastorCode },
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'Invalid code' : 'Failed to load');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [pastorCode]);

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 120000); return () => clearInterval(id); }, [fetchData]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--dw-surface, #fff)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    border: '1px solid var(--dw-border, #e5e5e5)',
  };

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: 'center',
    flex: 1,
    minWidth: 140,
  };

  const statNum: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: 'var(--font-sans)',
    color: 'var(--dw-text, #111)',
    lineHeight: 1.1,
  };

  const statLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    color: 'var(--dw-text-muted, #888)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 4,
  };

  const barRow = (label: string, count: number, max: number, color: string) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-sans)', marginBottom: 3 }}>
        <span style={{ color: 'var(--dw-text, #111)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--dw-text-muted, #888)' }}>{count.toLocaleString()}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--dw-border, #e5e5e5)' }}>
        <div style={{ height: 6, borderRadius: 3, background: color, width: `${max > 0 ? Math.max((count / max) * 100, 2) : 0}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        flex: 1,
        padding: '8px 4px',
        fontSize: 11,
        fontWeight: tab === id ? 700 : 500,
        fontFamily: 'var(--font-sans)',
        background: tab === id ? 'var(--dw-accent, #E85D4A)' : 'transparent',
        color: tab === id ? '#fff' : 'var(--dw-text-muted, #888)',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );

  // Mini sparkline chart using CSS
  const sparkline = (points: DailyPoint[]) => {
    if (!points.length) return null;
    const max = Math.max(...points.map(p => p.count), 1);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, padding: '8px 0' }}>
        {points.map((p, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div
              style={{
                width: '100%',
                maxWidth: 24,
                height: Math.max((p.count / max) * 48, 3),
                background: 'var(--dw-accent, #E85D4A)',
                borderRadius: 3,
                opacity: 0.8,
              }}
              title={`${p.date}: ${p.count} users`}
            />
            <span style={{ fontSize: 8, color: 'var(--dw-text-faint, #bbb)', fontFamily: 'var(--font-sans)' }}>
              {p.date.slice(8)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--dw-bg, #fafafa)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--dw-bg, #fafafa)',
        borderBottom: '1px solid var(--dw-border, #e5e5e5)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} style={{ color: 'var(--dw-accent, #E85D4A)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--dw-text, #111)' }}>
            Analytics
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <RefreshCw size={18} style={{ color: 'var(--dw-text-muted, #888)', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} style={{ color: 'var(--dw-text-muted, #888)' }} />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 80px', maxWidth: 600, margin: '0 auto' }}>
        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={32} style={{ color: 'var(--dw-accent, #E85D4A)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {error && (
          <div style={{ ...cardStyle, background: '#FEF2F2', borderColor: '#FECACA', textAlign: 'center' }}>
            <p style={{ color: '#DC2626', fontFamily: 'var(--font-sans)', fontSize: 13 }}>{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: 4, padding: 4, marginBottom: 12,
              background: 'var(--dw-surface, #fff)',
              borderRadius: 12,
              border: '1px solid var(--dw-border, #e5e5e5)',
            }}>
              {tabBtn('overview', 'Overview')}
              {tabBtn('features', 'Features')}
              {tabBtn('audience', 'Audience')}
              {tabBtn('signups', 'Signups')}
            </div>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <>
                {/* Stat cards */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={statCardStyle}>
                    <div style={statNum}>{data.overview.totalUsers.toLocaleString()}</div>
                    <div style={statLabel}>Total Users</div>
                  </div>
                  <div style={statCardStyle}>
                    <div style={{ ...statNum, color: 'var(--dw-accent, #E85D4A)' }}>{data.overview.activeToday.toLocaleString()}</div>
                    <div style={statLabel}>Active Today</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={statCardStyle}>
                    <div style={statNum}>{data.overview.activeWeek.toLocaleString()}</div>
                    <div style={statLabel}>This Week</div>
                  </div>
                  <div style={statCardStyle}>
                    <div style={statNum}>{data.overview.activeMonth.toLocaleString()}</div>
                    <div style={statLabel}>This Month</div>
                  </div>
                </div>

                {/* Daily Active Chart */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <TrendingUp size={14} style={{ color: 'var(--dw-accent, #E85D4A)' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      Daily Active Users (14 days)
                    </span>
                  </div>
                  {sparkline(data.dailyActive)}
                </div>

                {/* Top Features This Week */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Smartphone size={14} style={{ color: 'var(--dw-accent, #E85D4A)' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      Top Features (7 days)
                    </span>
                  </div>
                  {data.topFeaturesWeek.slice(0, 8).map(f => {
                    const max = data.topFeaturesWeek[0]?.count || 1;
                    return barRow(EVENT_LABELS[f.event] || f.event, f.count, max, 'var(--dw-accent, #E85D4A)');
                  })}
                </div>
              </>
            )}

            {/* FEATURES TAB */}
            {tab === 'features' && (
              <>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Smartphone size={14} style={{ color: 'var(--dw-accent, #E85D4A)' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      All Features (30 days)
                    </span>
                  </div>
                  {data.topFeatures.map(f => {
                    const max = data.topFeatures[0]?.count || 1;
                    return barRow(EVENT_LABELS[f.event] || f.event, f.count, max, '#6366F1');
                  })}
                </div>
              </>
            )}

            {/* AUDIENCE TAB */}
            {tab === 'audience' && (
              <>
                {/* Campuses */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Globe size={14} style={{ color: '#22C55E' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      By Campus
                    </span>
                  </div>
                  {data.campuses.map(c => {
                    const max = data.campuses[0]?.count || 1;
                    return barRow(c.name, c.count, max, '#22C55E');
                  })}
                </div>

                {/* Cities */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Globe size={14} style={{ color: '#3B82F6' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      Top Cities
                    </span>
                  </div>
                  {data.cities.slice(0, 15).map(c => {
                    const max = data.cities[0]?.count || 1;
                    return barRow(c.name, c.count, max, '#3B82F6');
                  })}
                </div>

                {/* Personas */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Users size={14} style={{ color: '#F59E0B' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      By Persona
                    </span>
                  </div>
                  {data.personas.map(p => {
                    const max = data.personas[0]?.count || 1;
                    return barRow(PERSONA_LABELS[p.name] || p.name, p.count, max, '#F59E0B');
                  })}
                </div>

                {/* Languages */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Globe size={14} style={{ color: '#8B5CF6' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                      By Language
                    </span>
                  </div>
                  {data.languages.map(l => {
                    const max = data.languages[0]?.count || 1;
                    return barRow(LANG_LABELS[l.name] || l.name, l.count, max, '#8B5CF6');
                  })}
                </div>
              </>
            )}

            {/* SIGNUPS TAB */}
            {tab === 'signups' && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Users size={14} style={{ color: 'var(--dw-accent, #E85D4A)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, color: 'var(--dw-text, #111)' }}>
                    Recent Signups (30 days)
                  </span>
                </div>
                {data.recentSignups.length === 0 && (
                  <p style={{ color: 'var(--dw-text-muted, #888)', fontFamily: 'var(--font-sans)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    No signups in the last 30 days
                  </p>
                )}
                {data.recentSignups.map((s, i) => (
                  <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: i < data.recentSignups.length - 1 ? '1px solid var(--dw-border, #e5e5e5)' : 'none',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-text, #111)' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--dw-text-muted, #888)' }}>{s.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--dw-text-muted, #888)' }}>{s.campus || s.city || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--dw-text-faint, #bbb)' }}>
                          {s.registered ? new Date(s.registered).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer timestamp */}
            <p style={{
              textAlign: 'center', fontSize: 10, color: 'var(--dw-text-faint, #bbb)',
              fontFamily: 'var(--font-sans)', marginTop: 12,
            }}>
              Updated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
