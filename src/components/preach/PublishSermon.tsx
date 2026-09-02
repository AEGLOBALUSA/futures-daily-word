/**
 * Preach → Publish (Part 4.3 step 4 of docs/PASTOR-STUDY-PREACH-PLAN.md).
 *
 * Turns an outline into the exact answers the staff intake endpoint expects
 * (src/utils/preachPublish.ts), previews the formatted result, then requires
 * an explicit tap-to-confirm before it publishes to the congregation. Never
 * submits on its own — every call to intake('submit', …) follows a second,
 * deliberate tap.
 *
 * Mounted only for the pastor_leader persona; staff is null when nobody has
 * signed in at Settings → Pastor account.
 */
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { t } from '../../utils/i18n';
import { intake } from '../../staff/api';
import { CONGREGATIONS, isCongregationId, type CongregationId } from '../../data/congregations';
import { getCongregation } from '../../utils/congregation';
import { setAppStaffSignIn } from '../../utils/staffIdentity';
import { SermonNotesSurface, type SermonNotesData } from '../SermonNotesSurface';
import {
  buildAnswers,
  publishJobFor,
  type IntakeQuestion,
  type PreachOutline,
  type StaffLike,
} from '../../utils/preachPublish';

export interface PublishSermonProps {
  outline: PreachOutline;
  staff: StaffLike | null;
  lang: string;
  onPublished: (result: { id?: string; title?: string; kind: 'sermon' | 'campus' }) => void;
}

type CampusPreview = { title: string; body: string };
type PublishResult = { id?: string; title?: string; kind: 'sermon' | 'campus' };

const cardStyle: CSSProperties = {
  background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
  borderRadius: 16, padding: '18px 20px', marginBottom: 16,
};
const labelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 12px',
};
const mutedStyle: CSSProperties = {
  fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5,
};
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
  borderRadius: 10, color: 'var(--dw-text-primary)',
  fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 10,
};
const btnPrimary: CSSProperties = {
  background: 'var(--dw-accent)', color: '#fff', border: 'none', borderRadius: 12,
  padding: '12px 18px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', minHeight: 44,
};
const btnGhost: CSSProperties = {
  background: 'transparent', color: 'var(--dw-text-secondary)', border: '1px solid var(--dw-border)',
  borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer', minHeight: 44,
};

/** Mirrors intake-core.js sanitize(): tags and control characters stripped,
 *  capped — so the campus preview is the text the server will actually post. */
function sanitizeLikeServer(str: string, maxLen: number): string {
  // eslint-disable-next-line no-control-regex -- mirrors intake-core sanitize() exactly
  return String(str || '').replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

/** Mirrors the server's splitCampusCorner (intake-core.js) for the local, no-request preview. */
function splitTitleBody(raw: string): CampusPreview {
  const text = sanitizeLikeServer(raw, 5000);
  if (!text) return { title: '', body: '' };
  const nl = text.search(/\r?\n/);
  if (nl < 0) return { title: text.slice(0, 80), body: text };
  const first = text.slice(0, nl).trim();
  const rest = text.slice(nl).replace(/^\r?\n/, '').trim();
  return { title: (first || rest).slice(0, 80), body: rest || first };
}

export function PublishSermon({ outline, staff, lang, onPublished }: PublishSermonProps) {
  const job = publishJobFor(staff);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  // Which church's Sermon Notes this goes to; starts on the one this device reads.
  const [congregation, setCongregation] = useState<CongregationId>(() => getCongregation());
  const [preview, setPreview] = useState<SermonNotesData | null>(null);
  const [campusPreview, setCampusPreview] = useState<CampusPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    if (!staff || !job) return;
    let cancelled = false;
    intake<{ questions: IntakeQuestion[] }>('form', { job })
      .then(data => { if (!cancelled) setQuestions(data.questions || []); })
      .catch(err => { if (!cancelled) setError(errText(err, t('preach_publish_load_error', lang))); });
    return () => { cancelled = true; };
  }, [staff, job, lang]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setCampusPreview(null);
    setConfirming(false);
    setResult(null);
  }, []);

  if (!staff) {
    return (
      <div style={cardStyle} data-testid="preach-publish-card">
        <p style={labelStyle}>{t('preach_publish_title', lang)}</p>
        <p style={mutedStyle} data-testid="preach-publish-sign-in">{t('preach_publish_sign_in', lang)}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={cardStyle} data-testid="preach-publish-card">
        <p style={labelStyle}>{t('preach_publish_title', lang)}</p>
        <p style={mutedStyle} data-testid="preach-publish-unavailable">{t('preach_publish_unavailable', lang)}</p>
      </div>
    );
  }

  const runPreview = async () => {
    setBusy(true); setError(''); setConfirming(false); setResult(null);
    try {
      const built = buildAnswers(questions, outline, staff, { useAI, youtubeUrl });
      // Say what is missing NOW — the server would only refuse at the confirm step.
      if (built.missing.length) {
        setPreview(null); setCampusPreview(null);
        setError(`${t('preach_publish_missing', lang)} ${built.missing.join(', ')}`);
        setBusy(false);
        return;
      }
      if (job === 'hub') {
        const data = await intake<{ preview: SermonNotesData | null }>('format_preview', {
          job, answers: built.answers, useAI, congregation,
        });
        if (data.preview) {
          setCampusPreview(null);
          setPreview(data.preview);
        } else {
          setPreview(null);
          setError(t('preach_publish_nothing_to_preview', lang));
        }
      } else {
        const cornerQ = questions.find(q => q.type === 'long_text' && q.config?.publish === 'campus_corner');
        const raw = cornerQ ? String(built.answers[cornerQ.id] || '') : '';
        const split = splitTitleBody(raw);
        if (!split.title && !split.body) {
          setCampusPreview(null);
          setError(t('preach_publish_nothing_to_preview', lang));
        } else {
          setPreview(null);
          setCampusPreview(split);
        }
      }
    } catch (err) {
      setError(errText(err, t('preach_publish_preview_error', lang)));
    }
    setBusy(false);
  };

  const hasPreview = job === 'hub' ? !!preview : !!campusPreview;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const built = buildAnswers(questions, outline, staff, { useAI, youtubeUrl });
      const data = await intake<{ submission?: { id?: string }; preview?: SermonNotesData | null }>('submit', {
        job,
        answers: built.answers,
        congregation: job === 'hub' ? congregation : undefined,
        campusId: built.campusId || undefined,
        formatted_sermon: job === 'hub' ? preview || undefined : undefined,
      });
      const kind: 'sermon' | 'campus' = job === 'hub' ? 'sermon' : 'campus';
      const title = job === 'hub' ? (data.preview?.title || preview?.title || outline.title) : campusPreview?.title || outline.title;
      const published: PublishResult = { id: data.submission?.id, title, kind };
      setResult(published);
      setConfirming(false);
      onPublished(published);
    } catch (err) {
      setError(errText(err, t('preach_publish_submit_error', lang)));
      // A 401 means intake() dropped the staff token: tell the app the session is gone
      // (STAFF_SESSION_EVENT) so the screen swaps this card for the sign-in line.
      if ((err as { status?: number } | null)?.status === 401) setAppStaffSignIn(false);
      setConfirming(false);
    }
    setBusy(false);
  };

  const handlePublishTap = () => {
    if (!hasPreview || busy) return;
    if (!confirming) { setConfirming(true); return; }
    void submit();
  };

  const publishLabel = job === 'hub' ? t('preach_publish_send', lang) : t('preach_publish_post_campus', lang);

  return (
    <div style={cardStyle} data-testid="preach-publish-card">
      <p style={labelStyle}>{t('preach_publish_title', lang)}</p>

      {job === 'hub' && (
        <>
          <select
            value={congregation}
            onChange={e => { if (isCongregationId(e.target.value)) { setCongregation(e.target.value); clearPreview(); } }}
            style={inputStyle}
            aria-label="Which church is this for?"
            data-testid="preach-publish-congregation"
          >
            {CONGREGATIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            value={youtubeUrl}
            onChange={e => { setYoutubeUrl(e.target.value); clearPreview(); }}
            placeholder={t('preach_publish_youtube_ph', lang)}
            style={inputStyle}
            data-testid="preach-publish-youtube-input"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', marginBottom: 14, minHeight: 24 }}>
            <input
              type="checkbox"
              checked={useAI}
              onChange={e => { setUseAI(e.target.checked); clearPreview(); }}
              data-testid="preach-publish-ai-checkbox"
            />
            {t('preach_publish_ai_tidy', lang)}
          </label>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          type="button"
          style={btnGhost}
          disabled={busy}
          onClick={() => void runPreview()}
          data-testid="preach-publish-preview-btn"
        >
          {t('preach_publish_preview', lang)}
        </button>
        <button
          type="button"
          style={{ ...btnPrimary, opacity: hasPreview ? 1 : 0.5, cursor: hasPreview && !busy ? 'pointer' : 'not-allowed' }}
          disabled={!hasPreview || busy}
          onClick={handlePublishTap}
          data-testid="preach-publish-submit-btn"
        >
          {confirming ? t('preach_publish_confirm', lang) : publishLabel}
        </button>
      </div>

      {hasPreview && !result && (
        <p style={{ fontSize: 12, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }} data-testid="preach-publish-warning">
          {t('preach_publish_warning', lang)}
        </p>
      )}

      {job === 'hub' && preview && (
        <div data-testid="preach-publish-preview">
          <SermonNotesSurface sermon={preview} readOnly />
        </div>
      )}

      {job === 'campus' && campusPreview && (
        <div
          style={{ background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', borderRadius: 12, padding: '14px 16px' }}
          data-testid="preach-publish-campus-preview"
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: '0 0 6px' }}>
            {campusPreview.title}
          </p>
          <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', fontStyle: 'normal', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {campusPreview.body}
          </p>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: 'var(--dw-error, #c0392b)', fontFamily: 'var(--font-sans)', margin: '14px 0 0', lineHeight: 1.5 }} data-testid="preach-publish-error">
          {error}
        </p>
      )}

      {result && (
        <p style={{ fontSize: 13, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 600, margin: '14px 0 0' }} data-testid="preach-publish-success">
          {job === 'hub' ? t('preach_publish_success_sermon', lang) : t('preach_publish_success_campus', lang)}
        </p>
      )}
    </div>
  );
}

function errText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data && typeof data.error === 'string' && data.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
