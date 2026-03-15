import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { Pencil, Trash2, Plus, Loader2, Heart, HandHeart, RefreshCw, Send, ChevronLeft, BookOpen, Share2 } from 'lucide-react';
import { PrayerGlobe } from '../components/PrayerGlobe';
import { PRELOADED_SERMONS } from '../data/sermons';
import type { SermonData } from '../data/sermons';
import { ListenButton } from '../components/ListenButton';

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

// ── Sermon Detail View (redesigned — generous spacing, inline notes, italic scripture) ──
function SermonDetailView({ sermon, onBack }: { sermon: SermonData; onBack: () => void }) {
  // Inline notes per section — keyed by section index, persisted
  const storageKey = `dw_sermon_inline_${sermon.id}`;
  const [inlineNotes, setInlineNotes] = useState<Record<number, string>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);

  const updateNote = (idx: number, text: string) => {
    const next = { ...inlineNotes, [idx]: text };
    if (!text.trim()) delete next[idx];
    setInlineNotes(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const handleShare = () => {
    const shareText = `${sermon.title}\n${sermon.speaker}\n\n${sermon.keyVerseText}`;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      window.open('mailto:?subject=' + encodeURIComponent(sermon.title) + '&body=' + encodeURIComponent(shareText));
    }
  };

  return (
    <div style={{ padding: '0 0 140px' }}>
      {/* Back + Share row */}
      <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-sans)', padding: '4px 0',
        }}>
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={handleShare} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
          background: 'none', border: '1px solid var(--dw-border)',
          borderRadius: 8, cursor: 'pointer', color: 'var(--dw-text-muted)',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
        }}>
          <Share2 size={13} /> Share
        </button>
      </div>

      {/* ── Title block ── */}
      <div style={{ padding: '0 24px', marginBottom: 32 }}>
        {sermon.series && (
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
            {sermon.series}
          </p>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--dw-text-primary)', margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
          {sermon.title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {sermon.speaker} · {CAMPUS_LABELS[sermon.campus] || sermon.campus} · {new Date(sermon.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* ── Key Verse ── */}
      <div style={{ margin: '0 24px 36px', padding: '24px 20px', borderRadius: 16, background: 'var(--dw-card)', borderLeft: '4px solid var(--dw-accent)' }}>
        <p style={{ fontSize: 17, lineHeight: 1.8, fontFamily: 'var(--font-serif-text)', color: 'var(--dw-text-primary)', fontStyle: 'italic', margin: 0 }}>
          {sermon.keyVerseText}
        </p>
      </div>

      {/* Listen */}
      <div style={{ margin: '0 24px 36px' }}>
        <ListenButton text={sermon.plainText} size="lg" label="Listen to sermon notes" />
      </div>

      {/* ── Sections ── */}
      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sermon.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: 36 }}>

            {/* Section heading — large serif */}
            {section.heading && (
              <h2 style={{
                fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-serif)',
                color: 'var(--dw-text-primary)', margin: '0 0 16px', lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}>
                {section.heading}
              </h2>
            )}

            {/* Body paragraphs */}
            {section.body.split('\n').map((line, j) => {
              if (!line.trim()) return <div key={j} style={{ height: 14 }} />;
              return (
                <p key={j} style={{
                  fontSize: 16, lineHeight: 1.85, fontFamily: 'var(--font-serif-text)',
                  color: 'var(--dw-text-secondary)', marginBottom: 14,
                }}>
                  {line}
                </p>
              );
            })}

            {/* Numbered points */}
            {section.points && (
              <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {section.points.map((point, k) => {
                  const dashIdx = point.indexOf(' — ');
                  const label = dashIdx > -1 ? point.slice(0, dashIdx) : point;
                  const desc = dashIdx > -1 ? point.slice(dashIdx + 3) : '';
                  return (
                    <div key={k} style={{ paddingLeft: 20, borderLeft: '2px solid var(--dw-accent)', paddingTop: 4, paddingBottom: 4 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: '0 0 4px' }}>
                        {label}
                      </p>
                      {desc && (
                        <p style={{ fontSize: 15, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-serif-text)', margin: 0, lineHeight: 1.7 }}>
                          {desc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scripture — italic, indented, gold border */}
            {section.scripture && (
              <div style={{ margin: '20px 0 8px', padding: '20px 22px', borderLeft: '3px solid var(--dw-accent)', background: 'rgba(154,123,46,0.04)', borderRadius: '0 12px 12px 0' }}>
                {section.scriptureRef && (
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                    {section.scriptureRef}
                  </p>
                )}
                {section.scripture.split('\n\n').map((verse, v) => (
                  <p key={v} style={{
                    fontSize: 16, lineHeight: 1.85, fontFamily: 'var(--font-serif-text)',
                    color: 'var(--dw-text-primary)', fontStyle: 'italic',
                    marginBottom: v < section.scripture!.split('\n\n').length - 1 ? 14 : 0,
                  }}>
                    {verse}
                  </p>
                ))}
              </div>
            )}

            {/* ── Inline note area ── */}
            {activeNoteIdx === i ? (
              <div style={{ marginTop: 16 }}>
                <textarea
                  autoFocus
                  value={inlineNotes[i] || ''}
                  onChange={e => updateNote(i, e.target.value)}
                  onBlur={() => { if (!inlineNotes[i]?.trim()) setActiveNoteIdx(null); }}
                  placeholder="Write your thoughts here..."
                  style={{
                    width: '100%', minHeight: 80, background: 'var(--dw-surface)',
                    border: '1px solid var(--dw-border)', borderRadius: 12, padding: '14px 16px',
                    color: 'var(--dw-text-primary)', fontSize: 15, fontFamily: 'var(--font-sans)',
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    lineHeight: 1.6,
                  }}
                />
              </div>
            ) : inlineNotes[i] ? (
              <div
                onClick={() => setActiveNoteIdx(i)}
                style={{
                  marginTop: 16, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  background: 'rgba(154,123,46,0.06)', border: '1px dashed rgba(154,123,46,0.3)',
                }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>MY NOTE</p>
                <p style={{ fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {inlineNotes[i]}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setActiveNoteIdx(i)}
                style={{
                  marginTop: 12, padding: '10px 16px',
                  background: 'none', border: '1px dashed var(--dw-border)',
                  borderRadius: 10, cursor: 'pointer', width: '100%',
                  color: 'var(--dw-text-faint)', fontSize: 13, fontFamily: 'var(--font-sans)',
                  textAlign: 'left', transition: 'border-color 0.2s',
                }}>
                + Add your notes here...
              </button>
            )}

            {/* Section divider */}
            {i < sermon.sections.length - 1 && section.heading && (
              <div style={{ marginTop: 32, borderBottom: '1px solid var(--dw-border)' }} />
            )}
          </div>
        ))}
      </div>
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
  const [viewingSermon, setViewingSermon] = useState<SermonData | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const storedNotes = localStorage.getItem('dw_sermon_notes');
      if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Auto-open sermon from HomeScreen shortcut
  useEffect(() => {
    const pendingId = localStorage.getItem('dw_open_sermon_id');
    if (pendingId) {
      localStorage.removeItem('dw_open_sermon_id');
      const found = PRELOADED_SERMONS.find(s => s.id === pendingId);
      if (found) setViewingSermon(found);
    }
  }, []);

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

  // If viewing a full sermon detail
  if (viewingSermon) {
    return <SermonDetailView sermon={viewingSermon} onBack={() => setViewingSermon(null)} />;
  }

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

      {/* ── Pre-loaded Sermons from Leadership ── */}
      {PRELOADED_SERMONS.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="text-section-header" style={{ marginBottom: 10 }}>FROM YOUR PASTORS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRELOADED_SERMONS.map(sermon => (
              <Card key={sermon.id} onClick={() => setViewingSermon(sermon)}
                style={{ cursor: 'pointer', borderLeft: '3px solid var(--dw-accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: 'var(--dw-accent-bg, rgba(200,146,14,0.12))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BookOpen size={18} color="var(--dw-accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.3 }}>
                      {sermon.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>
                      {sermon.speaker} · {new Date(sermon.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: 'var(--dw-text-faint)', flexShrink: 0 }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── User's own notes ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
          <Loader2 size={18} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading notes...</span>
        </div>
      ) : notes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Pencil size={24} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            No personal sermon notes yet. Create your first one!
          </p>
        </Card>
      ) : (
        <>
          <p className="text-section-header" style={{ marginBottom: 10 }}>MY NOTES</p>
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
        </>
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

      {/* Prayer Globe — world map showing prayer activity */}
      <div style={{ marginBottom: 16 }}>
        <PrayerGlobe
          prayers={prayers.map(p => ({ campus: p.campus, prayerCount: p.prayerCount }))}
          style={{ border: '1px solid var(--dw-border)' }}
        />
        {prayers.length > 0 && (
          <p style={{
            textAlign: 'center', fontSize: 11, color: 'var(--dw-text-muted)',
            fontFamily: 'var(--font-sans)', marginTop: 8, fontStyle: 'italic',
          }}>
            {prayers.length} prayer request{prayers.length !== 1 ? 's' : ''} across the global church
          </p>
        )}
      </div>

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
