/**
 * "Where are you today?" — the one path chooser (Ashley, 2 Sep 2026). A bottom
 * sheet, never a full-screen gate: reached from the Day 1 landing line, the Home
 * path swatch, the asked-once screen after the first read, and Settings.
 *
 * Grammar copies the front-page LanguageSwitch (Atelier Swatch): 36px pill trigger,
 * cream nodes carrying a stroke icon, selected chip = solid sage border + tint + check.
 * Dark-mode trap: index.css forces white on inline `color: rgb(176…/154…/110…)`, so
 * every tone rides a CSS custom property (.dw-cp-marker), never an inline hex.
 *
 * Mount pattern (as NewBelieverLessonCard / BibleAI): the host keeps this mounted
 * with a live `open` prop and it owns exactly one history entry while open via
 * useSubView — no useModalA11y focus trap (it fought sibling overlays).
 *
 * Pastor sign-in does NOT lock the path (Ashley, 2 Sep 2026: "when I change
 * path, that path should show that change"). A signed-in pastor can pick any
 * path — a real choice, which the boot re-stamp never overrides — and the sheet
 * offers "Sign out of pastor account" beside it. Pastor tools return on Leader.
 *
 * One tap opens the path (Ashley, 2 Sep 2026: "when I click on it, it ticks it
 * off but goes nowhere"). The sheet used to tick the card and wait for a sage
 * CTA that sat below the fold on a phone, so the tap looked dead. Tapping a
 * card now saves and opens; tapping the path you already have just closes.
 *
 * Fits a phone without scrolling (Ashley, 2 Sep 2026: "fix the window so it
 * all fits"): 30px nodes, 9/12 card padding, 14.5/12.5 type, 6px gaps — 481px
 * at 390 wide (537 with the pastor sign-out row) against Safari's ~620px of
 * 94dvh with its toolbars showing. Every headline stays on one line.
 */
import { useEffect, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import { BookOpen, Check, ChevronDown, Church, Feather, Heart, Sprout } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { useUser } from '../contexts/UserContext';
import { useSubView } from '../utils/useSubView';
import { useStaffIdentity, useIsPastorSignedIn } from '../utils/useStaffIdentity';
import { flushNow } from '../utils/cloudSync';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import type { Persona } from '../utils/persona-config';
import { PATHS, pathFor, choiceSourceFor, markPathAsked, markPathArrival, openChoosePath, type PathDoor } from '../utils/choosePath';

const ICONS: Record<Persona, ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: CSSProperties; 'aria-hidden'?: boolean }>> = {
  new_to_faith: Sprout,
  congregation: Church,
  deeper_study: BookOpen,
  pastor_leader: Feather,
  comfort: Heart,
};

/** Fixed dark sage for icons that sit on a FIXED cream node (legible in both themes). */
const NODE_TONE = '#3F5E46';

function PathIcon({ persona, size, tone }: { persona: Persona; size: number; tone: string }) {
  const Icon = ICONS[persona];
  return (
    <Icon
      size={size}
      strokeWidth={1.9}
      aria-hidden
      className="dw-cp-marker"
      style={{ '--cp-tone': tone, flexShrink: 0 } as CSSProperties}
    />
  );
}

/** The cream node that carries the path icon inside a card (and the Settings row). */
export function PathNode({ persona, size = 34 }: { persona: Persona; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: '#FBF8F1', border: '1px solid rgba(28,20,12,0.10)',
      boxShadow: '0 2px 7px rgba(28,20,12,0.12)',
    }}>
      <PathIcon persona={persona} size={Math.round(size * 18 / 34)} tone={NODE_TONE} />
    </span>
  );
}

/**
 * Door 2 — the path swatch in the Home header, beside the language swatch.
 * Visible for EVERY persona (a member defaulted onto the journey had no way out
 * but Settings).
 */
export function PathSwatch({ persona, className }: { persona: string; className?: string }) {
  const lang = getLang();
  const path = pathFor(persona);
  const short = t(path.shortKey, lang);
  return (
    <button
      type="button"
      onClick={() => { hapticTap(); openChoosePath('home'); }}
      aria-label={`${t(path.labelKey, lang)} — ${t('path_swatch_label', lang)}`}
      aria-haspopup="dialog"
      className={className ? `dw-cp-swatch ${className}` : 'dw-cp-swatch'}
      style={{
        height: 36, padding: '0 8px 0 3px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        border: '1px solid var(--dw-border)', background: 'var(--dw-card)',
        cursor: 'pointer', color: 'var(--dw-text-muted)', flexShrink: 0,
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--dw-new)', border: '1px solid rgba(28,20,12,0.08)',
      }}>
        <PathIcon persona={path.id} size={14} tone="var(--dw-new-on-fill)" />
      </span>
      <span className="dw-cp-label" style={{
        fontSize: 12, fontWeight: 600, lineHeight: 1, fontFamily: 'var(--font-sans)',
        color: 'var(--dw-text)', whiteSpace: 'nowrap',
      }}>
        {short}
      </span>
      <ChevronDown size={15} strokeWidth={2} aria-hidden />
    </button>
  );
}

export function ChoosePathSheet({
  open,
  onClose,
  door,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  /** Which door opened it — analytics, and the landing leaves its gate on a real change. */
  door: PathDoor;
  /** Fires after a CHANGED path is saved (a re-pick of the current path only closes). */
  onPicked?: (persona: Persona) => void;
}) {
  const lang = getLang();
  const { setup, saveSetup } = useUser();
  const pastorSignedIn = useIsPastorSignedIn();
  const { clearStaffIdentity } = useStaffIdentity();
  const current = pathFor(setup?.persona).id;
  const [selected, setSelected] = useState<Persona>(current);
  const panelRef = useRef<HTMLDivElement>(null);

  useSubView(open, onClose);

  // Each open starts from the path they actually have.
  useEffect(() => {
    if (!open) return;
    setSelected(current);
    track('path_sheet_open', door);
    const first = panelRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    (first || panelRef.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  /** One tap on a card: save the path and open it. The card you already have
   *  just closes the sheet. */
  function commit(next: Persona) {
    hapticTap();
    setSelected(next);
    if (next === current) { onClose(); return; }
    // A deliberate choice from the sheet is always a REAL choice — never 'default'.
    const source = choiceSourceFor(setup?.source);
    saveSetup({ persona: next, source });
    markPathAsked();
    markPathArrival(next); // Home confirms the new path on its next mount
    flushNow();
    track('persona_change', next);
    track('path_chosen', `${door}:${next}`);
    onClose();
    onPicked?.(next);
  }

  function signOut() {
    hapticTap();
    onClose();
    void clearStaffIdentity().then(() => { flushNow(); track('pastor_sign_out'); });
  }

  return (
    <div className="dw-cp-sheet-host">
      <div className="dw-cp-sheet-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="dw-cp-sheet-title"
        tabIndex={-1}
        className="dw-cp-sheet"
      >
        <div className="dw-cp-sheet-grip" aria-hidden />
        <h2 id="dw-cp-sheet-title" style={{
          margin: '4px 0 4px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
          lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--dw-text)',
        }}>
          {t('path_sheet_title', lang)}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.4, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {pastorSignedIn ? t('path_pastor_note', lang) : t('path_sheet_sub', lang)}
        </p>

        <div role="listbox" aria-label={t('path_sheet_title', lang)} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PATHS.map(p => {
            const active = p.id === selected;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => commit(p.id)}
                className={`dw-cp-card${active ? ' is-selected' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 14, cursor: 'pointer',
                  background: active ? 'var(--dw-new-soft)' : 'transparent',
                  border: `1.5px solid ${active ? 'var(--dw-new)' : 'var(--dw-border)'}`,
                  minHeight: 56,
                }}
              >
                <PathNode persona={p.id} size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, lineHeight: 1.2, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>
                    {t(p.headKey, lang)}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.3, marginTop: 2, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    {t(p.promiseKey, lang)}
                  </span>
                </span>
                {active && (
                  <Check size={16} strokeWidth={2.4} aria-hidden className="dw-cp-marker" style={{ '--cp-tone': 'var(--dw-new)', flexShrink: 0 } as CSSProperties} />
                )}
              </button>
            );
          })}
        </div>

        {pastorSignedIn && (
          <button
            type="button"
            onClick={signOut}
            style={{
              display: 'block', width: '100%', minHeight: 44, marginTop: 12,
              background: 'transparent', color: 'var(--dw-text-secondary)',
              border: '1px solid var(--dw-border)', borderRadius: 12, cursor: 'pointer',
              padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            }}
          >
            {t('pastor_chip_sign_out', lang)}
          </button>
        )}
        <p className="dw-cp-sheet-foot" style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {t('path_sheet_footer', lang)}
        </p>
      </div>
    </div>
  );
}
