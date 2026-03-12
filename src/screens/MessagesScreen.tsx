import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

interface SermonNote {
  id: string;
  title: string;
  date: string;
  content: string;
  sermon?: string;
}

export function MessagesScreen() {
  const { userProfile, requireEmail } = useUser();
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', sermon: '', content: '' });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const storedNotes = localStorage.getItem('dw_sermon_notes');
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch {
      // Use default empty notes
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNote = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (!userProfile?.email) {
      requireEmail();
      return;
    }

    const newNote: SermonNote = {
      id: editingId || Date.now().toString(),
      title: formData.title,
      sermon: formData.sermon,
      content: formData.content,
      date: new Date().toISOString().slice(0, 10),
    };

    let updated: SermonNote[];
    if (editingId) {
      updated = notes.map(n => n.id === editingId ? newNote : n);
    } else {
      updated = [newNote, ...notes];
    }

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
            Sermon Notes
          </h1>
          <button
            className="dw-btn-primary"
            style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
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
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Capture insights from sermons and teachings
        </p>

        {/* New/Edit Note Form */}
        {showForm && (
          <Card style={{ marginBottom: 20 }}>
            <p className="text-section-header" style={{ marginBottom: 12 }}>
              {editingId ? 'EDIT NOTE' : 'NEW SERMON NOTE'}
            </p>
            <input
              type="text"
              placeholder="Note title..."
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              style={{
                width: '100%', background: 'var(--dw-surface)',
                border: '1px solid var(--dw-border)', borderRadius: 10,
                padding: '12px 14px', color: 'var(--dw-text-primary)', fontSize: 14,
                fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 12,
                minHeight: 44,
              }}
            />
            <input
              type="text"
              placeholder="Sermon title (optional)..."
              value={formData.sermon}
              onChange={e => setFormData({ ...formData, sermon: e.target.value })}
              style={{
                width: '100%', background: 'var(--dw-surface)',
                border: '1px solid var(--dw-border)', borderRadius: 10,
                padding: '12px 14px', color: 'var(--dw-text-primary)', fontSize: 13,
                fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 12,
                minHeight: 44,
              }}
            />
            <textarea
              placeholder="Write your notes..."
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              style={{
                width: '100%', minHeight: 120, background: 'var(--dw-surface)',
                border: '1px solid var(--dw-border)', borderRadius: 10,
                padding: 12, color: 'var(--dw-text-primary)', fontSize: 14,
                fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical', marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setFormData({ title: '', sermon: '', content: '' }); }}
                className="dw-btn-secondary"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={!formData.title.trim() || !formData.content.trim()}
                className="dw-btn-primary"
                style={{
                  fontSize: 13, padding: '8px 16px',
                  opacity: !formData.title.trim() || !formData.content.trim() ? 0.5 : 1,
                }}
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </Card>
        )}

        {/* Notes list */}
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
                      <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                        {note.sermon}
                      </p>
                    )}
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                      {formatDate(note.date)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    <button
                      onClick={() => editNote(note)}
                      style={{
                        background: 'var(--dw-accent-bg)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: 'var(--dw-accent)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 36,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      style={{
                        background: 'var(--dw-border)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: 'var(--dw-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 36,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
