/**
 * SermonWorkspace — the Notes screen's "Sermon" tab, rebuilt as a calm journaling
 * workspace instead of the long fill-in outline. One screen, one purpose: reflect.
 *
 * The sermon OUTLINE itself is reading content — it opens on demand via "View Sermon"
 * (SermonNotesScreen in readOnly mode), never embedded inline here. This keeps
 * consumption (reading) and creation (journaling) cleanly separated.
 *
 * Sections (My Notes, Key Takeaways, What God Is Saying To Me, Prayer, Action Steps,
 * Follow Up) persist to the same `dw_sermon_{id}` bag the fill-in used, so they ride
 * the existing misc cloud-sync path. Everything auto-saves — the user never thinks
 * about a save button.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Loader2, BookOpen, X } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { syncMisc } from '../utils/cloudSync';
import { recordStreakToday } from '../utils/streak';
import { SermonNotesScreen } from '../screens/SermonNotesScreen';

interface SermonMeta {
  id: string;
  title: string;
  series?: string;
  date: string;
  speaker: string;
  commitments?: string[];
}

type SaveState = 'idle' | 'saving' | 'saved';

function storageKey(id: string) { return `dw_sermon_${id}`; }
function loadResponses(id: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(storageKey(id)) || '{}'); } catch { return {}; }
}
function formatTime(d: Date, lang: string): string {
  try {
    const locale = lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : lang;
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch { return d.toLocaleTimeString(); }
}

export function SermonWorkspace() {
  const lang = getLang();
  const [sermon, setSermon] = useState<SermonMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showSermon, setShowSermon] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/sermons/latest.json')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((data: SermonMeta) => {
        setSermon(data);
        setResponses(loadResponses(data.id));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    if (!sermon) return;
    setSaveState('saving');
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      const json = JSON.stringify(next);
      try {
        localStorage.setItem(storageKey(sermon.id), json);
        syncMisc(storageKey(sermon.id), json); // stamp + push (newest-wins across devices)
      } catch { /* ignore */ }
      return next;
    });
    if (value.trim()) recordStreakToday(); // journaling on the message counts as engagement
    // The write is already done; a short beat lets the "Saved" confirmation visibly land.
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSaveState('saved');
      setLastSavedAt(new Date());
    }, 500);
  }, [sermon]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={22} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const dateStr = (() => {
    if (!sermon) return '';
    try {
      const d = new Date(sermon.date + 'T00:00:00');
      const locale = lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : lang;
      return d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return sermon.date; }
  })();

  const messageTitle = sermon ? (sermon.series || sermon.title) : '';

  const TEXT_SECTIONS: { key: string; label: string; placeholder: string; minRows: number }[] = [
    { key: 'ws-notes', label: t('ws_my_notes', lang), placeholder: t('ws_my_notes_ph', lang), minRows: 5 },
    { key: 'ws-takeaways', label: t('ws_key_takeaways', lang), placeholder: t('ws_key_takeaways_ph', lang), minRows: 3 },
    { key: 'ws-god', label: t('ws_what_god', lang), placeholder: t('ws_what_god_ph', lang), minRows: 3 },
    { key: 'ws-prayer', label: t('ws_prayer', lang), placeholder: t('ws_prayer_ph', lang), minRows: 3 },
  ];

  const statusPill = (
    <span aria-live="polite" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontFamily: 'var(--font-sans)',
      color: saveState === 'saved' ? 'var(--dw-success)' : 'var(--dw-text-muted)',
      minHeight: 16,
    }}>
      {saveState === 'saving' && <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('note_saving', lang)}</>}
      {saveState === 'saved' && <><Check size={13} /> {t('note_saved', lang)}{lastSavedAt ? ` · ${formatTime(lastSavedAt, lang)}` : ''}</>}
    </span>
  );

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Today's Message — the reading lives behind "View Sermon", not inline ── */}
      <div style={{
        background: 'var(--dw-card)',
        border: '1px solid var(--dw-border)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 24,
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 8px',
        }}>
          {t('todays_message', lang)}
        </p>
        {error || !sermon ? (
          <p style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
            {t('no_sermon_this_week', lang)}
          </p>
        ) : (
          <>
            <h2 style={{
              fontSize: 22, fontWeight: 400, color: 'var(--dw-text-primary)',
              fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em', margin: '0 0 10px', lineHeight: 1.2,
            }}>
              {messageTitle}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>
              {sermon.speaker}
            </p>
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {dateStr}
            </p>
            <button
              onClick={() => setShowSermon(true)}
              style={{
                marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--dw-accent-bg, rgba(168,85,47,0.1))',
                border: '1px solid var(--dw-accent)', borderRadius: 10,
                padding: '9px 16px', minHeight: 44, cursor: 'pointer',
                color: 'var(--dw-accent)', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}
            >
              <BookOpen size={15} /> {t('view_sermon', lang)}
            </button>
          </>
        )}
      </div>

      {/* ── Save status — the user should never wonder whether their notes are safe ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 18, marginBottom: 8 }}>
        {statusPill}
      </div>

      {/* ── Journaling sections ── */}
      {TEXT_SECTIONS.map(sec => (
        <WorkspaceSection key={sec.key} label={sec.label}>
          <AutoGrow
            value={responses[sec.key] || ''}
            onChange={val => updateField(sec.key, val)}
            placeholder={sec.placeholder}
            minRows={sec.minRows}
          />
        </WorkspaceSection>
      ))}

      {/* ── Action Steps — commitments as a checklist + free-form steps ── */}
      <WorkspaceSection label={t('ws_action_steps', lang)}>
        {sermon?.commitments && sermon.commitments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {sermon.commitments.map((c, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, cursor: 'pointer', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={responses[`commit-${i}`] === '1'}
                  onChange={e => updateField(`commit-${i}`, e.target.checked ? '1' : '')}
                  style={{ width: 20, height: 20, accentColor: 'var(--dw-accent)', flexShrink: 0, marginTop: 1 }}
                />
                {c}
              </label>
            ))}
          </div>
        )}
        <AutoGrow
          value={responses['ws-actions'] || ''}
          onChange={val => updateField('ws-actions', val)}
          placeholder={t('ws_action_steps_ph', lang)}
          minRows={2}
        />
      </WorkspaceSection>

      {/* ── Follow Up ── */}
      <WorkspaceSection label={t('ws_follow_up', lang)}>
        <AutoGrow
          value={responses['ws-followup'] || ''}
          onChange={val => updateField('ws-followup', val)}
          placeholder={t('ws_follow_up_ph', lang)}
          minRows={2}
        />
      </WorkspaceSection>

      {/* ── Sermon reading overlay (opened by "View Sermon") ── */}
      {showSermon && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--dw-canvas)', overflowY: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--dw-border)',
            position: 'sticky', top: 0, background: 'var(--dw-canvas)', zIndex: 10,
            paddingTop: 'calc(16px + var(--safe-top, 0px))',
          }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--dw-text-primary)' }}>
              {t('sermon_notes_title', lang)}
            </h1>
            <button
              aria-label={t('close_label', lang)}
              onClick={() => setShowSermon(false)}
              style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={22} />
            </button>
          </div>
          <div style={{ padding: '0 20px' }}>
            <SermonNotesScreen onBack={() => setShowSermon(false)} embedded readOnly />
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 8px',
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

/** Auto-expanding textarea — grows with content, no inner scrollbar. */
function AutoGrow({ value, onChange, placeholder, minRows }: {
  value: string; onChange: (val: string) => void; placeholder?: string; minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => { onChange(e.target.value); resize(); }}
      placeholder={placeholder}
      rows={minRows || 2}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '12px 14px',
        background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
        borderRadius: 12, color: 'var(--dw-text-primary)',
        fontSize: 15, fontFamily: 'var(--font-sans)', lineHeight: 1.7,
        resize: 'none', outline: 'none', overflow: 'hidden',
      }}
    />
  );
}

export default SermonWorkspace;
