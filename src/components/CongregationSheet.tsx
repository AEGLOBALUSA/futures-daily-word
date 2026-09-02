/**
 * "Which church?" — the Sermon Notes congregation chooser (Ashley, 2 Sep 2026:
 * three places for the sermon notes — Futures USA, Futures Australia, Futuros
 * USA — with a drop-down when someone taps the Home banner).
 *
 * Same grammar as ChoosePathSheet (bottom sheet, one history entry via
 * useSubView, one tap on a card commits). Mounted once at App level; any
 * surface opens it with openCongregationChooser('open' | 'stay'):
 *   'open' — after the pick, App switches to Sermon Notes (the Home banner).
 *   'stay' — the pick just re-fetches wherever you are (the notes header chip).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Church } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { useSubView } from '../utils/useSubView';
import { hapticTap } from '../utils/haptics';
import { track } from '../utils/analytics';
import { CONGREGATIONS, type CongregationId } from '../data/congregations';
import { getCongregation, setCongregation } from '../utils/congregation';

export function CongregationSheet({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  /** Fires after every pick (changed or not) so the opener can go on to Sermon Notes. */
  onPicked?: (id: CongregationId, changed: boolean) => void;
}) {
  const lang = getLang();
  const [current, setCurrent] = useState<CongregationId>(() => getCongregation());
  const panelRef = useRef<HTMLDivElement>(null);

  useSubView(open, onClose);

  useEffect(() => {
    if (!open) return;
    setCurrent(getCongregation());
    track('congregation_sheet_open');
    const first = panelRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    (first || panelRef.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function commit(next: CongregationId) {
    hapticTap();
    const changed = next !== current;
    setCongregation(next);
    setCurrent(next);
    if (changed) track('congregation_chosen', next);
    onClose();
    onPicked?.(next, changed);
  }

  return (
    <div className="dw-cp-sheet-host">
      <div className="dw-cp-sheet-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="dw-congregation-sheet-title"
        tabIndex={-1}
        className="dw-cp-sheet"
        data-testid="congregation-sheet"
      >
        <div className="dw-cp-sheet-grip" aria-hidden />
        <h2 id="dw-congregation-sheet-title" style={{
          margin: '4px 0 4px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
          lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--dw-text)',
        }}>
          {t('congregation_sheet_title', lang)}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.4, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {t('congregation_sheet_sub', lang)}
        </p>

        <div role="listbox" aria-label={t('congregation_sheet_title', lang)} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CONGREGATIONS.map(c => {
            const active = c.id === current;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => commit(c.id)}
                className={`dw-cp-card${active ? ' is-selected' : ''}`}
                data-testid={`congregation-${c.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 14, cursor: 'pointer',
                  background: active ? 'var(--dw-new-soft)' : 'transparent',
                  border: `1.5px solid ${active ? 'var(--dw-new)' : 'var(--dw-border)'}`,
                  minHeight: 56,
                }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: '#FBF8F1', border: '1px solid rgba(28,20,12,0.10)',
                  boxShadow: '0 2px 7px rgba(28,20,12,0.12)',
                }}>
                  <Church size={16} strokeWidth={1.9} aria-hidden className="dw-cp-marker" style={{ '--cp-tone': '#3F5E46' } as CSSProperties} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>
                    {c.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.3, marginTop: 2, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    {c.hint}
                  </span>
                </span>
                {active && (
                  <Check size={16} strokeWidth={2.4} aria-hidden className="dw-cp-marker" style={{ '--cp-tone': 'var(--dw-new)', flexShrink: 0 } as CSSProperties} />
                )}
              </button>
            );
          })}
        </div>
        <p className="dw-cp-sheet-foot" style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {t('congregation_sheet_footer', lang)}
        </p>
      </div>
    </div>
  );
}

/** Small pill naming the congregation being read; tapping it opens the chooser. */
export function CongregationChip({ name, onClick }: { name: string; onClick: () => void }) {
  const lang = getLang();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`${name} — ${t('congregation_change', lang)}`}
      data-testid="congregation-chip"
      style={{
        height: 32, padding: '0 10px', borderRadius: 999, marginLeft: 'auto',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        border: '1px solid var(--dw-border)', background: 'var(--dw-card)',
        cursor: 'pointer', color: 'var(--dw-text)', fontFamily: 'var(--font-sans)',
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      <Church size={13} strokeWidth={2} aria-hidden />
      {name}
    </button>
  );
}
