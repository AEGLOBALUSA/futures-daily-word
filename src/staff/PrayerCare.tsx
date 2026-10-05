import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getLang, t } from '../utils/i18n';
import * as careApi from './prayerCareApi';
import type { PrayerCare as PrayerCareData, PrayerDecision } from './prayerCareApi';

const cardStyle: CSSProperties = {
  background: 'var(--dw-card)', color: 'var(--dw-text-primary)',
  border: '1px solid var(--dw-border)', borderRadius: 16, padding: 20,
  marginBottom: 16, fontSize: 15, lineHeight: 1.5, overflowWrap: 'anywhere',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
const secondaryStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 44, maxWidth: '100%', boxSizing: 'border-box', padding: '10px 14px',
  border: '1px solid var(--dw-border)', borderRadius: 12,
  background: 'var(--dw-card)', color: 'var(--dw-text-primary)',
  fontSize: 15, fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer',
};
const lineStyle: CSSProperties = { margin: '12px 0', fontSize: 15 };
const quietStyle: CSSProperties = { ...lineStyle, color: 'var(--dw-text-secondary)' };
const quoteStyle: CSSProperties = { margin: '16px 0', whiteSpace: 'pre-wrap', fontSize: 17 };

/** The children are Staff home's existing job cards; both prayer cards share one load. */
export function PrayerCare({ staff, children }: {
  staff: { role: string; isAdmin?: boolean };
  children: ReactNode;
}) {
  const allowed = careApi.canSeePrayerCare(staff);
  const [data, setData] = useState<PrayerCareData | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [loadFailed, setLoadFailed] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inFlight = useRef(false);
  const firstLoad = useRef<Promise<PrayerCareData | null> | null>(null);
  const lang = getLang();
  const text = (key: string) => t(`prayer_care_${key}`, lang);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    // Reuse the opening request if React replays the effect in StrictMode.
    firstLoad.current ??= careApi.loadPrayerCare();
    void firstLoad.current.then(result => {
      if (active) { setData(result); setLoadFailed(false); }
    }, () => {
      if (active) setLoadFailed(true);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  const reload = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setData(await careApi.loadPrayerCare());
    } catch {
      setData(null);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try { await reload(); } finally { inFlight.current = false; }
  };

  const decide = async (id: string, decision: PrayerDecision) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setDecisionError('');
    try {
      await careApi.decidePrayer(id, decision);
      // Includes 'decided': another staff member got there first. Just reload.
      await reload();
    } catch (err) {
      const message = (err as { message?: unknown })?.message;
      setDecisionError(typeof message === 'string' && message ? message : text('decision_failed'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const days = (n: number, posted = false) => text(
    `${posted ? 'posted_' : ''}${n === 0 ? 'today' : n === 1 ? 'one_day' : 'days'}`,
  ).replace('{n}', String(n));
  const held = allowed ? data?.held[0] : undefined;

  return <>
    {held && (
      <section style={cardStyle} aria-labelledby="prayer-care-held-title">
        <h2 id="prayer-care-held-title" className="font-bold" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>
          {held.campusName ? text('held_campus').replace('{campus}', held.campusName) : text('held')}
        </h2>
        {data!.held.length > 1 && <p style={quietStyle}>{text('waiting').replace('{n}', String(data!.held.length))}</p>}
        <blockquote style={quoteStyle}>“{held.text}”</blockquote>
        {held.heldReason && <p style={quietStyle}>{text(`reason_${held.heldReason}`)}</p>}
        <p style={quietStyle}>{days(held.daysAgo, true)}</p>
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-card)', padding: '12px 0', display: 'grid', gap: 10 }}>
          <button type="button" className="dw-next font-semibold" aria-disabled={busy} onClick={() => void decide(held.id, 'show')}
            style={{ ...secondaryStyle, width: '100%', minHeight: 56, background: 'var(--dw-accent)', color: 'var(--dw-accent-on-fill)', borderColor: 'var(--dw-accent)' }}>
            {text('show')}
          </button>
          <button type="button" className="font-semibold" aria-disabled={busy} style={secondaryStyle} onClick={() => void decide(held.id, 'private')}>
            {text('private')}
          </button>
          {busy && <p role="status" style={{ ...quietStyle, margin: 0 }}>{text('saving')}</p>}
          {decisionError && <p role="alert" style={{ ...lineStyle, margin: 0, color: 'var(--dw-error)' }}>{decisionError} {text('retry_decision')}</p>}
        </div>
      </section>
    )}
    {children}
    {allowed && (loading || loadFailed || data) && (
      <section style={cardStyle} aria-labelledby="prayer-care-week-title">
        <h2 id="prayer-care-week-title" className="font-bold" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>{text('week')}</h2>
        {loading ? <p role="status" style={quietStyle}>{text('loading')}</p> : loadFailed ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <p role="alert" style={{ ...lineStyle, margin: 0 }}>{text('load_failed')}</p>
            <button type="button" style={secondaryStyle} onClick={() => void retry()}>{text('retry')}</button>
          </div>
        ) : data && <>
          {data.scope && <p style={quietStyle}>{data.scope.all ? text('every_campus') : text('campus_week').replace('{campus}', data.scope.campusName)}</p>}
          {data.week.length === 0 ? <p style={lineStyle}>{text('empty')}</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {(showAll ? data.week : data.week.slice(0, 10)).map(row => {
                const href = !row.anonymous && row.firstName ? careApi.mailtoFor(row.email) : '';
                return <li key={row.id} style={{ borderTop: '1px solid var(--dw-border)', padding: '16px 0' }}>
                  {!row.anonymous && <>
                    <p style={lineStyle}>{row.firstName} · {days(row.daysAgo)}</p>
                    {data.scope?.all && row.campusName && <p style={quietStyle}>{row.campusName}</p>}
                  </>}
                  {row.status === 'private' && <span style={{ display: 'inline-block', border: '1px solid var(--dw-border)', borderRadius: 6, padding: '2px 8px', fontSize: 15 }}>{text('kept_private')}</span>}
                  <blockquote style={quoteStyle}>“{row.text}”</blockquote>
                  <p style={quietStyle}>{text('prayed').replace('{n}', String(row.prayed))}</p>
                  {href && <a href={href} className="font-semibold" style={secondaryStyle}>{text('write').replace('{name}', row.firstName!)}</a>}
                </li>;
              })}
            </ul>
          )}
          {!showAll && data.week.length > 10 && <button type="button" style={secondaryStyle} onClick={() => setShowAll(true)}>{text('show_all').replace('{n}', String(data.week.length))}</button>}
        </>}
      </section>
    )}
  </>;
}
