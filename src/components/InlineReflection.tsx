/**
 * InlineReflection — turns the home "Reflect" prompt from dead static text into a
 * one-tap, in-context journal capture: tap to expand, write a thought, save it to
 * the journal without leaving the page. This is the habit-forming hook of the daily
 * loop (read → REFLECT → done). Saving also counts toward the daily streak.
 */
import { useState, useRef, useEffect } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { pushNow } from '../utils/cloudSync';
import { recordStreakToday } from '../utils/streak';

interface InlineReflectionProps {
  label: string;        // 'Reflect' / 'Sit with this'
  prompt: string;       // the reflection question (also used as the entry title/context)
  tone?: 'comfort' | 'default';
  verseRef?: string;    // today's passage, so the entry links back to what was read
  savedLabel?: string;  // confirmation copy
  placeholder?: string;
}

export function InlineReflection({
  label, prompt, tone = 'default', verseRef, savedLabel = 'Saved to your journal', placeholder = 'Write your thought…',
}: InlineReflectionProps) {
  const comfort = tone === 'comfort';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 250);
  }, [open]);

  const save = () => {
    if (saved) return; // guard against a same-tick double-fire
    const body = text.trim();
    if (!body) return;
    try {
      const entries = JSON.parse(localStorage.getItem('dw_journal') || '[]');
      const now = new Date();
      entries.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        title: prompt,
        body,
        tags: ['reflection', 'scripture'],
        type: 'journal',
        verseRef,
        planContext: prompt,
        updatedAt: now.toISOString(),
      });
      localStorage.setItem('dw_journal', JSON.stringify(entries.slice(0, 5000)));
      window.dispatchEvent(new Event('dw-journal-updated'));
      pushNow();
      recordStreakToday(); // reflecting is real engagement — it counts toward the streak
    } catch { /* ignore */ }
    setSaved(true);
  };

  const accent = comfort ? '#5C6BC0' : 'var(--dw-accent)';
  const cardBg = comfort
    ? 'linear-gradient(135deg, rgba(92,107,192,0.08) 0%, rgba(92,107,192,0.03) 100%)'
    : 'var(--dw-charcoal)';
  const cardBorder = comfort ? '1px solid rgba(92,107,192,0.15)' : '1px solid rgba(255,255,255,0.06)';

  return (
    <div
      className={comfort ? undefined : 'dw-dark-surface'}
      style={{ marginTop: 16, padding: '12px 14px', background: cardBg, borderRadius: 10, border: cardBorder }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: comfort ? '#5C6BC0' : 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>

      {saved ? (
        <p style={{ fontSize: 14, color: comfort ? '#37474F' : 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={15} style={{ color: 'var(--dw-success)', flexShrink: 0 }} /> {savedLabel}
        </p>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label={`${label}: ${prompt}`}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%' }}
        >
          <span style={{ fontSize: 14, color: comfort ? '#37474F' : 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {prompt}
          </span>
          <ChevronRight size={16} style={{ color: comfort ? '#5C6BC0' : 'var(--dw-text-faint)', flexShrink: 0, marginTop: 2 }} />
        </button>
      ) : (
        <>
          <p style={{ fontSize: 14, color: comfort ? '#37474F' : 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'italic', margin: '0 0 8px', lineHeight: 1.5 }}>
            {prompt}
          </p>
          <textarea
            ref={taRef}
            className={comfort ? undefined : 'dw-reflect-dark'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none', outline: 'none',
              padding: '10px 12px', borderRadius: 8, fontSize: 14, lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              background: comfort ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)',
              color: comfort ? '#2C3E50' : 'var(--dw-text)',
              border: comfort ? '1px solid rgba(92,107,192,0.25)' : '1px solid var(--dw-border)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={save}
              disabled={!text.trim()}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: accent, color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--font-sans)', cursor: text.trim() ? 'pointer' : 'default',
                opacity: text.trim() ? 1 : 0.5,
              }}
            >
              Save reflection
            </button>
            <button
              onClick={() => { setOpen(false); setText(''); }}
              style={{
                padding: '10px 16px', borderRadius: 8, border: comfort ? '1px solid rgba(92,107,192,0.25)' : '1px solid var(--dw-border)',
                background: 'transparent', color: comfort ? '#5C6BC0' : 'var(--dw-text-muted)',
                fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  );
}
