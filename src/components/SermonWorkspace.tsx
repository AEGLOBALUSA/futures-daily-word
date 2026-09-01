/**
 * SermonWorkspace — Sunday sermon-note journaling. One screen, one purpose: reflect.
 *
 * Lives on the hidden `sermon-notes` tab (Home one-tap + Sunday QR), not inside
 * Notes. Notes is the person's own journal.
 *
 * The sermon OUTLINE is reading content — it opens on demand via "View Sermon"
 * (SermonNotesScreen in readOnly mode) only when a current message is published.
 * If nothing is posted this week, the outline card is omitted so we never show
 * a stale or empty sermon. Journaling still works against a per-day open note.
 *
 * Sections persist to `dw_sermon_{id}` and ride the misc cloud-sync path.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Loader2, BookOpen, X } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { syncMisc } from '../utils/cloudSync';
import { recordStreakToday } from '../utils/streak';
import { SermonNotesScreen } from '../screens/SermonNotesScreen';
import { getPreachingFocus, setPreachingFocus, getPrepItems, removePrepItem, isPastorPersona } from '../utils/sermonPrep';
import type { PrepItem } from '../utils/sermonPrep';
import { fetchCurrentSermon, openSermonNotesId } from '../utils/currentSermon';
import { youtubeEmbedUrl } from '../utils/youtube';
import { ScreenHeader } from './ScreenHeader';
import { PromoAds } from './PromoAds';

interface SermonMeta {
  id: string;
  title: string;
  series?: string;
  date: string;
  speaker: string;
  commitments?: string[];
  youtubeUrl?: string;
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
  const [notesId, setNotesId] = useState(() => openSermonNotesId());
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showSermon, setShowSermon] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pastor prep (decision 5): focus line + captures filed from the reading surfaces.
  const isPastor = isPastorPersona();
  const [prepFocus, setPrepFocus] = useState(() => getPreachingFocus());
  const [prepItems, setPrepItems] = useState<PrepItem[]>(() => getPrepItems());
  useEffect(() => {
    const h = () => { setPrepFocus(getPreachingFocus()); setPrepItems(getPrepItems()); };
    window.addEventListener('dw-sermon-prep-updated', h);
    return () => window.removeEventListener('dw-sermon-prep-updated', h);
  }, []);
  // Past sermon notes: the retired Campus sub-tab's dw_sermon_notes store plus
  // free-form journal entries typed 'sermon' — read-only, so nothing is stranded.
  const [showPast, setShowPast] = useState(false);
  const pastNotes = (() => {
    const out: { id: string; title: string; date: string; content: string }[] = [];
    try {
      const legacy = JSON.parse(localStorage.getItem('dw_sermon_notes') || '[]');
      if (Array.isArray(legacy)) for (const n of legacy) out.push({ id: `c_${n.id}`, title: n.title || n.sermon || '', date: n.date || '', content: n.content || '' });
    } catch { /* ignore */ }
    try {
      const journal = JSON.parse(localStorage.getItem('dw_journal') || '[]');
      if (Array.isArray(journal)) for (const e of journal) if (e.type === 'sermon' && !e.deleted) out.push({ id: `j_${e.id}`, title: e.title || '', date: e.date || '', content: e.content || e.text || '' });
    } catch { /* ignore */ }
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  })();

  useEffect(() => {
    fetchCurrentSermon<SermonMeta>()
      .then(data => {
        const id = openSermonNotesId(data?.id);
        setSermon(data);
        setNotesId(id);
        setResponses(loadResponses(id));
        setLoading(false);
      });
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setSaveState('saving');
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      const json = JSON.stringify(next);
      try {
        localStorage.setItem(storageKey(notesId), json);
        syncMisc(storageKey(notesId), json); // stamp + push (newest-wins across devices)
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
  }, [notesId]);

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
      {/* ── My Preparation — pastor only: the wizard's preaching answer finally
          lands somewhere, and "To sermon" captures collect here (decision 5). ── */}
      {isPastor && (
        <div style={{
          background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 10px' }}>
            {t('ws_my_prep', lang)}
          </p>
          <input
            value={prepFocus}
            onChange={e => setPrepFocus(e.target.value)}
            onBlur={() => setPreachingFocus(prepFocus)}
            placeholder={t('ws_prep_focus_ph', lang)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 12px',
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 10, color: 'var(--dw-text-primary)',
              fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none',
              marginBottom: prepItems.length ? 12 : 8,
            }}
          />
          {prepItems.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
              {t('ws_prep_empty', lang)}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prepItems.map(it => (
                <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {it.ref && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 3px' }}>{it.ref}</p>}
                    <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'normal', margin: 0, lineHeight: 1.5 }}>{it.text}</p>
                  </div>
                  <button
                    aria-label={t('remove_label', lang)}
                    onClick={() => removePrepItem(it.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: '4px 2px', fontSize: 12, fontFamily: 'var(--font-sans)', flexShrink: 0, minHeight: 24 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Today's Message — only when a current outline is published.
          Stale/missing latest.json must not leave a broken empty sermon here. ── */}
      {sermon && (
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
        {youtubeEmbedUrl(sermon.youtubeUrl) && (
          <div style={{
            position: 'relative', paddingBottom: '56.25%', height: 0,
            marginTop: 14, borderRadius: 12, overflow: 'hidden', background: '#000',
          }}>
            <iframe
              title="Watch this week's message"
              src={youtubeEmbedUrl(sermon.youtubeUrl)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
        )}
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
      </div>
      )}

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

      {/* ── Past sermon notes — read-only surface for the retired Campus store
          and 'sermon'-typed journal entries, so no note is stranded. ── */}
      {pastNotes.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {t('ws_past_notes', lang)}
            </p>
            <button
              onClick={() => setShowPast(!showPast)}
              style={{ background: 'none', border: 'none', color: 'var(--dw-accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', padding: '4px 0', minHeight: 24 }}
            >
              {showPast ? t('ws_hide', lang) : t('ws_show_n', lang).replace('{n}', String(pastNotes.length))}
            </button>
          </div>
          {showPast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pastNotes.map(n => (
                <div key={n.id} style={{ background: 'var(--dw-card)', border: '1px solid var(--dw-border)', borderRadius: 12, padding: '12px 14px' }}>
                  {n.title && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>{n.title}</p>}
                  {n.date && <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>{n.date}</p>}
                  <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sermon reading overlay (opened by "View Sermon") ── */}
      {showSermon && sermon && (
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

/** Sunday / Home destination — congregation fill-in page (same surface as staff preview). */
export function SermonNotesTab({ onBack }: { onBack: () => void }) {
  return <SermonNotesScreen onBack={onBack} />;
}
