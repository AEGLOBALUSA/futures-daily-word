import { useState, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { Plus, PenLine, Bookmark, Trash2, X, Save } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
  type: 'journal' | 'sermon' | 'saved';
}

/* ── localStorage helpers ── */
function getEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem('dw_journal') || '[]');
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem('dw_journal', JSON.stringify(entries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function JournalScreen() {
  const { userProfile, requireEmail } = useUser();
  const [activeTab, setActiveTab] = useState<'journal' | 'sermon' | 'saved'>('journal');
  const [entries, setEntries] = useState<JournalEntry[]>(getEntries);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const tabs = [
    { id: 'journal' as const, label: 'Journal', icon: PenLine },
    { id: 'sermon' as const, label: 'Sermons', icon: PenLine },
    { id: 'saved' as const, label: 'Saved', icon: Bookmark },
  ];

  const filteredEntries = entries.filter(e => e.type === activeTab);

  const openNewEntry = useCallback(() => {
    if (!userProfile?.email) { requireEmail(); return; }
    setEditingEntry({
      id: generateId(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      title: '',
      body: '',
      tags: [],
      type: activeTab === 'saved' ? 'journal' : activeTab,
    });
    setShowEditor(true);
  }, [activeTab, userProfile, requireEmail]);

  const openEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry({ ...entry });
    setShowEditor(true);
  }, []);

  const saveEntry = useCallback(() => {
    if (!editingEntry || !editingEntry.title.trim()) return;
    const all = getEntries();
    const idx = all.findIndex(e => e.id === editingEntry.id);
    if (idx >= 0) {
      all[idx] = editingEntry;
    } else {
      all.unshift(editingEntry);
    }
    saveEntries(all);
    setEntries(all);
    setShowEditor(false);
    setEditingEntry(null);
  }, [editingEntry]);

  const deleteEntry = useCallback((id: string) => {
    const all = getEntries().filter(e => e.id !== id);
    saveEntries(all);
    setEntries(all);
    setShowEditor(false);
    setEditingEntry(null);
  }, []);

  const addTag = useCallback((tag: string) => {
    if (!editingEntry || editingEntry.tags.includes(tag)) return;
    setEditingEntry({ ...editingEntry, tags: [...editingEntry.tags, tag] });
  }, [editingEntry]);

  const removeTag = useCallback((tag: string) => {
    if (!editingEntry) return;
    setEditingEntry({ ...editingEntry, tags: editingEntry.tags.filter(t => t !== tag) });
  }, [editingEntry]);

  // Full-screen editor overlay
  if (showEditor && editingEntry) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--dw-canvas)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Editor Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--dw-border)',
          paddingTop: 'calc(16px + var(--safe-top, 0px))',
        }}>
          <button
            onClick={() => { setShowEditor(false); setEditingEntry(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={22} />
          </button>
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
            {editingEntry.type === 'sermon' ? 'Sermon Notes' : 'Journal Entry'}
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => deleteEntry(editingEntry.id)}
              style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={saveEntry}
              disabled={!editingEntry.title.trim()}
              style={{
                background: 'var(--dw-accent)', border: 'none', borderRadius: 8,
                padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                opacity: !editingEntry.title.trim() ? 0.5 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
            {editingEntry.date}
          </p>
          <input
            type="text"
            placeholder="Title..."
            value={editingEntry.title}
            onChange={e => setEditingEntry({ ...editingEntry, title: e.target.value })}
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: 'var(--dw-text-primary)', fontSize: 22,
              fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 16,
            }}
          />
          <textarea
            placeholder={editingEntry.type === 'sermon' ? 'Write your sermon notes...' : 'Write your thoughts...'}
            value={editingEntry.body}
            onChange={e => setEditingEntry({ ...editingEntry, body: e.target.value })}
            style={{
              width: '100%', minHeight: 300, background: 'none', border: 'none',
              outline: 'none', color: 'var(--dw-text-secondary)', fontSize: 15,
              lineHeight: 1.8, fontFamily: 'var(--font-sans)', resize: 'none',
            }}
          />

          {/* Tags */}
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
              Tags
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {editingEntry.tags.map(tag => (
                <span
                  key={tag}
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                    fontSize: 11, padding: '3px 10px', borderRadius: 999,
                    fontFamily: 'var(--font-sans)', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {tag} ×
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['reflection', 'prayer', 'gratitude', 'confession', 'sermon', 'study', 'psalms', 'gospel'].map(tag => (
                !editingEntry.tags.includes(tag) && (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    style={{
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 999, padding: '4px 10px', fontSize: 11,
                      color: 'var(--dw-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    + {tag}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26, fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Journal
          </h1>
          <button
            onClick={openNewEntry}
            style={{
              background: 'var(--dw-accent)', border: 'none', borderRadius: 10,
              padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44, fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={16} /> New Entry
          </button>
        </div>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--dw-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                background: activeTab === id ? 'var(--dw-accent)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--dw-text-muted)',
                border: 'none', borderRadius: 8, padding: '10px 0',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                minHeight: 44, fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {filteredEntries.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px 16px' }}>
            <PenLine size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
              {activeTab === 'journal' ? 'No journal entries yet' : activeTab === 'sermon' ? 'No sermon notes yet' : 'No saved items yet'}
            </p>
            <button className="dw-btn-primary" style={{ fontSize: 13 }} onClick={openNewEntry}>
              Create Your First Entry
            </button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredEntries.map(entry => (
              <Card key={entry.id} onClick={() => openEntry(entry)}>
                <p style={{
                  color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {entry.date}
                </p>
                <p className="text-card-title" style={{ marginBottom: 8 }}>{entry.title}</p>
                <p style={{
                  color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.5,
                  fontFamily: 'var(--font-sans)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {entry.body}
                </p>
                {entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {entry.tags.map(tag => (
                      <span key={tag} style={{
                        background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                        fontSize: 11, padding: '3px 10px', borderRadius: 999,
                        fontFamily: 'var(--font-sans)', fontWeight: 500,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
