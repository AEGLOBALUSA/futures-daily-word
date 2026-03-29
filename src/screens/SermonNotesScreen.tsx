import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { t, getLang } from '../utils/i18n';

interface SermonNotesScreenProps {
  onBack: () => void;
  embedded?: boolean;
}

/* ── JSON schema types ── */
interface SermonJson {
  id: string;
  title: string;
  series?: string;
  date: string;
  speaker: string;
  keyVerse: string;
  keyVerseText: string;
  sections: SectionJson[];
  responsePrompts: string[];
  commitments: string[];
}
interface SectionJson {
  num: string;
  title: string;
  content: ContentItem[];
}
type ContentItem =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'bullet'; value: string }
  | { type: 'subhead'; value: string }
  | { type: 'note'; value: string }
  | { type: 'blank'; before: string; after?: string }
  | { type: 'quote'; text: string; ref: string };

/* ── localStorage for user's fill-in responses ── */
function getSermonResponses(sermonId: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(`dw_sermon_${sermonId}`) || '{}'); } catch { return {}; }
}
function saveSermonResponses(sermonId: string, r: Record<string, string>) {
  localStorage.setItem(`dw_sermon_${sermonId}`, JSON.stringify(r));
}

export function SermonNotesScreen({ onBack, embedded }: SermonNotesScreenProps) {
  const lang = getLang();
  const [sermon, setSermon] = useState<SermonJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Fetch latest sermon JSON
  useEffect(() => {
    fetch('/sermons/latest.json')
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((data: SermonJson) => {
        setSermon(data);
        setResponses(getSermonResponses(data.id));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const updateResponse = useCallback((key: string, value: string) => {
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      if (sermon) saveSermonResponses(sermon.id, next);
      return next;
    });
  }, [sermon]);

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // No sermon available
  if (error || !sermon) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
          No sermon notes this week
        </p>
        <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Check back before Sunday service.
        </p>
      </div>
    );
  }

  // Format date nicely
  const dateStr = (() => {
    try {
      const d = new Date(sermon.date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return sermon.date; }
  })();

  let blankCounter = 0;

  const content = (
    <>
      {/* Hero */}
      <div className="dw-dark-surface" style={{
        background: 'linear-gradient(135deg, var(--dw-charcoal-deep) 0%, var(--dw-charcoal) 50%, var(--dw-charcoal-light) 100%)',
        padding: '32px 24px',
        textAlign: 'center',
        borderBottom: '3px solid var(--dw-accent)',
        borderRadius: embedded ? 14 : 0,
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 13, letterSpacing: '2px', color: 'var(--dw-accent)', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
          {sermon.series || 'Futures Church'} &bull; {dateStr}
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', letterSpacing: '-0.5px', fontFamily: 'var(--font-serif)' }}>
          {sermon.title}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: '0 0 4px 0', fontFamily: 'var(--font-sans)' }}>
          {sermon.keyVerse}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'var(--font-sans)' }}>
          {sermon.speaker}
        </p>
      </div>

      {/* Key Verse */}
      <div style={{
        margin: '0 0 24px',
        padding: 20,
        background: 'var(--dw-accent-bg)',
        borderLeft: '4px solid var(--dw-accent)',
        borderRadius: '0 12px 12px 0',
      }}>
        <p style={{ fontSize: 15, lineHeight: 1.7, fontStyle: 'italic', color: 'var(--dw-text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-serif-text)' }}>
          &ldquo;{sermon.keyVerseText}&rdquo;
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--dw-accent)', margin: 0, fontFamily: 'var(--font-sans)' }}>
          — {sermon.keyVerse}
        </p>
      </div>

      {/* Sections */}
      {sermon.sections.map((section) => (
        <div key={section.num} style={{ marginBottom: 28 }}>
          <h3 style={{
            fontSize: 18, fontWeight: 700, margin: '28px 0 12px 0',
            color: 'var(--dw-accent)', fontFamily: 'var(--font-serif)',
          }}>
            {section.num}. &nbsp;{section.title}
          </h3>
          {section.content.map((item, i) => {
            switch (item.type) {
              case 'text':
                return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 12px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', whiteSpace: 'pre-line' }}>{item.value}</p>;
              case 'bold':
                return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 12px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>{item.value}</p>;
              case 'bullet':
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, margin: '0 0 8px', paddingLeft: 4 }}>
                    <span style={{ color: 'var(--dw-accent)', fontWeight: 700, flexShrink: 0 }}>&bull;</span>
                    <span style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{item.value}</span>
                  </div>
                );
              case 'subhead':
                return <p key={i} style={{ fontSize: 16, fontWeight: 700, margin: '16px 0 6px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{item.value}</p>;
              case 'note':
                return <p key={i} style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>{item.value}</p>;
              case 'blank': {
                const blankId = `blank-${section.num}-${blankCounter++}`;
                return (
                  <div key={i} style={{ margin: '0 0 12px' }}>
                    {item.before && (
                      <p style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 4px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                        {item.before}
                      </p>
                    )}
                    <BlankInput id={blankId} responses={responses} onChange={updateResponse} />
                    {item.after && (
                      <p style={{ fontSize: 15, lineHeight: 1.75, margin: '4px 0 0', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                        {item.after}
                      </p>
                    )}
                  </div>
                );
              }
              case 'quote':
                return (
                  <div key={i} style={{
                    margin: '12px 0', padding: 16,
                    background: 'var(--dw-accent-bg)',
                    borderLeft: '3px solid var(--dw-accent)',
                    borderRadius: '0 8px 8px 0',
                  }}>
                    <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 4px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif-text)' }}>
                      &ldquo;{item.text}&rdquo;
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--dw-accent)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                      — {item.ref}
                    </p>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      ))}

      {/* My Response */}
      <div style={{
        margin: '32px 0', padding: 24,
        background: 'var(--dw-accent-bg)',
        borderRadius: 16,
        border: '1px solid var(--dw-border)',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', margin: '0 0 24px', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em' }}>
          MY RESPONSE
        </h3>
        {sermon.responsePrompts.map((prompt, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>{prompt}</p>
            <AutoTextarea
              value={responses[`resp-${i}`] || ''}
              onChange={val => updateResponse(`resp-${i}`, val)}
              placeholder="Write your thoughts here..."
              minRows={3}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                borderRadius: 10, color: 'var(--dw-text-primary)',
                fontSize: 14, fontFamily: 'var(--font-sans)', lineHeight: 1.6,
                resize: 'none', outline: 'none', overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        {sermon.commitments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            {sermon.commitments.map((c, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, cursor: 'pointer', color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                <input
                  type="checkbox"
                  checked={responses[`commit-${i}`] === '1'}
                  onChange={e => updateResponse(`commit-${i}`, e.target.checked ? '1' : '')}
                  style={{ width: 20, height: 20, accentColor: 'var(--dw-accent)' }}
                />
                {c}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0 40px', color: 'var(--dw-text-faint)', fontSize: 14, fontWeight: 700, letterSpacing: '3px', fontFamily: 'var(--font-sans)' }}>
        {sermon.title}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--dw-canvas)',
      color: 'var(--dw-text)',
      padding: '0 0 100px 0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 20px',
        borderBottom: '1px solid var(--dw-border)',
        position: 'sticky', top: 0, background: 'var(--dw-canvas)', zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--dw-text)',
          cursor: 'pointer', padding: 8, marginRight: 12, display: 'flex', alignItems: 'center',
        }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)' }}>{t('sermon_notes_title', lang)}</h1>
      </div>
      <div style={{ padding: '0 20px' }}>
        {content}
      </div>
    </div>
  );
}

/* ── Auto-expanding textarea (reusable) ── */
function AutoTextarea({ value, onChange, placeholder, minRows, style }: {
  value: string; onChange: (val: string) => void; placeholder?: string; minRows?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);
  useEffect(() => { autoResize(); }, [value, autoResize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => { onChange(e.target.value); autoResize(); }}
      placeholder={placeholder}
      rows={minRows || 1}
      style={style}
    />
  );
}

/* ── Auto-expanding blank textarea component ── */
function BlankInput({ id, responses, onChange }: { id: string; responses: Record<string, string>; onChange: (id: string, val: string) => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [responses[id], autoResize]);

  return (
    <textarea
      ref={ref}
      value={responses[id] || ''}
      onChange={e => { onChange(id, e.target.value); autoResize(); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="Write your notes here..."
      rows={1}
      style={{
        display: 'block',
        width: '100%',
        border: 'none',
        borderBottom: `2px solid ${focused ? 'var(--dw-accent)' : 'var(--dw-border)'}`,
        background: 'transparent',
        padding: '6px 4px',
        fontSize: 15, fontFamily: 'var(--font-sans)', fontWeight: 600,
        color: 'var(--dw-text-primary)', outline: 'none',
        transition: 'border-color 0.2s',
        resize: 'none',
        overflow: 'hidden',
        lineHeight: 1.6,
        boxSizing: 'border-box',
      }}
    />
  );
}

export default SermonNotesScreen;
