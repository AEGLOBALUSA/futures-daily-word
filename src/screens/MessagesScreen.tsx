import { useState, useEffect, useCallback } from 'react';
import { track } from '../utils/analytics';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useUser } from '../contexts/UserContext';
import { Pencil, Trash2, Plus, Loader2, Heart, HandHeart, RefreshCw, Send, CheckCircle, MessageSquare, MapPin } from 'lucide-react';
import { PrayerGlobe } from '../components/PrayerGlobe';
import { CampusSelect } from '../components/CampusSelect';
import { t, getLang, dateLocale } from '../utils/i18n';
import { pushNow } from '../utils/cloudSync';
import { API_BASE } from '../utils/api-base';

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

// ── {t("prayer_wall", lang)} API ────────────────────────────────────────────────────────────
const API = `${API_BASE}/.netlify/functions/prayer-wall`;

async function fetchPrayers(filter: 'all' | 'my-campus', campus: string): Promise<{ prayers: Prayer[]; error: boolean }> {
  try {
    const url = filter === 'my-campus' && campus
      ? `${API}?filter=my-campus&campus=${encodeURIComponent(campus)}`
      : `${API}?filter=all`;
    const res = await fetch(url);
    if (!res.ok) return { prayers: [], error: true };
    const data = await res.json();
    return { prayers: data.prayers || [], error: false };
  } catch {
    return { prayers: [], error: true };
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

// ── {t("pastors_corner", lang)} Panel ────────────────────────────────────────────────────
interface CampusItem { id: string; type: string; title: string; content: string; author: string; date: string; }

function PastorsCornerPanel({ userProfile, setup }: { userProfile: any; setup: any }) {
  const { saveProfile, requireEmail } = useUser();
  const campus = userProfile?.campus || '';
  const isPastor = setup?.persona === 'pastor_leader' || setup?.persona === 'pastor';
  const [items, setItems] = useState<CampusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(getLang());
  useEffect(() => { const h = () => setLang(getLang()); window.addEventListener('dw-lang-changed', h); return () => window.removeEventListener('dw-lang-changed', h); }, []);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('announcement');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  // Prefill from the remembered code (also written by the Home campus stats
  // card) so a pastor types it once, not on every post.
  const [pastorCode, setPastorCode] = useState(() => {
    try { return localStorage.getItem('dw_pastor_code') || ''; } catch { return ''; }
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!campus) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/campus-content?campus=${encodeURIComponent(campus)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [campus]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handlePost = async () => {
    if (!postTitle.trim() || !postContent.trim() || !pastorCode.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/campus-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campus,
          type: postType,
          title: postTitle.trim(),
          content: postContent.trim(),
          author: userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Pastor',
          code: pastorCode.trim(),
        }),
      });
      if (res.ok) {
        // Remember the accepted code (uppercase — the shape the server checks
        // and the Home campus stats card reads) so it prefills next time.
        try { localStorage.setItem('dw_pastor_code', pastorCode.trim().toUpperCase()); } catch { /* quota */ }
        setPosted(true);
        setPostTitle('');
        setPostContent('');
        setShowPostForm(false);
        setTimeout(() => setPosted(false), 2000);
        fetchItems();
        track('campus_content_post', postType);
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        alert(err.error || t('post_failed_check_code', getLang()));
      }
    } catch { alert(t('network_error', getLang())); }
    setPosting(false);
  };

  if (!campus) {
    // The moment of highest intent — offer the actual picker here instead of
    // a text instruction pointing at the Settings tab.
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <MapPin size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', lineHeight: 1.5, marginBottom: 16 }}>
          {t('choose_campus_here', lang)}
        </p>
        <div style={{ textAlign: 'left' }}>
          <CampusSelect
            value=""
            onChange={campusId => {
              if (!campusId) return;
              if (userProfile) {
                saveProfile({ ...userProfile, campus: campusId });
              } else {
                requireEmail();
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Type config: label, color, icon emoji
  const typeConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    announcement: { label: t('msg_announcement', lang), color: '#D97706', bg: 'rgba(217,119,6,0.10)', icon: '' },
    sermon_note:  { label: t('msg_sermon_note', lang),  color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', icon: '' },
    essay:        { label: t('msg_essay', lang),         color: 'var(--dw-info)', bg: 'rgba(37,99,235,0.10)', icon: '' },
    note:         { label: t('msg_note', lang),          color: 'var(--dw-text-muted)', bg: 'var(--dw-surface-hover)', icon: '' },
    prayer_point: { label: t('msg_prayer_point', lang),  color: '#059669', bg: 'rgba(5,150,105,0.10)', icon: '' },
    video:        { label: t('msg_video', lang),         color: '#DC2626', bg: 'rgba(220,38,38,0.10)', icon: '' },
  };

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* Pastor post button */}
      {isPastor && !showPostForm && (
        <button
          onClick={() => setShowPostForm(true)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14,
            background: 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
            border: 'none', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 2px 12px rgba(168,50,59,0.3)',
          }}
        >
          <Plus size={18} /> Post to Your Campus
        </button>
      )}

      {/* Post form */}
      {isPastor && showPostForm && (
        <div style={{
          marginBottom: 20, padding: '20px',
          background: 'var(--dw-card)', borderRadius: 16,
          border: '1px solid var(--dw-border)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)' }}>
              New Post
            </span>
            <button onClick={() => setShowPostForm(false)} style={{
              background: 'var(--dw-surface-hover)', border: 'none', cursor: 'pointer',
              color: 'var(--dw-text-muted)', padding: '4px 8px', borderRadius: 6,
              fontSize: 12, fontFamily: 'var(--font-sans)',
            }}>
              Cancel
            </button>
          </div>

          {/* Type selector */}
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Type
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {['announcement', 'sermon_note', 'essay', 'prayer_point'].map(t => {
              const tc = typeConfig[t];
              const active = postType === t;
              return (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: `1.5px solid ${active ? tc.color : 'var(--dw-border)'}`,
                    background: active ? tc.bg : 'transparent',
                    color: active ? tc.color : 'var(--dw-text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                >
                  {tc.icon} {tc.label}
                </button>
              );
            })}
          </div>

          <input
            value={postTitle}
            onChange={e => setPostTitle(e.target.value)}
            placeholder={t('title_placeholder', lang)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--dw-border)', background: 'var(--dw-surface)',
              color: 'var(--dw-text)', fontSize: 15, fontWeight: 600,
              fontFamily: 'var(--font-sans)', marginBottom: 10, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            value={postContent}
            onChange={e => setPostContent(e.target.value)}
            placeholder={t('write_message_placeholder', lang)}
            rows={5}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--dw-border)', background: 'var(--dw-surface)',
              color: 'var(--dw-text)', fontSize: 14, fontFamily: 'var(--font-serif-text)',
              marginBottom: 10, outline: 'none', resize: 'none',
              boxSizing: 'border-box', lineHeight: 1.6,
            }}
          />
          <input
            value={pastorCode}
            onChange={e => setPastorCode(e.target.value)}
            placeholder={t('enter_pastor_code_placeholder', lang)}
            type="password"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid var(--dw-border)', background: 'var(--dw-surface)',
              color: 'var(--dw-text)', fontSize: 14, fontFamily: 'var(--font-sans)',
              marginBottom: 6, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.4 }}>
            {t('pastor_code_hint', lang)}
          </p>
          <button
            onClick={handlePost}
            disabled={posting || !postTitle.trim() || !postContent.trim() || !pastorCode.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: posting ? 'var(--dw-border)' : 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              opacity: (!postTitle.trim() || !postContent.trim() || !pastorCode.trim()) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {posting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Publishing...</> : <><Send size={16} /> Publish</>}
          </button>
        </div>
      )}

      {posted && (
        <div style={{
          textAlign: 'center', padding: '10px 16px', marginBottom: 14,
          background: 'rgba(37,99,235,0.08)', borderRadius: 10,
          color: 'var(--dw-info)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
        }}>
          <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Published to your campus!
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Loader2 size={24} style={{ color: 'var(--dw-text-muted)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--dw-text-faint)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 8 }}>
            Loading updates...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--dw-surface-hover)', margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={24} style={{ color: 'var(--dw-text-faint)' }} />
          </div>
          <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
            No updates yet
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
            Your campus pastor hasn't posted anything yet. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const isExpanded = expandedItem === item.id;
            const tc = typeConfig[item.type] || typeConfig.note;
            return (
              <div
                key={item.id}
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                style={{
                  background: 'var(--dw-card)',
                  border: '1px solid var(--dw-border)',
                  borderLeft: `3px solid ${tc.color}`,
                  borderRadius: '0 14px 14px 0',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: tc.color,
                      fontFamily: 'var(--font-sans)',
                      background: tc.bg, padding: '2px 8px', borderRadius: 4,
                    }}>
                      {tc.icon} {tc.label}
                    </span>
                    <p style={{
                      fontSize: 16, fontWeight: 600, color: 'var(--dw-text-primary)',
                      fontFamily: 'var(--font-serif)', margin: '8px 0 0', lineHeight: 1.3,
                    }}>
                      {item.title}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap', marginLeft: 12, marginTop: 2,
                  }}>
                    {item.date}
                  </span>
                </div>

                {!isExpanded && item.content.length > 100 && (
                  <p style={{
                    fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                    margin: '4px 0 0', lineHeight: 1.5,
                  }}>
                    {item.content.slice(0, 100)}...
                  </p>
                )}

                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--dw-border-subtle)' }}>
                    <p style={{
                      fontSize: 15, lineHeight: 1.75, color: 'var(--dw-text-secondary)',
                      fontFamily: 'var(--font-serif-text)', whiteSpace: 'pre-wrap', margin: 0,
                    }}>
                      {item.content}
                    </p>
                    {item.author && (
                      <p style={{
                        fontSize: 12, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)',
                        marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--dw-border-subtle)',
                        fontStyle: 'normal',
                      }}>
                        -- {item.author}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function MessagesScreen({ onBack }: { onBack?: () => void }) {
  const { userProfile, requireEmail, setup } = useUser();
  const [lang, setLang] = useState(getLang());
  useEffect(() => { const h = () => setLang(getLang()); window.addEventListener('dw-lang-changed', h); return () => window.removeEventListener('dw-lang-changed', h); }, []);

  const [activeTab, setActiveTab] = useState<'pastor' | 'notes' | 'prayer'>('pastor');

  // Re-tap of the Campus tab in the tab bar → back to the tab's root state.
  useEffect(() => {
    const onReset = () => {
      setActiveTab('pastor');
      document.querySelector('.screen-container')?.scrollTo({ top: 0 });
    };
    window.addEventListener('dw-tab-reset', onReset);
    return () => window.removeEventListener('dw-tab-reset', onReset);
  }, []);

  return (
    <div className="screen-container">
      <ScreenHeader title={t("campus_title", lang)} onBack={onBack} />
      {/* Tab switcher */}
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400,
          color: 'var(--dw-text-primary)', letterSpacing: '-0.02em', marginBottom: 16,
        }}>
          Campus
        </h1>
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          background: 'var(--dw-surface)', borderRadius: 12, padding: 4,
          border: '1px solid var(--dw-border)',
        }}>
          {(['pastor', 'notes', 'prayer'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px 0',
              background: activeTab === tab ? 'var(--dw-accent)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--dw-text-muted)',
              border: 'none', borderRadius: 9, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s ease',
            }}>
              {tab === 'pastor' ? t("pastors_corner", lang) : tab === 'notes' ? t("sermons", lang) : t("prayer_wall", lang)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pastor'
        ? <PastorsCornerPanel userProfile={userProfile} setup={setup} />
        : activeTab === 'notes'
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
    pushNow(); // back up sermon notes to the cloud (misc bag)
    setFormData({ title: '', sermon: '', content: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('dw_sermon_notes', JSON.stringify(updated));
    pushNow();
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
          <h2 className="text-section-header" style={{ marginBottom: 12 }}>
            {editingId ? t('edit_note_header', getLang()) : t('new_sermon_note', getLang())}
          </h2>
          {[
            { placeholder: t('note_title_placeholder', getLang()), key: 'title', fontSize: 14 },
            { placeholder: t('sermon_title_placeholder', getLang()), key: 'sermon', fontSize: 13 },
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
          <textarea placeholder={t('write_notes', getLang())} value={formData.content}
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
              className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>{t('cancel_label', getLang())}</button>
            <button onClick={saveNote} disabled={!formData.title.trim() || !formData.content.trim()}
              className="dw-btn-primary"
              style={{ fontSize: 13, padding: '8px 16px', opacity: !formData.title.trim() || !formData.content.trim() ? 0.5 : 1 }}>
              {editingId ? t('update_label', getLang()) : t('save', getLang())}
            </button>
          </div>
        </Card>
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
          <h2 className="text-section-header" style={{ marginBottom: 10 }}>{t('j_my_notes', getLang())}</h2>
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
                      { fn: () => { if (window.confirm('Delete this sermon note?')) deleteNote(note.id); }, icon: <Trash2 size={14} />, bg: 'var(--dw-border)', color: 'var(--dw-text-muted)' },
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
  const [lang, setLang] = useState(getLang());
  useEffect(() => { const h = () => setLang(getLang()); window.addEventListener('dw-lang-changed', h); return () => window.removeEventListener('dw-lang-changed', h); }, []);
  const [loading, setLoading] = useState(true);
  const [prayerError, setPrayerError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-campus'>('all');
  const [showForm, setShowForm] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayedFor, setPrayedFor] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dw_prayed_for') || '[]')); } catch { return new Set(); }
  });

  const campus = userProfile?.campus || '';
  const campusName = CAMPUS_LABELS[campus] || '';

  const load = useCallback(async () => {
    setLoading(true);
    setPrayerError(false);
    const result = await fetchPrayers(filter, campus);
    setPrayers(result.prayers);
    setPrayerError(result.error);
    setLoading(false);
  }, [filter, campus]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!prayerText.trim()) return;
    if (!userProfile?.email) { requireEmail(() => {}); return; }
    setSubmitting(true);
    const ok = await postPrayer(
      prayerText.trim(),
      isAnonymous ? 'Anonymous' : (userProfile.name || 'Anonymous'),
      campus,
      userProfile.email,
    );
    setSubmitting(false);
    if (ok) {
      track('prayer_submit', campus);
      setPrayerText('');
      setIsAnonymous(false);
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
    pushNow(); // back up prayed-for set (misc bag)
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
              {f === 'all' ? t('all_campuses', lang) : (campusName || t('my_campus', lang))}
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
            <Plus size={14} /> {t('add_prayer', lang)}
          </button>
        </div>
      </div>

      {/* New prayer form */}
      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10 }}>{t('share_prayer_request', lang)}</h2>
          <textarea
            placeholder={t('pray_placeholder', getLang())}
            value={prayerText}
            onChange={e => setPrayerText(e.target.value)}
            style={{
              width: '100%', minHeight: 100, background: 'var(--dw-surface)',
              border: '1px solid var(--dw-border)', borderRadius: 10, padding: 12,
              color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)',
              outline: 'none', resize: 'none', marginBottom: 10, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              style={{ cursor: 'pointer', width: 18, height: 18 }}
            />
            <label style={{ fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-primary)', cursor: 'pointer' }}>
              {t('post_anonymously', lang)}
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setPrayerText(''); setIsAnonymous(false); }}
              className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }}>{t('cancel_label', lang)}</button>
            <button onClick={handleSubmit} disabled={!prayerText.trim() || submitting}
              className="dw-btn-primary"
              style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5,
                opacity: !prayerText.trim() || submitting ? 0.5 : 1 }}>
              {submitting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {submitting ? t('posting_label', lang) : t('post_label', lang)}
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
            fontFamily: 'var(--font-sans)', marginTop: 8, fontStyle: 'normal',
          }}>
            {prayers.length === 1 ? t('prayer_count_one', lang) : t('prayer_count_many', lang).replace('{n}', String(prayers.length))}
          </p>
        )}
      </div>

      {/* Prayer list */}
      {loading && prayers.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
          <Loader2 size={18} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>{t('loading_prayer_wall', lang)}</span>
        </div>
      ) : prayerError ? (
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            {t('prayers_load_error', lang)}
          </p>
          <button onClick={load} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, background: 'var(--dw-accent)', color: '#fff', border: 'none', fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            {t('try_again', lang)}
          </button>
        </Card>
      ) : prayers.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '32px 16px' }}>
          <HandHeart size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
            {filter === 'my-campus' ? t('no_prayers_campus', lang) : t('no_prayers_yet', lang)}
          </p>
          <p style={{ color: 'var(--dw-text-faint)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 6 }}>
            {t('be_first_share', lang)}
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
                    {prayer.prayerCount > 0 ? prayer.prayerCount : ''} {hasPrayed ? t('praying_label', lang) : t('pray_label', lang)}
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
    if (days === 0) return t('today', getLang());
    if (days === 1) return t('yesterday', getLang());
    if (days < 7) return t('days_ago', getLang()).replace('{n}', String(days));
    return d.toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
  } catch { return t('recently', getLang()); }
}
