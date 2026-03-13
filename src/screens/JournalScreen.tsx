import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { Plus, PenLine, Bookmark, Trash2, X, Save, BookOpen, Video, Circle, Square, Share2, RotateCcw } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
  type: 'journal' | 'sermon' | 'saved';
  /** Set when this entry was created from a scripture note */
  verseRef?: string;
  highlightedText?: string;
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

/* ── Video Recorder Modal ── */
function VideoRecorderModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'preview' | 'recording' | 'playback'>('preview');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera preview
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(err => {
        if (!active) return;
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera & mic permissions and try again.');
        } else {
          setError('Could not access camera: ' + err.message);
        }
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setPhase('playback');
      // Show recorded video in preview element
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = url;
          previewRef.current.load();
        }
      }, 100);
    };
    mr.start(250);
    setElapsed(0);
    setPhase('recording');
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const retake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setPhase('preview');
    // Restart camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {});
  };

  const shareVideo = async () => {
    if (!recordedBlob || !recordedUrl) return;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([recordedBlob], `my-reflection.${ext}`, { type: recordedBlob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Reflection', text: 'Shared from Futures Daily Word' });
      } catch { /* cancelled */ }
    } else {
      // Fallback: trigger download
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = `my-reflection.${ext}`;
      a.click();
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(0,0,0,0.7)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 0,
        zIndex: 601,
        display: 'flex', flexDirection: 'column',
        background: '#0a0a0a',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          paddingTop: 'calc(16px + var(--safe-top, 0px))',
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {phase === 'recording' ? `Recording ${fmtTime(elapsed)}` : phase === 'playback' ? 'Preview' : 'Record Yourself'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 999, padding: 8, color: '#fff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
              <p style={{ color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 1.6 }}>{error}</p>
              <button
                onClick={onClose}
                style={{ marginTop: 20, background: 'var(--dw-accent)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Live preview (shown during preview + recording) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: phase === 'playback' ? 'none' : 'block',
                  transform: 'scaleX(-1)', // mirror front camera
                }}
              />
              {/* Playback video */}
              <video
                ref={previewRef}
                controls
                playsInline
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  display: phase === 'playback' ? 'block' : 'none',
                  background: '#000',
                }}
              />
              {/* Recording indicator */}
              {phase === 'recording' && (
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: '4px 12px',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30', animation: 'recBlink 1s ease infinite' }} />
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{fmtTime(elapsed)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div style={{
            padding: '24px 20px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}>
            {phase === 'preview' && (
              <button
                onClick={startRecording}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#ff3b30',
                  border: '4px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 0 0 6px rgba(255,59,48,0.2)',
                }}
              >
                <Circle size={28} fill="#fff" color="#fff" />
              </button>
            )}
            {phase === 'recording' && (
              <button
                onClick={stopRecording}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#ff3b30',
                  border: '4px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 0 0 6px rgba(255,59,48,0.2)',
                  animation: 'recPulse 1.5s ease infinite',
                }}
              >
                <Square size={24} fill="#fff" color="#fff" />
              </button>
            )}
            {phase === 'playback' && (
              <>
                <button
                  onClick={retake}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 999,
                    padding: '12px 20px', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600,
                  }}
                >
                  <RotateCcw size={18} /> Retake
                </button>
                <button
                  onClick={shareVideo}
                  style={{
                    background: 'var(--dw-accent)', border: 'none', borderRadius: 999,
                    padding: '12px 28px', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(154,123,46,0.4)',
                  }}
                >
                  <Share2 size={18} /> Share
                </button>
              </>
            )}
          </div>
        )}

        <style>{`
          @keyframes recBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          @keyframes recPulse {
            0%, 100% { box-shadow: 0 0 0 6px rgba(255,59,48,0.2); }
            50% { box-shadow: 0 0 0 12px rgba(255,59,48,0.1); }
          }
        `}</style>
      </div>
    </>
  );
}

export function JournalScreen() {
  const { userProfile, requireEmail } = useUser();
  const [activeTab, setActiveTab] = useState<'journal' | 'sermon' | 'saved'>('journal');
  const [entries, setEntries] = useState<JournalEntry[]>(getEntries);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  // Re-read entries every time the screen mounts so scripture notes from HomeScreen appear
  useEffect(() => {
    setEntries(getEntries());
  }, []);

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

          {/* Scripture context — shown for scripture notes */}
          {editingEntry.highlightedText && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(154,123,46,0.1)',
              borderLeft: '3px solid var(--dw-accent)',
              borderRadius: '0 8px 8px 0',
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {editingEntry.verseRef}
              </p>
              <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                "{editingEntry.highlightedText}"
              </p>
            </div>
          )}

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Record yourself button */}
            <button
              onClick={() => setShowRecorder(true)}
              title="Record a video reflection"
              style={{
                background: 'rgba(255,59,48,0.12)',
                border: '1px solid rgba(255,59,48,0.3)',
                borderRadius: 10,
                padding: '8px 14px',
                color: '#ff3b30',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Video size={15} /> Record
            </button>
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

                {/* Title row — scripture notes show verse ref with icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {entry.verseRef && (
                    <BookOpen size={13} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                  )}
                  <p className="text-card-title" style={{ margin: 0 }}>{entry.title}</p>
                </div>

                {/* Highlighted scripture quote */}
                {entry.highlightedText && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(154,123,46,0.1)',
                    borderLeft: '3px solid var(--dw-accent)',
                    borderRadius: '0 6px 6px 0',
                    marginBottom: 10,
                  }}>
                    <p style={{
                      fontSize: 13, color: 'var(--dw-text-secondary)', lineHeight: 1.5,
                      fontStyle: 'italic', fontFamily: 'var(--font-serif)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      "{entry.highlightedText}"
                    </p>
                  </div>
                )}

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

      {/* Video recorder modal */}
      {showRecorder && <VideoRecorderModal onClose={() => setShowRecorder(false)} />}
    </div>
  );
}
