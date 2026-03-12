import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { BibleAI } from '../components/BibleAI';
import { useUser } from '../contexts/UserContext';
import { Heart, Globe, Users, Sparkles, Send, Loader2 } from 'lucide-react';

interface Prayer {
  id: string;
  name: string;
  campus: string;
  text: string;
  prayerCount: number;
  date: string;
}

export function MessagesScreen() {
  const { userProfile, requireEmail } = useUser();
  const [filter, setFilter] = useState<'all' | 'campus'>('all');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [agreedIds, setAgreedIds] = useState<Set<string>>(new Set());
  const [showPrayerForm, setShowPrayerForm] = useState(false);

  const campus = userProfile?.campus || '';

  const loadPrayers = useCallback(async () => {
    try {
      const campusParam = filter === 'campus' && campus ? `&campus=${encodeURIComponent(campus)}` : '';
      const res = await fetch(`/api/prayer-wall?action=list${campusParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPrayers(data.map((p: Record<string, unknown>, i: number) => ({
            id: (p.id as string) || String(i),
            name: (p.name as string) || 'Anonymous',
            campus: (p.campus as string) || '',
            text: (p.text as string) || (p.prayer as string) || '',
            prayerCount: (p.pray_count as number) || (p.prayerCount as number) || 0,
            date: formatDate(p.created_at as string),
          })));
        }
      }
    } catch {
      // Keep existing prayers on error
    } finally {
      setLoading(false);
    }
  }, [filter, campus]);

  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  const submitPrayer = async () => {
    if (!prayerText.trim()) return;
    if (!userProfile?.email) {
      requireEmail();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/prayer-wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          email: userProfile.email,
          name: userProfile.firstName || 'Anonymous',
          campus: campus,
          text: prayerText.trim(),
        }),
      });
      if (res.ok) {
        setPrayerText('');
        setShowPrayerForm(false);
        await loadPrayers();
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  const agreePrayer = async (prayerId: string) => {
    if (agreedIds.has(prayerId)) return;
    setAgreedIds(prev => new Set(prev).add(prayerId));
    // Optimistic update
    setPrayers(prev => prev.map(p =>
      p.id === prayerId ? { ...p, prayerCount: p.prayerCount + 1 } : p
    ));
    try {
      await fetch('/api/prayer-wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'agree',
          prayer_id: prayerId,
          email: userProfile?.email || '',
        }),
      });
    } catch {
      // Revert on error
      setAgreedIds(prev => {
        const next = new Set(prev);
        next.delete(prayerId);
        return next;
      });
      setPrayers(prev => prev.map(p =>
        p.id === prayerId ? { ...p, prayerCount: p.prayerCount - 1 } : p
      ));
    }
  };

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Prayer Wall
          </h1>
          <button
            className="dw-btn-primary"
            style={{ fontSize: 13, padding: '8px 16px' }}
            onClick={() => {
              if (!userProfile?.email) { requireEmail(); return; }
              setShowPrayerForm(true);
            }}
          >
            + Prayer
          </button>
        </div>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Lift each other up in prayer across all campuses
        </p>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: filter === 'all' ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: filter === 'all' ? '#fff' : 'var(--dw-text-muted)',
              border: filter === 'all' ? 'none' : '1px solid var(--dw-border)',
              borderRadius: 999, padding: '8px 18px', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44, fontFamily: 'var(--font-sans)',
            }}
          >
            <Globe size={14} /> All Campuses
          </button>
          <button
            onClick={() => setFilter('campus')}
            style={{
              background: filter === 'campus' ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: filter === 'campus' ? '#fff' : 'var(--dw-text-muted)',
              border: filter === 'campus' ? 'none' : '1px solid var(--dw-border)',
              borderRadius: 999, padding: '8px 18px', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44, fontFamily: 'var(--font-sans)',
            }}
          >
            <Users size={14} /> My Campus
          </button>
        </div>

        {/* Bible AI Launch Card */}
        <Card
          style={{ marginBottom: 16, borderLeft: '3px solid var(--dw-accent)', cursor: 'pointer' }}
          onClick={() => setShowAI(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Sparkles size={20} style={{ color: 'var(--dw-accent)' }} />
            <p className="text-card-title">Bible AI</p>
          </div>
          <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Ask questions about scripture, get context on passages, or explore biblical topics with AI.
          </p>
          <button className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>
            Start Conversation
          </button>
        </Card>

        {/* Prayer Submit Form */}
        {showPrayerForm && (
          <Card style={{ marginBottom: 16 }}>
            <p className="text-section-header" style={{ marginBottom: 10 }}>SUBMIT A PRAYER</p>
            <textarea
              placeholder="Share your prayer request..."
              value={prayerText}
              onChange={e => setPrayerText(e.target.value)}
              maxLength={500}
              style={{
                width: '100%', minHeight: 80, background: 'var(--dw-surface)',
                border: '1px solid var(--dw-border)', borderRadius: 10,
                padding: 12, color: 'var(--dw-text-primary)', fontSize: 14,
                fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowPrayerForm(false); setPrayerText(''); }}
                className="dw-btn-secondary"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitPrayer}
                disabled={submitting || !prayerText.trim()}
                className="dw-btn-primary"
                style={{
                  fontSize: 13, padding: '8px 16px',
                  opacity: submitting || !prayerText.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                Submit
              </button>
            </div>
          </Card>
        )}

        {/* Prayer entries */}
        <p className="text-section-header" style={{ marginBottom: 12 }}>RECENT PRAYERS</p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
            <Loader2 size={18} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading prayers...</span>
          </div>
        ) : prayers.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              No prayers yet. Be the first to share a prayer request.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {prayers.map(prayer => (
              <Card key={prayer.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                      {prayer.name}
                    </p>
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                      {prayer.campus ? `${prayer.campus} · ` : ''}{prayer.date}
                    </p>
                  </div>
                </div>
                <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
                  {prayer.text}
                </p>
                <button
                  onClick={() => agreePrayer(prayer.id)}
                  style={{
                    background: agreedIds.has(prayer.id) ? 'var(--dw-accent)' : 'var(--dw-accent-bg)',
                    border: 'none', borderRadius: 999, padding: '6px 14px',
                    color: agreedIds.has(prayer.id) ? '#fff' : 'var(--dw-accent)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    minHeight: 36, fontFamily: 'var(--font-sans)',
                    transition: 'all 200ms ease',
                  }}
                >
                  <Heart size={13} fill={agreedIds.has(prayer.id) ? '#fff' : 'none'} />
                  {agreedIds.has(prayer.id) ? 'Praying' : 'Pray'} · {prayer.prayerCount}
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bible AI Full Screen */}
      <BibleAI isOpen={showAI} onClose={() => setShowAI(false)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return 'Recently';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
