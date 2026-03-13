import { useState, useRef, useEffect } from 'react';
import { X, Check, BookOpen } from 'lucide-react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';

interface VerseNoteDrawerProps {
  open: boolean;
  onClose: () => void;
}

const JOURNAL_KEY = 'dw_journal';

function saveToJournal(verseRef: string, highlightedText: string, note: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    existing.unshift({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      type: 'journal',
      title: verseRef || 'Scripture Note',
      body: note,
      tags: ['scripture'],
      verseRef,
      highlightedText,
    });
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(existing.slice(0, 500)));
  } catch {}
}

export function VerseNoteDrawer({ open, onClose }: VerseNoteDrawerProps) {
  const { selection } = useScriptureSelection();
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setSaved(false);
      setNote('');
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [open]);

  const handleSave = () => {
    if (!selection || !note.trim()) return;
    const ref = selection.verseRefs[0] || '';
    saveToJournal(ref, selection.text, note);
    setSaved(true);
    setTimeout(() => {
      onClose();
      setSaved(false);
    }, 1200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 96,
          background: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: open ? 0 : '-100%',
        zIndex: 97,
        background: 'var(--dw-canvas)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        transition: 'bottom 0.3s cubic-bezier(0.32,0.72,0,1)',
        maxHeight: '75vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--dw-border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="var(--dw-accent)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Add Note</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Highlighted passage */}
        {selection && (
          <div style={{
            margin: '0 20px 12px',
            padding: '10px 14px',
            background: 'rgba(154,123,46,0.12)',
            borderLeft: '3px solid var(--dw-accent)',
            borderRadius: '0 8px 8px 0',
          }}>
            {selection.verseRefs[0] && (
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {selection.verseRefs[0]}
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--dw-text)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '…' : ''}"
            </p>
          </div>
        )}

        {/* Note input */}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Write your reflection, prayer, or observation..."
          style={{
            margin: '0 20px',
            padding: '12px',
            borderRadius: 12,
            border: '1.5px solid var(--dw-border)',
            background: 'var(--dw-card)',
            color: 'var(--dw-text)',
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'none',
            minHeight: 120,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Save button */}
        <div style={{ padding: '14px 20px' }}>
          <button
            onClick={handleSave}
            disabled={!note.trim() || saved}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              background: saved ? '#4A6340' : 'var(--dw-accent)',
              color: '#fff', border: 'none', cursor: note.trim() ? 'pointer' : 'default',
              fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              opacity: !note.trim() && !saved ? 0.5 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saved ? <><Check size={16} /> Saved to Journal</> : 'Save to Journal'}
          </button>
        </div>
      </div>
    </>
  );
}
