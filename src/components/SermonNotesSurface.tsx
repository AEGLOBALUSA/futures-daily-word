/**
 * Locked visual standard for congregation Sermon Notes (live page + staff preview).
 * Same CSS class: .dw-sermon-notes. Do not use this chrome on the rest of Daily Word.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { youtubeEmbedUrl } from '../utils/youtube';
import { syncMisc } from '../utils/cloudSync';
import { getLang, t } from '../utils/i18n';
import { getProfileEmail } from '../utils/storage';
import { localApiBase } from '../utils/api-base';

export type SermonContentItem =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'bullet'; value: string }
  | { type: 'subhead'; value: string }
  | { type: 'note'; value: string }
  | { type: 'blank'; before?: string; after?: string }
  | { type: 'quote'; text?: string; value?: string; ref?: string };

export type SermonSection = {
  num: string;
  title: string;
  content: SermonContentItem[];
};

export type SermonNotesData = {
  id: string;
  title: string;
  series?: string;
  date?: string;
  speaker?: string;
  keyVerse?: string;
  keyVerseText?: string;
  sections?: SermonSection[];
  responsePrompts?: string[];
  youtubeUrl?: string;
};

function getSermonResponses(sermonId: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(`dw_sermon_${sermonId}`) || '{}'); } catch { return {}; }
}
function saveSermonResponses(sermonId: string, r: Record<string, string>) {
  const json = JSON.stringify(r);
  localStorage.setItem(`dw_sermon_${sermonId}`, json);
  syncMisc(`dw_sermon_${sermonId}`, json);
}

/**
 * "Email these notes to me" (Ashley, 2 Sep 2026 night). One field, one button:
 * the person's own filled-in notes, sent once to the address they give, from
 * the app's own domain. No unsubscribe — his ruling; it is a one-off
 * transactional send, and the address lands in the comms hub tagged
 * "sermon notes" for any later mail, which carries the hub's own unsubscribe.
 *
 * The server holds the outline; only the answers travel (this page's blanks
 * and the workspace boxes share one `dw_sermon_<id>` record, read fresh at
 * the moment of sending), and it accepts them only under this sermon's keys.
 */
type EmailState = 'idle' | 'busy' | 'sent' | 'error';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function EmailNotesBlock({ sermonId, responses }: { sermonId: string; responses: Record<string, string> }) {
  const lang = getLang();
  const [email, setEmail] = useState(() => getProfileEmail());
  const [state, setState] = useState<EmailState>('idle');
  const [message, setMessage] = useState('');

  const send = async () => {
    if (state === 'busy') return;
    const addr = email.trim();
    if (!EMAIL_RE.test(addr)) { setState('error'); setMessage(t('sermon_notes_email_invalid', lang)); return; }
    setState('busy'); setMessage('');
    const all = { ...getSermonResponses(sermonId), ...responses };
    try {
      const r = await fetch(`${localApiBase()}/api/sermon-notes-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonId, email: addr, responses: all, lang }),
      });
      if (!r.ok) {
        setState('error');
        setMessage(t(r.status === 429 ? 'sermon_notes_email_limit' : 'sermon_notes_email_failed', lang));
        return;
      }
      setState('sent'); setMessage(t('sermon_notes_email_sent', lang));
    } catch {
      setState('error'); setMessage(t('sermon_notes_email_failed', lang));
    }
  };

  return (
    <div className="dw-sermon-notes-email" data-testid="sermon-notes-email">
      <p className="dw-sermon-notes-response-label">{t('sermon_notes_email_title', lang)}</p>
      {/* noValidate: the browser's own bubble would swallow the submit on a bad address and this block
          would say nothing — the same trap the staff form hit (DW PR #96). Our message, in their language. */}
      <form className="dw-sermon-notes-email-row" noValidate onSubmit={e => { e.preventDefault(); void send(); }}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="dw-sermon-notes-email-input"
          value={email}
          onChange={e => { setEmail(e.target.value); if (state !== 'busy') { setState('idle'); setMessage(''); } }}
          placeholder={t('sermon_notes_email_placeholder', lang)}
          aria-label={t('sermon_notes_email_title', lang)}
          disabled={state === 'busy'}
          data-testid="sermon-notes-email-input"
        />
        <button type="submit" className="dw-sermon-notes-email-btn" disabled={state === 'busy'} data-testid="sermon-notes-email-send">
          {state === 'busy' ? t('sermon_notes_email_sending', lang) : t('sermon_notes_email_send', lang)}
        </button>
      </form>
      {message ? (
        <p className={'dw-sermon-notes-email-msg' + (state === 'error' ? ' is-error' : '')} role="status" data-testid="sermon-notes-email-msg">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function metaDate(iso?: string) {
  const raw = String(iso || '').slice(0, 10);
  if (!raw) return '';
  const d = new Date(raw + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return raw;
  const day = d.getDate();
  const mon = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${day} ${mon} ${d.getFullYear()}`;
}

function metaLine(sermon: SermonNotesData) {
  const date = metaDate(sermon.date);
  const lead = (sermon.series || sermon.speaker || '').trim();
  if (lead && date) return `${lead} · ${date}`;
  return lead || date;
}

function ExpandingNoteBox({
  id,
  value,
  onChange,
  placeholder,
  response,
}: {
  id: string;
  value: string;
  onChange: (id: string, val: string) => void;
  placeholder?: string;
  response?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, response ? 88 : 44) + 'px';
  }, [response]);
  useLayoutEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      className={'dw-sermon-notes-blank' + (response ? ' is-response' : '')}
      value={value}
      placeholder={placeholder || ''}
      rows={response ? 3 : 1}
      onChange={e => { onChange(id, e.target.value); resize(); }}
      onInput={() => resize()}
    />
  );
}

export function SermonNotesSurface({
  sermon,
  readOnly,
  persist = true,
}: {
  sermon: SermonNotesData;
  readOnly?: boolean;
  persist?: boolean;
}) {
  const sermonId = sermon.id || 'preview';
  const [responses, setResponses] = useState<Record<string, string>>(() => (
    persist && sermon.id ? getSermonResponses(sermon.id) : {}
  ));

  useEffect(() => {
    if (persist && sermon.id) setResponses(getSermonResponses(sermon.id));
  }, [persist, sermon.id]);

  const update = useCallback((key: string, value: string) => {
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      if (persist && sermon.id) saveSermonResponses(sermon.id, next);
      return next;
    });
  }, [persist, sermon.id]);

  const embed = youtubeEmbedUrl(sermon.youtubeUrl);
  const meta = metaLine(sermon);
  const refLine = (sermon.keyVerse || '').trim();
  const sections = (sermon.sections || []).slice(0, 4);
  const prompts = (sermon.responsePrompts || []).filter(Boolean).slice(0, 3);
  let firstBlank = true;
  let quoteUsed = false;

  return (
    <article className="dw-sermon-notes">
      {embed ? (
        <div className="dw-sermon-notes-video">
          <iframe
            title=""
            src={embed}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <p className="dw-sermon-notes-badge">Sermon Notes</p>
        </div>
      ) : (
        <p className="dw-sermon-notes-badge dw-sermon-notes-badge--inline">Sermon Notes</p>
      )}

      {meta ? <p className="dw-sermon-notes-meta">{meta}</p> : null}

      <h1 className="dw-sermon-notes-title">{sermon.title}</h1>

      {refLine ? <p className="dw-sermon-notes-ref">{refLine}</p> : null}

      {sections.map((section) => (
        <section key={section.num} className="dw-sermon-notes-section">
          <h2 className="dw-sermon-notes-subhead">{section.title}</h2>
          {(section.content || []).map((item, i) => {
            if (item.type === 'quote') {
              if (quoteUsed) return null;
              quoteUsed = true;
              const text = item.text || item.value || '';
              if (!text) return null;
              return (
                <blockquote key={i} className="dw-sermon-notes-quote">
                  {text}
                  {item.ref ? <cite>{item.ref}</cite> : null}
                </blockquote>
              );
            }
            if (item.type === 'note') {
              return item.value ? <p key={i} className="dw-sermon-notes-note">{item.value}</p> : null;
            }
            if (item.type === 'subhead') {
              return item.value ? <h2 key={i} className="dw-sermon-notes-subhead">{item.value}</h2> : null;
            }
            if (item.type === 'blank') {
              if (readOnly) return null;
              const blankId = `blank-${sermonId}-${section.num}-${i}`;
              const ph = firstBlank ? 'Write here…' : undefined;
              firstBlank = false;
              return (
                <div key={i}>
                  {item.before ? <p className="dw-sermon-notes-point">{item.before}</p> : null}
                  <ExpandingNoteBox
                    id={blankId}
                    value={responses[blankId] || ''}
                    onChange={update}
                    placeholder={ph}
                  />
                  {item.after ? <p className="dw-sermon-notes-point">{item.after}</p> : null}
                </div>
              );
            }
            const value = 'value' in item ? item.value : '';
            if (!value) return null;
            const cls = 'dw-sermon-notes-point' + (item.type === 'bold' ? ' is-bold' : '');
            return <p key={i} className={cls}>{value}</p>;
          })}
        </section>
      ))}

      {!readOnly && prompts.length > 0 && (
        <div className="dw-sermon-notes-response">
          <p className="dw-sermon-notes-response-label">My response</p>
          {prompts.map((prompt, i) => (
            <div key={i} className="dw-sermon-notes-prompt">
              <p className="dw-sermon-notes-prompt-q">{prompt}</p>
              <ExpandingNoteBox
                id={`resp-${sermonId}-${i}`}
                value={responses[`resp-${sermonId}-${i}`] || ''}
                onChange={update}
                response
              />
            </div>
          ))}
        </div>
      )}

      {!readOnly && persist && sermon.id ? (
        <EmailNotesBlock sermonId={sermon.id} responses={responses} />
      ) : null}
    </article>
  );
}
