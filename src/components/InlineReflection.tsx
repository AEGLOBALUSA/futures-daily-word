/**
 * InlineReflection — turns the home "Reflect" prompt from dead static text into a
 * one-tap, in-context journal capture: tap to expand, write a thought, save it to
 * the journal without leaving the page. This is the habit-forming hook of the daily
 * loop (read → REFLECT → done). Saving also counts toward the daily streak.
 *
 * Saving is worry-free by design:
 * - auto-saves ~2.5s after the user stops typing (and on app-hide),
 * - shows a live status line (Saving… → ✓ Saved · 9:42 AM),
 * - keeps an unsaved draft in localStorage so navigating away never loses a thought,
 * - edits after a save update the SAME journal entry (no duplicates).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { pushNow } from '../utils/cloudSync';
import { recordStreakToday } from '../utils/streak';
import { t, getLang } from '../utils/i18n';

interface InlineReflectionProps {
  label: string;        // 'Reflect' / 'Sit with this'
  prompt: string;       // the reflection question (also used as the entry title/context)
  tone?: 'comfort' | 'default' | 'paper';
  verseRef?: string;    // today's passage, so the entry links back to what was read
  savedLabel?: string;  // confirmation copy
  placeholder?: string;
  onViewJournal?: () => void; // when set, the saved confirmation becomes a tappable hand-off to the journal
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

const DRAFT_PREFIX = 'dw_reflect_draft:';

function draftKey(verseRef?: string, prompt?: string) {
  return DRAFT_PREFIX + (verseRef || prompt || 'general');
}

function formatTime(d: Date): string {
  try {
    const lang = getLang();
    const locale = lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : lang;
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return d.toLocaleTimeString();
  }
}

export function InlineReflection({
  label, prompt, tone = 'default', verseRef, savedLabel, placeholder, onViewJournal,
}: InlineReflectionProps) {
  // Defaults resolve per render so they follow the active language.
  savedLabel = savedLabel ?? t('saved_to_journal');
  placeholder = placeholder ?? t('write_thought_placeholder');
  const comfort = tone === 'comfort';
  const paper = tone === 'paper';
  const dKey = draftKey(verseRef, prompt);

  // Compute mount state ONCE. The panel this lives in remounts on every chapter/
  // translation change, so we must re-adopt any reflection already saved for this
  // verse — otherwise a fresh entryIdRef would fork a duplicate on the next save.
  const initRef = useRef<{ draft: string; existing: { id: string; body: string } | null } | null>(null);
  if (initRef.current === null) {
    let draft = '';
    try { draft = localStorage.getItem(dKey) || ''; } catch { /* ignore */ }
    let existing: { id: string; body: string } | null = null;
    if (verseRef) {
      try {
        const arr = JSON.parse(localStorage.getItem('dw_journal') || '[]');
        const m = arr.find((e: { id?: string; deleted?: boolean; type?: string; verseRef?: string; title?: string; body?: string }) =>
          e && !e.deleted && e.type === 'journal' && e.verseRef === verseRef && e.title === prompt);
        if (m && m.id) existing = { id: m.id, body: m.body || '' };
      } catch { /* ignore */ }
    }
    initRef.current = { draft, existing };
  }
  const init = initRef.current;

  // Draft (unsaved edits) wins over the saved body; either way we adopt the existing id.
  const [text, setText] = useState(init.draft || init.existing?.body || '');
  const [open, setOpen] = useState(!!(init.draft || init.existing?.body));
  const [saveState, setSaveState] = useState<SaveState>(init.draft ? 'dirty' : (init.existing ? 'saved' : 'idle'));
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const entryIdRef = useRef<string | null>(init.existing?.id || null);   // stable journal entry id — edits upsert, never duplicate
  const lastSavedTextRef = useRef<string>(init.existing?.body || '');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && !text) setTimeout(() => taRef.current?.focus(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    if (body === lastSavedTextRef.current && entryIdRef.current) {
      setSaveState('saved');
      return;
    }
    setSaveState('saving');
    try {
      const entries = JSON.parse(localStorage.getItem('dw_journal') || '[]');
      const now = new Date();
      const existingIdx = entryIdRef.current
        ? entries.findIndex((e: { id?: string }) => e.id === entryIdRef.current)
        : -1;
      if (existingIdx !== -1) {
        entries[existingIdx] = { ...entries[existingIdx], body, updatedAt: now.toISOString() };
      } else {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        entryIdRef.current = id;
        entries.unshift({
          id,
          date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          title: prompt,
          body,
          tags: ['reflection', 'scripture'],
          type: 'journal',
          verseRef,
          planContext: prompt,
          updatedAt: now.toISOString(),
        });
      }
      localStorage.setItem('dw_journal', JSON.stringify(entries.slice(0, 5000)));
      lastSavedTextRef.current = body;
      localStorage.removeItem(dKey); // the note is in the journal now — the draft has served its purpose
      window.dispatchEvent(new Event('dw-journal-updated'));
      pushNow();
      recordStreakToday(); // reflecting is real engagement — it counts toward the streak
    } catch { /* ignore */ }
    // Brief, honest "Saving…" beat (the write is already done) so the user SEES the confirmation land.
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSaveState('saved');
      setLastSavedAt(new Date());
    }, 300);
  }, [text, prompt, verseRef, dKey]);

  // Keep the latest save() reachable from stable listeners/cleanups.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);
  const saveStateRef = useRef(saveState);
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

  // Auto-save ~2.5s after the user stops typing.
  useEffect(() => {
    if (saveState !== 'dirty' || !text.trim()) return;
    const timer = setTimeout(() => saveRef.current(), 2500);
    return () => clearTimeout(timer);
  }, [text, saveState]);

  // If the app is backgrounded/closed mid-thought, save immediately — never lose a note.
  useEffect(() => {
    const flush = () => {
      if (saveStateRef.current === 'dirty') saveRef.current();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const onChange = (value: string) => {
    setText(value);
    setSaveState(value.trim() ? 'dirty' : 'idle');
    try {
      if (value) localStorage.setItem(dKey, value);
      else localStorage.removeItem(dKey);
    } catch { /* ignore */ }
  };

  const accent = comfort ? '#5C6BC0' : paper ? '#A8552F' : 'var(--dw-accent)';
  const cardBg = comfort
    ? 'linear-gradient(135deg, rgba(92,107,192,0.08) 0%, rgba(92,107,192,0.03) 100%)'
    : paper
    ? 'rgba(168,120,60,0.05)'
    : 'var(--dw-charcoal)';
  const cardBorder = comfort
    ? '1px solid rgba(92,107,192,0.15)'
    : paper
    ? '1px solid rgba(150,112,72,0.18)'
    : '1px solid rgba(255,255,255,0.06)';
  const labelColor = comfort ? '#5C6BC0' : paper ? '#A06A42' : 'var(--dw-text-muted)';
  const bodyColor = comfort ? '#37474F' : paper ? '#2A2218' : 'var(--dw-text-secondary)';

  const statusLine = () => {
    if (saveState === 'saving') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('note_saving')}
        </span>
      );
    }
    if (saveState === 'saved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--dw-success)' }}>
          <Check size={13} /> {savedLabel}{lastSavedAt ? ` · ${formatTime(lastSavedAt)}` : ''}
        </span>
      );
    }
    if (saveState === 'dirty') return <span>{t('note_autosaves')}</span>;
    return null;
  };

  return (
    <div
      className={comfort || paper ? undefined : 'dw-dark-surface'}
      style={{ marginTop: 16, padding: '12px 14px', background: cardBg, borderRadius: 10, border: cardBorder }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: labelColor, fontFamily: 'var(--font-sans)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label={`${label}: ${prompt}`}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%' }}
        >
          <span style={{ fontSize: 14, color: bodyColor, fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'normal', lineHeight: 1.5 }}>
            {prompt}
          </span>
          <ChevronRight size={16} style={{ color: comfort ? '#5C6BC0' : paper ? '#A06A42' : 'var(--dw-text-faint)', flexShrink: 0, marginTop: 2 }} />
        </button>
      ) : (
        <>
          <p style={{ fontSize: 14, color: bodyColor, fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'normal', margin: '0 0 8px', lineHeight: 1.5 }}>
            {prompt}
          </p>
          <textarea
            ref={taRef}
            className={comfort || paper ? undefined : 'dw-reflect-dark'}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none', outline: 'none',
              padding: '10px 12px', borderRadius: 8, fontSize: 14, lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              background: comfort ? 'rgba(255,255,255,0.7)' : paper ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
              color: comfort ? '#2C3E50' : paper ? '#2A2218' : 'var(--dw-text)',
              border: comfort ? '1px solid rgba(92,107,192,0.25)' : paper ? '1px solid rgba(150,112,72,0.25)' : '1px solid var(--dw-border)',
            }}
          />
          {/* Live save status — the user should never wonder whether their note is safe.
              Once saved, the status doubles as the hand-off into the journal. */}
          {saveState === 'saved' && onViewJournal ? (
            <button
              onClick={onViewJournal}
              aria-label={`${statusLine()} — ${t('view_journal_label')}`}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', margin: '6px 2px 0' }}
            >
              <span aria-live="polite" style={{ fontSize: 12, minHeight: 16, color: 'var(--dw-success)', fontFamily: 'var(--font-sans)' }}>
                {statusLine()}
              </span>
              <ChevronRight size={14} style={{ color: comfort ? '#5C6BC0' : paper ? '#A06A42' : 'var(--dw-text-faint)', flexShrink: 0 }} />
            </button>
          ) : (
            <p aria-live="polite" style={{
              fontSize: 12, minHeight: 16, margin: '6px 2px 0',
              color: saveState === 'saved' ? 'var(--dw-success)' : labelColor,
              fontFamily: 'var(--font-sans)',
            }}>
              {statusLine()}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={save}
              disabled={!text.trim() || saveState === 'saved' || saveState === 'saving'}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saveState === 'saved' ? 'var(--dw-success)' : accent,
                color: '#fff', fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                cursor: text.trim() && saveState === 'dirty' ? 'pointer' : 'default',
                opacity: text.trim() ? 1 : 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.2s ease',
              }}
            >
{saveState === 'saved' ? <><Check size={15} /> {t('note_saved')}</>
                : saveState === 'saving' ? t('note_saving')
                : t('note_save_btn')}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 16px', borderRadius: 8,
                border: comfort ? '1px solid rgba(92,107,192,0.25)' : paper ? '1px solid rgba(150,112,72,0.25)' : '1px solid var(--dw-border)',
                background: 'transparent', color: comfort ? '#5C6BC0' : paper ? '#A06A42' : 'var(--dw-text-muted)',
                fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              {t('close_label')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
