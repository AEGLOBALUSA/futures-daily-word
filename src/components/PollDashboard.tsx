/**
 * PollDashboard — admin view for poll results.
 * Fetches data from /api/poll with pastor code auth.
 * Auto-refreshes every 60 seconds.
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, BarChart3, Loader2 } from 'lucide-react';

interface PollResults {
  total: number;
  todayCount: number;
  campusCount: number;
  topPriority: string | null;
  clutterCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  campusCounts: Record<string, number>;
  version: string;
}

const CLUTTER_LABELS: Record<string, string> = {
  clean: "It's clean and easy to use",
  busy: 'It feels a bit busy',
  lost: "I'm not sure where to find things",
  redesign: 'It needs a full redesign',
};

const PRIORITY_LABELS: Record<string, string> = {
  devotion: "Today's devotion",
  campus: 'My campus',
  events: 'Upcoming events',
  giving: 'Giving',
  sermon: 'Sermon / message',
  prayer: 'Prayer requests',
  plan: 'Bible reading plan',
  community: 'Community / connection',
};

const CLUTTER_COLORS: Record<string, string> = {
  clean: '#22C55E',
  busy: '#F59E0B',
  lost: '#EF4444',
  redesign: '#8B5CF6',
};

interface Props {
  pastorCode: string;
  onClose: () => void;
}

export function PollDashboard({ pastorCode, onClose }: Props) {
  const [data, setData] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/poll?version=v1', {
        headers: { 'X-Pastor-Code': pastorCode },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized — check your admin code');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Failed to load poll results');
    } finally {
      setLoading(false);
    }
  }, [pastorCode]);

  // Initial fetch + 60s auto-refresh
  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 60000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--dw-canvas)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--dw-border)',
        paddingTop: 'calc(16px + var(--safe-top, 0px))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={20} style={{ color: 'var(--dw-accent)' }} />
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
            color: 'var(--dw-text-primary)', margin: 0,
          }}>
            Poll Results
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchResults}
            style={{
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              color: 'var(--dw-text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontFamily: 'var(--font-sans)',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={28} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginTop: 12, fontFamily: 'var(--font-sans)' }}>Loading results...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: '#EF4444', fontSize: 14, fontFamily: 'var(--font-sans)' }}>{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <StatCard label="Total Responses" value={data.total.toString()} />
              <StatCard label="Today" value={data.todayCount.toString()} />
              <StatCard label="Campuses" value={data.campusCount.toString()} />
              <StatCard label="Top Priority" value={data.topPriority ? (PRIORITY_LABELS[data.topPriority] || data.topPriority) : '—'} small />
            </div>

            {/* Q1: Donut visualization */}
            <div style={{
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--dw-text-muted)', marginBottom: 16,
              }}>
                Q1: HOME SCREEN FEEL
              </p>
              {Object.entries(CLUTTER_LABELS).map(([key, label]) => {
                const count = data.clutterCounts[key] || 0;
                const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{pct}% ({count})</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--dw-border)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 4,
                        background: CLUTTER_COLORS[key] || 'var(--dw-accent)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Q2: Priority bars */}
            <div style={{
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--dw-text-muted)', marginBottom: 16,
              }}>
                Q2: HOME SCREEN PRIORITIES
              </p>
              {Object.entries(PRIORITY_LABELS)
                .map(([key, label]) => ({ key, label, count: data.priorityCounts[key] || 0 }))
                .sort((a, b) => b.count - a.count)
                .map(({ key, label, count }) => {
                  const maxCount = Math.max(...Object.values(data.priorityCounts), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)' }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--dw-border)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 3,
                          background: 'var(--dw-accent)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Campus breakdown */}
            <div style={{
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 16, padding: 20,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--dw-text-muted)', marginBottom: 16,
              }}>
                CAMPUS BREAKDOWN
              </p>
              {Object.entries(data.campusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([campus, count]) => (
                  <div key={campus} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--dw-border)',
                  }}>
                    <span style={{ fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                      {campus}
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--dw-accent)',
                      fontFamily: 'var(--font-sans)',
                      background: 'var(--dw-accent-bg)', borderRadius: 999, padding: '2px 10px',
                    }}>
                      {count}
                    </span>
                  </div>
                ))}
              {Object.keys(data.campusCounts).length === 0 && (
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '20px 0' }}>
                  No responses yet
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{
      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
      borderRadius: 14, padding: '16px 14px', textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--dw-text-muted)', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: small ? 'var(--font-sans)' : 'var(--font-serif)',
        fontSize: small ? 14 : 28,
        fontWeight: small ? 600 : 400,
        color: 'var(--dw-text-primary)', margin: 0,
      }}>
        {value}
      </p>
    </div>
  );
}
