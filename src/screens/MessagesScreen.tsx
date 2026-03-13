import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { Pencil, Trash2, Plus, Loader2, Heart, HandHeart, RefreshCw, Send } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SermonNote {
  id: string;
  title: string;
  date: string;
  content: string;
  sermon?: string;
}

interface Prayer {
  id: string;
  name: string;
  campus: string;
  campusName: string;
  prayer: string;
  prayerCount: number;
  timeAgo: string;
}

const CAMPUS_LABELS: Record<string, string> = {
  'au-paradise': 'Futures Paradise', 'au-adelaide-city': 'Futures Adelaide City',
  'au-salisbury': 'Futures Salisbury', 'au-south': 'Futures South',
  'au-clare-valley': 'Futures Clare Valley', 'au-mount-barker': 'Futures Mount Barker',
  'au-victor-harbor': 'Futures Victor Harbor', 'au-copper-coast': 'Futures Copper Coast',
  'us-gwinnett': 'Futures Gwinnett', 'us-kennesaw': 'Futures Kennesaw',
  'us-alpharetta': 'Futures Alpharetta', 'us-futuros-duluth': 'Futuros Duluth',
  'us-futuros-kennesaw': 'Futuros Kennesaw', 'us-futuros-grayson': 'Futuros Grayson',
  'us-franklin': 'Futures Franklin', 'id-solo': 'Futures Solo', 'id-cemani': 'Futures Cemani',
  'id-bali': 'Futures Bali', 'id-samarinda': 'Futures Samarinda', 'id-langowan': 'Futures Langowan',
  'br-rio': 'Futures Rio', 'other': 'Non-Futures Church',
};

// ── Prayer Wall API ────────────────────────────────────────────────────────────
const API = '/.netlify/functions/prayer-wall';

async function fetchPrayers(filter: 'all' | 'my-campus', campus: string): Promise<Prayer[]> {
  try {
    const url = filter === 'my-campus' && campus
      ? `${API}?filter=my-campus&campus=${encodeURIComponent(campus)}`
      : `${API}?filter=all`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const { prayers } = await res.json();
    return prayers || [];
  } catch {
    return [];
  }
}

async function postPrayer(prayer: string, name: string, campus: string, email: string): Promise<boolean> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', prayer, name, campus, email }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function prayForIt(id: string): Promise<boolean> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pray', id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function MessagesScreen() {
  const { userProfile, requireEmail } = useUser();
  const [activeTab, setActiveTab] = useState<'notes' | 'prayer'>('notes');

  return (
    <div className="screen-container">
      {/* Tab switcher */}
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400,
          color: 'var(--dw-text-primary)', letterSpacing: '-0.02em', marginBottom: 16,
        }}>
          Notes
        </h1>
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          background: 'var(--dw-surface)', borderRadius: 12, padding: 4,
          border: '1px solid var(--dw-border)',
        }}>
          {(['notes', 'prayer'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px 0',
              background: activeTab === tab ? 'var(--dw-accent)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--dw-text-muted)',
              border: 'none', borderRadius: 9, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s ease',
            }}>
              {tab === 'notes' ? 'Sermon Notes' : '🙏 Prayer Wall'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'notes'
        ? <SermonNotesPanel userProfile={userProfile} requireEmail={requireEmail} />
        : <PrayerWallPanel userProfile={userProfile} requireEmail={requireEmail} />
      }

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Sermon Notes Panel ─────────────────────────────────────────────────────────
function SermonNotesPanel({
  userProfile,
  requireEmail,
}: {
  userProfile: { email?: string; name?: string; campus?: string } | null;
  requireEmail: (cb?: () => void) => void;
}) {
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', sermon: '', content: '' });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const storedNotes = localStorage.getItem('dw_sermon_notes');
      if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const saveNote = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    if (!userProfile?.email) { requireEmail(); return; }
    const newNote: SermonNote = {
      id: editingId || Date.now().toString(),
      title: formData.title, sermon: formData.sermon,
      content: formData.content, date: new Date().toISOString().slice(0, 10),
    };
    const updated = editingId ? notes.map(n => n.id === editingId ? newNote : n) : [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('dw_sermon_notes', JSON.stringify(updated));
    setFormData({ title: '', sermon: '', content: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('dw_sermon_notes', JSON.stringify(updated));
  };

  const editNote = (note: SermonNote) => {
    setFormData({ title: note.title, sermon: note.sermon || '', content: note.content });
    setEditingId(note.id);
    setShowForm(true);
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', margin: 0 }}>
          Capture insights from sermons and teachings
        </p>
        <button
          className="dw-btn-primary"
          style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          onClick={() => {
            if (!userProfile?.email) { requireEmail(); return; }
            setFormData({ title: '', sermon: '', content: '' });
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus size={14} /> New Note
        </button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <p className="text-section-header" style={{ marginBottom: 12 }}>
            {editingId ? 'EDIT NOTE' : 'NEW SERMON NOTE'}
          </p>
          {[
            { placeholder: 'Note title...', key: 'title', fontSize: 14 },
            { placeholder: 'Sermon title (optional)...', key: 'sermon', fontSize: 13 },
          ].map(({ placeholder, key, fontSize }) => (
            <input key={key} type="text" placeholder={placeholder} value={(formData as Record<string, string>)[key]}
              onChange={e => setFormData({ ...formData, [key]: e.target.value })}
              style={{
                width: '100%', background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                borderRadius: 10, padding: '12px 14px', color: 'var(--dw-text-primary)',
                fontSize, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 12, minHeight: 44,
                boxSizing: 'border-box',
              }}
            />
          ))}
          <textarea placeholder="Write your notes..." value={formData.content}
            onChange={e => setFormData({ ...formData, content: e.target.value })}
            style={{
              width: '100%', minHeight: 120, background: 'var(--dw-surface)',
              border: '1px solid var(--dw-border)', borderRadius: 10, padding: 12,
              color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)',
              outline: 'none', resize: 'vertical', marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setFormData({ title: '', sermon: '', content: '' }); }}
              className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>Cancel</button>
            <button onClick={saveNote} disabled={!formData.title.trim() || !formData.content.trim()}
              className="dw-btn-primary"
              style={{ fontSize: 13, padding: '8px 16px', opacity: !formData.title.trim() || !formData.content.trim() ? 0.5 : 1 }}>
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
          <Loader2 size={18} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading notes...</span>
        </div>
      ) : notes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Pencil size={24} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            No sermon notes yet. Create your first one!
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(note => (
            <Card key={note.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <p className="text-card-title">{note.title}</p>
                  {note.sermon && (
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>{note.sermon}</p>
                  )}
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)', marginTop: 4 }}>{formatDate(note.date)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                  {[
                    { fn: () => editNote(note), icon: <Pencil size={14} />, bg: 'var(--dw-accent-bg)', color: 'var(--dw-accent)' },
                    { fn: () => deleteNote(note.id), icon: <Trash2 size={14} />, bg: 'var(--dw-border)', color: 'var(--dw-text-muted)' },
                  ].map(({ fn, icon, bg, color }, i) => (
                    <button key={i} onClick={fn} style={{
                      background: bg, border: 'none', borderRadius: 8, padding: '8px 12px',
                      color, cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 36,
                    }}>{icon}</button>
                  ))}
                </div>
              </div>
              {note.content && (
                <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.6, fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap' }}>
                  {note.content.slice(0, 150)}{note.content.length > 150 ? '...' : ''}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prayer Wall Panel ──────────────────────────────────────────────────────────
function PrayerWallPanel({
  userProfile,
  requireEmail,
}: {
  userProfile: { email?: string; name?: string; campus?: string } | null;
  requireEmail: (cb?: () => void) => void;
}) {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'my-campus'>('all');
  const [showForm, setShowForm] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prayedFor, setPrayedFor] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dw_prayed_for') || '[]')); } catch { return new Set(); }
  });

  const campus = userProfile?.campus || '';
  const campusName = CAMPUS_LABELS[campus] || '';

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchPrayers(filter, campus);
    setPrayers(data);
    setLoading(false);
  }, [filter, campus]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!prayerText.trim()) return;
    if (!userProfile?.email) { requireEmail(() => {}); return; }
    setSubmitting(true);
    const ok = await postPrayer(
      prayerText.trim(),
      userProfile.name || 'Anonymous',
      campus,
      userProfile.email,
    );
    setSubmitting(false);
    if (ok) {
      setPrayerText('');
      setShowForm(false);
      await load();
    }
  };

  const handlePray = async (id: string) => {
    if (prayedFor.has(id)) return;
    await prayForIt(id);
    const next = new Set(prayedFor).add(id);
    setPrayedFor(next);
    localStorage.setItem('dw_prayed_for', JSON.stringify([...next]));
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayerCount: p.prayerCount + 1 } : p));
  };

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Filter + add row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'my-campus'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
              background: filter === f ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: filter === f ? '#fff' : 'var(--dw-text-muted)',
              border: `1px solid ${filter === f ? 'var(--dw-accent)' : 'var(--dw-border)'}`,
              transition: 'all 0.15s ease',
            }}>
              {f === 'all' ? 'All Campuses' : (campusName || 'My Campus')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{
            background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
            borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
            color: 'var(--dw-text-muted)', display: 'flex', alignItems: 'center',
          }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button onClick={() => {
            if (!userProfile?.email) { requireEmail(() => {}); return; }
            setShowForm(v => !v);
          }} className="dw-btn-primary" style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Add Prayer
          </button>
        </div>
      </div>

      {/* New prayer form */}
      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <p className="text-section-header" style={{ marginBottom: 10 }}>SHARE A PRAYER REQUEST</p>
          <textarea
            placeholder="What would you like your church family to pray for?"
            value={prayerText}
            onChange={e => setPrayerText(e.target.value)}
            style={{
              width: '100%', minHeight: 100, background: 'var(--dw-surface)',
              border: '1px solid var(--dw-border)', borderRadius: 10, padding: 12,
              color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)',
              outline: 'none', resize: 'none', marginBottom: 10, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setPrayerText(''); }}
              className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!prayerText.trim() || submitting}
              className="dw-btn-primary"
              style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5,
                opacity: !prayerText.trim() || submitting ? 0.5 : 1 }}>
              {submitting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </Card>
      )}

      {/* Prayer list */}
      {loading && prayers.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
          <Loader2 size={18} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading prayer wall…</span>
        </div>
      ) : prayers.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <HandHeart size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            {filter === 'my-campus' ? 'No prayer requests from your campus yet.' : 'No prayer requests yet.'}
          </p>
          <p style={{ color: 'var(--dw-text-faint)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 6 }}>
            Be the first to share one.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {prayers.map(prayer => {
            const hasPrayed = prayedFor.has(prayer.id);
            return (
              <Card key={prayer.id} style={{ borderLeft: '3px solid var(--dw-accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                      {prayer.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                      {prayer.campusName} · {prayer.timeAgo}
                    </p>
                  </div>
                  <button onClick={() => handlePray(prayer.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: hasPrayed ? 'rgba(154,123,46,0.12)' : 'var(--dw-surface)',
                    border: `1px solid ${hasPrayed ? 'rgba(154,123,46,0.4)' : 'var(--dw-border)'}`,
                    borderRadius: 20, padding: '6px 12px', cursor: hasPrayed ? 'default' : 'pointer',
                    color: hasPrayed ? 'var(--dw-accent)' : 'var(--dw-text-muted)',
                    fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}>
                    <Heart size={12} fill={hasPrayed ? 'currentColor' : 'none'} />
                    {prayer.prayerCount > 0 ? prayer.prayerCount : ''} {hasPrayed ? 'Praying' : 'Pray'}
                  </button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {prayer.prayer}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return 'Recently'; }
}
