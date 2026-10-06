import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getLang, t } from '../utils/i18n';
import * as careApi from './prayerCareApi';
import type { PrayerCare as PrayerCareData, PrayerDecision, PrayerDone, PrayerLines } from './prayerCareApi';

const cardStyle: CSSProperties = {
  background: 'var(--dw-card)', color: 'var(--dw-text-primary)',
  border: '1px solid var(--dw-border)', borderRadius: 16, padding: 20,
  marginBottom: 16, maxWidth: 680, fontSize: 15, lineHeight: 1.5, overflowWrap: 'anywhere',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
const secondaryStyle = {
  '--mos-control-height': '44px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 44, maxWidth: '100%', boxSizing: 'border-box', padding: '10px 14px',
  border: '1px solid var(--dw-border)', borderRadius: 12,
  background: 'var(--dw-card)', color: 'var(--dw-text-primary)',
  fontSize: 15, fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer',
} as CSSProperties;
const lineStyle: CSSProperties = { margin: '12px 0', fontSize: 15 };
const quietStyle: CSSProperties = { ...lineStyle, color: 'var(--dw-text-secondary)' };
const quoteStyle: CSSProperties = { margin: '16px 0', whiteSpace: 'pre-wrap', fontSize: 17 };
const textButtonStyle: CSSProperties = {
  ...secondaryStyle, border: 'none', background: 'transparent', textDecoration: 'underline',
};
type LineAction = 'write' | PrayerDone;
type UnavailableKey = 'line_another_campus' | 'request_gone';
type LineState = {
  asked?: boolean; busy?: LineAction | 'copy'; error?: LineAction;
  href?: string; copy?: 'copied' | 'failed'; unavailable?: UnavailableKey;
};

/** Both appearances of a request share its confirmation, busy state and errors. */
function usePrayerActions(
  onClosed: (id: string, kind: PrayerDone) => void,
  onUnavailable: (id: string, reason: UnavailableKey) => void,
) {
  const [states, setStates] = useState<Record<string, LineState>>({});
  const pending = useRef(new Set<string>());
  const opened = useRef(new Set<string>());
  const patch = (id: string, update: Partial<LineState>) =>
    setStates(current => ({ ...current, [id]: { ...current[id], ...update } }));

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setStates(current => {
        const next = { ...current };
        for (const id of opened.current) next[id] = { ...next[id], asked: true };
        return next;
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const act = async (id: string, action: LineAction) => {
    if (pending.current.has(id) || states[id]?.unavailable) return;
    pending.current.add(id);
    patch(id, { busy: action, error: undefined });
    try {
      if (action === 'write') {
        const href = await careApi.prayerWriteLink(id);
        opened.current.add(id);
        patch(id, { asked: true, href, copy: undefined });
        window.location.href = href;
      } else {
        const result = await careApi.closePrayerLine(id, action);
        opened.current.delete(id);
        patch(id, { asked: false, href: undefined, copy: undefined });
        onClosed(id, result.kind);
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) return; // The app opens sign-in.
      if (status === 403 || status === 404) {
        const unavailable = status === 403 ? 'line_another_campus' : 'request_gone';
        opened.current.delete(id);
        patch(id, { unavailable, asked: false, href: undefined, copy: undefined });
        onUnavailable(id, unavailable);
      } else {
        patch(id, { error: action });
      }
    } finally {
      pending.current.delete(id);
      patch(id, { busy: undefined });
    }
  };
  const copyAddress = async (id: string) => {
    const href = states[id]?.href;
    if (!href || !states[id]?.asked || pending.current.has(id)) return;
    pending.current.add(id);
    patch(id, { busy: 'copy', copy: undefined });
    try {
      await navigator.clipboard.writeText(decodeURIComponent(href.slice('mailto:'.length)));
      patch(id, { copy: 'copied' });
    } catch {
      patch(id, { copy: 'failed' });
    } finally {
      pending.current.delete(id);
      patch(id, { busy: undefined });
    }
  };
  const notYet = (id: string) => {
    if (pending.current.has(id)) return;
    opened.current.delete(id);
    patch(id, { asked: false, error: undefined, href: undefined, copy: undefined });
  };
  return { states, act, copyAddress, notYet };
}

function PrayerActions({ id, name, canWrite, main = false, allowPrayed = false, flow, text, writeKey = 'line_write' }: {
  id: string; name: string | null; canWrite: boolean; main?: boolean; allowPrayed?: boolean;
  flow: ReturnType<typeof usePrayerActions>; text: (key: string) => string; writeKey?: string;
}) {
  const state = flow.states[id] ?? {};
  const writable = !!name && canWrite;
  const asked = writable && state.asked;
  const primaryAction: LineAction = asked ? 'wrote' : writable ? 'write' : 'prayed';
  const words = (key: string) => text(key).replace('{name}', () => name ?? '');
  if (state.unavailable) return <p role="alert" style={{ ...lineStyle, color: 'var(--dw-error)' }}>
    {text(state.unavailable)}
  </p>;
  const feedback = (action: LineAction) => <>
    {state.busy === action && <p role="status" style={quietStyle}>{text(action === 'write' ? 'opening_email' : 'saving')}</p>}
    {state.error === action && <p role="alert" style={{ ...lineStyle, color: 'var(--dw-error)' }}>
      {text(action === 'write' ? 'email_failed' : 'save_failed')}
    </p>}
  </>;
  return <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
    {asked && <p style={lineStyle}>{words('did_write')}</p>}
    <div>
      <button type="button" className={main ? 'dw-next dw-campus-main font-semibold' : 'font-semibold'}
        aria-disabled={!!state.busy} onClick={() => void flow.act(id, primaryAction)}
        style={{ ...secondaryStyle, borderRadius: 999, whiteSpace: 'normal', ...(main ? {
          '--mos-main-button-height': '56px', width: '100%', minHeight: 56,
          background: 'var(--dw-accent)', color: 'var(--dw-accent-on-fill)', borderColor: 'var(--dw-accent)',
        } : {}) } as CSSProperties}>
        {words(asked ? 'i_wrote' : writable ? writeKey : 'i_prayed')}
      </button>
      {feedback(primaryAction)}
    </div>
    {asked ? <>
      <div>
        <button type="button" style={textButtonStyle} aria-disabled={!!state.busy}
          onClick={() => void flow.copyAddress(id)}>{words('copy_address')}</button>
        {state.copy === 'copied' && <p role="status" style={lineStyle}>{text('address_copied')}</p>}
        {state.copy === 'failed' && <p role="alert" style={{ ...lineStyle, color: 'var(--dw-error)' }}>{text('copy_failed')}</p>}
      </div>
      <button type="button" style={textButtonStyle} aria-disabled={!!state.busy}
        onClick={() => flow.notYet(id)}>{text('not_yet')}</button>
    </> : allowPrayed && writable && <div>
      <button type="button" style={textButtonStyle} aria-disabled={!!state.busy}
        onClick={() => void flow.act(id, 'prayed')}>{text('i_prayed')}</button>
      {feedback('prayed')}
    </div>}
  </div>;
}

function waitingWords(createdAt: string, text: (key: string) => string) {
  const hours = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 3_600_000));
  if (hours < 1) return text('just_now');
  if (hours < 24) return text(hours === 1 ? 'one_hour' : 'hours').replace('{n}', String(hours));
  if (hours < 48) return text('yesterday');
  return text('waiting_days').replace('{n}', String(Math.floor(hours / 24)));
}

/** The children are Staff home's existing job cards, between the open lines and weekly list. */
export function PrayerCare({ staff, children, onHeldChange, onNeedsYouMainChange }: {
  staff: { role: string; isAdmin?: boolean };
  children: ReactNode;
  onHeldChange?: (held: boolean) => void;
  onNeedsYouMainChange?: (main: boolean) => void;
}) {
  const allowed = careApi.canSeePrayerCare(staff);
  const [data, setData] = useState<PrayerCareData | null>(null);
  const [linesData, setLinesData] = useState<(PrayerLines & { completed?: boolean }) | null>(null);
  const [muteBusy, setMuteBusy] = useState(false);
  const [muteError, setMuteError] = useState(false);
  const mutePending = useRef(false);
  const firstLinesLoad = useRef<Promise<PrayerLines | null> | null>(null);
  const linesLoadVersion = useRef(0);
  const linesPending = useRef(false);
  const [linesLoading, setLinesLoading] = useState(allowed);
  const [linesLoadFailed, setLinesLoadFailed] = useState(false);
  const [lineUnavailable, setLineUnavailable] = useState<UnavailableKey | ''>('');
  const closedKinds = useRef(new Map<string, PrayerDone>());
  const lineRows = useRef(new Map<string, HTMLLIElement>());
  const completionStatus = useRef<HTMLParagraphElement>(null);
  const focusAfterClose = useRef<string[] | null>(null);
  const [loading, setLoading] = useState(allowed);
  const [loadFailed, setLoadFailed] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [unavailableError, setUnavailableError] = useState('');
  const [decisionNotice, setDecisionNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inFlight = useRef(false);
  const firstLoad = useRef<Promise<PrayerCareData | null> | null>(null);
  const unavailableIds = useRef(new Set<string>());
  const lang = getLang();
  const text = (key: string) => t(`prayer_care_${key}`, lang);
  const patchWeek = (result: PrayerCareData | null) => result ? {
    ...result, week: result.week.map(row => ({ ...row, done: closedKinds.current.get(row.id) ?? row.done })),
  } : null;
  const flow = usePrayerActions((id, kind) => {
    closedKinds.current.set(id, kind);
    const lines = linesData?.lines ?? [];
    const index = lines.findIndex(line => line.id === id);
    if (index !== -1) {
      focusAfterClose.current = [...lines.slice(index + 1), ...lines.slice(0, index)].map(line => line.id);
    }
    setData(current => patchWeek(current));
    setLinesData(current => current && current.lines.some(line => line.id === id) ? {
      ...current, lines: current.lines.filter(line => line.id !== id), completed: true,
    } : current);
  }, (id, reason) => {
    unavailableIds.current.add(id);
    setLineUnavailable(reason);
    setLinesData(current => current ? { ...current, lines: current.lines.filter(line => line.id !== id) } : null);
  });

  useLayoutEffect(() => {
    if (!focusAfterClose.current) return;
    const next = focusAfterClose.current.map(id => lineRows.current.get(id)?.querySelector('button')).find(Boolean);
    (next ?? completionStatus.current)?.focus();
    focusAfterClose.current = null;
  }, [linesData]);

  const receiveLines = (result: PrayerLines | null) => {
    setLinesData(current => result ? {
      ...result, lines: result.lines.filter(line => !closedKinds.current.has(line.id) && !unavailableIds.current.has(line.id)),
      completed: current?.completed || result.lines.some(line => closedKinds.current.has(line.id)),
    } : null);
    setLinesLoadFailed(false);
  };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const version = ++linesLoadVersion.current;
    firstLinesLoad.current ??= careApi.loadPrayerLines();
    void firstLinesLoad.current.then(result => {
      if (active && version === linesLoadVersion.current) receiveLines(result);
    }, () => {
      if (active && version === linesLoadVersion.current) setLinesLoadFailed(true);
    }).finally(() => {
      if (active && version === linesLoadVersion.current) setLinesLoading(false);
    });
    return () => { active = false; };
  }, [allowed]);

  const reloadLines = async (afterDecision = false) => {
    if (linesPending.current && !afterDecision) return;
    linesPending.current = true;
    const version = ++linesLoadVersion.current;
    setLinesLoading(true);
    try {
      const result = await careApi.loadPrayerLines();
      if (version === linesLoadVersion.current) receiveLines(result);
    } catch {
      if (version === linesLoadVersion.current) setLinesLoadFailed(true);
    } finally {
      if (version === linesLoadVersion.current) {
        linesPending.current = false;
        setLinesLoading(false);
      }
    }
  };

  const toggleWaitingEmail = async () => {
    if (!linesData || mutePending.current) return;
    mutePending.current = true;
    setMuteBusy(true);
    setMuteError(false);
    try {
      const waitingMuted = await careApi.setWaitingMuted(!linesData.waitingMuted);
      setLinesData(current => current ? { ...current, waitingMuted } : current);
    } catch {
      setMuteError(true);
    } finally {
      mutePending.current = false;
      setMuteBusy(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    // Reuse the opening request if React replays the effect in StrictMode.
    firstLoad.current ??= careApi.loadPrayerCare();
    void firstLoad.current.then(result => {
      if (active) { setData(patchWeek(result)); setLoadFailed(false); }
    }, () => {
      if (active) setLoadFailed(true);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  const reload = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const result = await careApi.loadPrayerCare();
      setData(patchWeek(result ? { ...result, held: result.held.filter(row => !unavailableIds.current.has(row.id)) } : null));
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
    setUnavailableError('');
    setDecisionNotice('');
    try {
      const result = await careApi.decidePrayer(id, decision);
      await Promise.all([reload(), reloadLines(true)]);
      setDecisionNotice(`decision_${result}`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) return; // The app opens sign-in for an expired session.
      if (status === 403 || status === 404) {
        setUnavailableError(status === 403 ? 'another_campus' : 'request_gone');
        unavailableIds.current.add(id);
        // Retire this card immediately, including if refreshing the list fails.
        setData(current => current ? { ...current, held: current.held.filter(row => row.id !== id) } : current);
        await reload();
      } else {
        setDecisionError('decision_failed');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const days = (n: number, posted = false) => text(
    `${posted ? 'posted_' : ''}${n === 0 ? 'today' : n === 1 ? 'one_day' : 'days'}`,
  ).replace('{n}', String(n));
  const held = allowed ? data?.held[0] : undefined;
  const hasHeld = !!held;
  const hasNeedsYouMain = allowed && !loading && !hasHeld && !!linesData?.lines.length;
  // Set the corner draft's priority before paint, including when a line closes.
  useLayoutEffect(() => {
    onHeldChange?.(hasHeld);
    onNeedsYouMainChange?.(hasNeedsYouMain);
  }, [hasHeld, hasNeedsYouMain, onHeldChange, onNeedsYouMainChange]);

  return <>
    {allowed && (held || unavailableError || decisionNotice) && (
      <section style={cardStyle} aria-labelledby={held ? 'prayer-care-held-title' : undefined} aria-label={held ? undefined : text('held')}>
        <p role="status" style={{ ...lineStyle, margin: decisionNotice ? '12px 0' : 0 }}>
          {decisionNotice && `${text(decisionNotice)}${held ? ` ${text('next_request')}` : data ? ` ${text('none_waiting')}` : ''}`}
        </p>
        {decisionNotice && (loading ? <p role="status" style={lineStyle}>{text('loading')}</p> : loadFailed && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 0' }}>
            <p role="alert" style={{ ...lineStyle, margin: 0, color: 'var(--dw-error)' }}>{text('load_failed')}</p>
            <button type="button" style={secondaryStyle} onClick={() => void retry()}>{text('retry')}</button>
          </div>
        ))}
        {unavailableError && <div style={{ display: 'grid', gap: 10, padding: '12px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <p role="alert" style={{ ...lineStyle, margin: 0, color: 'var(--dw-error)' }}>
              {text(unavailableError)}{loadFailed ? ` ${text('load_failed')}` : ''}
            </p>
            {loadFailed && <button type="button" style={secondaryStyle} onClick={() => void retry()}>{text('retry')}</button>}
          </div>
          {!loadFailed && <p role="status" style={{ ...lineStyle, margin: 0 }}>
            {text(loading ? 'loading' : held ? 'next_request' : 'nothing_else_waiting')}
          </p>}
        </div>}
        {held && <>
        <h2 id="prayer-care-held-title" className="font-bold" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>
          {held.campusName ? text('held_campus').replace('{campus}', held.campusName) : text('held')}
        </h2>
        {data!.held.length > 1 && <p style={quietStyle}>{text('waiting').replace('{n}', String(data!.held.length))}</p>}
        <blockquote style={quoteStyle}>“{held.text}”</blockquote>
        {held.heldReason && <p style={quietStyle}>{text(`reason_${held.heldReason}`)}</p>}
        <p style={quietStyle}>{days(held.daysAgo, true)}</p>
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--dw-card)', padding: '12px 0', display: 'grid', gap: 10 }}>
          <button type="button" className="dw-campus-main dw-next font-semibold" aria-disabled={busy} onClick={() => void decide(held.id, 'show')}
            style={{ ...secondaryStyle, '--mos-main-button-height': '56px', width: '100%', minHeight: 56, background: 'var(--dw-accent)', color: 'var(--dw-accent-on-fill)', borderColor: 'var(--dw-accent)' } as CSSProperties}>
            {text('show')}
          </button>
          <button type="button" className="font-semibold" aria-disabled={busy} style={secondaryStyle} onClick={() => void decide(held.id, 'private')}>
            {text('private')}
          </button>
          {busy && <p role="status" style={{ ...quietStyle, margin: 0 }}>{text('saving')}</p>}
          {decisionError && <p role="alert" style={{ ...lineStyle, margin: 0, color: 'var(--dw-error)' }}>{text(decisionError)}</p>}
        </div>
        </>}
      </section>
    )}
    {allowed && (linesLoadFailed || (linesLoading && !linesData) || lineUnavailable) && <div style={cardStyle}>
      {lineUnavailable && <p role="alert" style={{ ...lineStyle, color: 'var(--dw-error)' }}>{text(lineUnavailable)}</p>}
      {linesLoading && <p role="status" style={lineStyle}>{text('loading')}</p>}
      {linesLoadFailed && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <p role="alert" style={{ ...lineStyle, margin: 0, color: 'var(--dw-error)' }}>{text('lines_load_failed')}</p>
        <button type="button" style={secondaryStyle} aria-disabled={linesLoading}
          onClick={() => void reloadLines()}>{text('retry')}</button>
      </div>}
    </div>}
    {allowed && linesData && (linesData.lines.length > 0 || linesData.completed) && (
      <section style={cardStyle} aria-labelledby={linesData.lines.length ? 'prayer-care-needs-title' : undefined}
        aria-label={linesData.lines.length ? undefined : text('needs_you').replace('{n}', '0')}>
        <p ref={completionStatus} tabIndex={-1} role="status" style={{ ...lineStyle, margin: linesData.completed ? '0 0 12px' : 0 }}>
          {linesData.completed && text(linesData.lines.length === 0 ? 'done_none' : linesData.lines.length === 1 ? 'done_one' : 'done_more')
            .replace('{n}', String(linesData.lines.length))}
        </p>
        {linesData.lines.length > 0 && <>
          <h2 id="prayer-care-needs-title" className="font-bold" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>
            {text('needs_you').replace('{n}', String(linesData.lines.length))}
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {linesData.lines.map((line, index) => {
              const who = line.firstName !== null ? text('named_ask').replace('{name}', () => line.firstName!)
                : line.campusName ? text('campus_ask').replace('{campus}', () => line.campusName) : text('anonymous_ask');
              const waiting = waitingWords(line.createdAt, text);
              return <li key={line.id} ref={node => {
                if (node) lineRows.current.set(line.id, node);
                else lineRows.current.delete(line.id);
              }} style={{ borderBottom: '1px solid var(--dw-border)', padding: '16px 0', minWidth: 0 }}>
                <h3 className="font-bold" aria-label={`${who}, ${waiting}`} style={{ ...lineStyle, marginTop: 0 }}>
                  {who} · {waiting}
                </h3>
                <blockquote style={quoteStyle}>“{line.text}”</blockquote>
                <PrayerActions id={line.id} name={line.firstName} canWrite={line.canWrite}
                  main={index === 0 && hasNeedsYouMain} allowPrayed flow={flow} text={text} />
              </li>;
            })}
          </ul>
        </>}
        <footer>
          <p style={quietStyle}>{text('how_connects')}</p>
          <p style={quietStyle}>{text('connects_explained')}</p>
          <p style={quietStyle}>{text(linesData.waitingMuted ? 'waiting_email_off' : 'waiting_email_explained')}</p>
          <button type="button" style={textButtonStyle} aria-disabled={muteBusy}
            onClick={() => void toggleWaitingEmail()}>{text(linesData.waitingMuted ? 'start_waiting_email' : 'stop_waiting_email')}</button>
          {muteBusy && <p role="status" style={quietStyle}>{text('saving')}</p>}
          {muteError && <p role="alert" style={{ ...lineStyle, color: 'var(--dw-error)' }}>{text('save_failed')}</p>}
        </footer>
      </section>
    )}
    {children}
    {allowed && (loading || (loadFailed && !unavailableError && !decisionNotice) || data) && (
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
                return <li key={row.id} style={{ borderTop: '1px solid var(--dw-border)', padding: '16px 0' }}>
                  {!row.anonymous && <>
                    <p style={lineStyle}>{row.firstName} · {days(row.daysAgo)}</p>
                    {data.scope?.all && row.campusName && <p style={quietStyle}>{row.campusName}</p>}
                  </>}
                  {row.status === 'private' && <span style={{ display: 'inline-block', border: '1px solid var(--dw-border)', borderRadius: 6, padding: '2px 8px', fontSize: 15 }}>{text('kept_private')}</span>}
                  <blockquote style={quoteStyle}>“{row.text}”</blockquote>
                  <p style={quietStyle}>{text('prayed').replace('{n}', String(row.prayed))}</p>
                  {row.done ? <span style={{ display: 'inline-block', border: '1px solid var(--dw-border)', borderRadius: 6, padding: '2px 8px', fontSize: 15 }}>
                    {text(row.done === 'wrote' ? 'written_to' : 'prayed_for')}
                  </span> : !row.anonymous && row.firstName && row.canWrite && <PrayerActions
                    id={row.id} name={row.firstName} canWrite flow={flow} text={text} writeKey="write" />}
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
