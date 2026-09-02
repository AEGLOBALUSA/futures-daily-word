/**
 * Home header campus chip ("📍 Gwinnett"). Tap it to pick the campus right
 * there; applies on the tap, no trip through Settings.
 *
 * The persona chip that used to sit beside it became the PathSwatch in the
 * header row ("Choose your path", 2 Sep 2026) — one chooser sheet, visible for
 * every persona, and locked to the pastor sign-in there.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { CAMPUSES } from '../data/tokens';
import { useSubView } from '../utils/useSubView';
import { useModalA11y } from '../utils/useModalA11y';
import { hapticTap } from '../utils/haptics';

const REGIONS = ['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'] as const;

export function HomeContextChips({
  campusId,
  onCampusChange,
}: {
  campusId: string;
  onCampusChange: (campusId: string) => void;
}) {
  const lang = getLang();
  const [open, setOpen] = useState(false);
  const campusBtnRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useSubView(open, () => setOpen(false));
  const panelRef = useModalA11y(open, () => setOpen(false));

  const campus = CAMPUSES.find(c => c.id === campusId);
  const campusLabel = campus
    ? campus.name.replace(/^Futures /, '').replace(/^Futuros /, '')
    : t('campus_chip', lang);

  const placePanel = (btn: HTMLButtonElement | null) => {
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    let left = r.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;
    if (left < 12) left = 12;
    setPanelStyle({
      position: 'fixed',
      top: r.bottom + 8,
      left,
      width,
      zIndex: 220,
    });
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    hapticTap();
    placePanel(campusBtnRef.current);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        ref={campusBtnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={campus ? `📍 ${campusLabel}` : t('select_your_campus', lang)}
        onClick={toggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: 'none', border: 'none', padding: '4px 2px', margin: 0,
          cursor: 'pointer', fontFamily: 'var(--font-sans)', lineHeight: 1.2,
          fontSize: 11, fontWeight: 500, color: 'var(--dw-text-muted)',
        }}
      >
        📍 {campusLabel}
        <ChevronDown size={11} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 219, background: 'transparent' }}
          />
          <div
            ref={panelRef}
            role="listbox"
            aria-label={t('your_campus', lang)}
            style={{
              ...panelStyle,
              background: 'var(--dw-canvas)',
              border: '1px solid var(--dw-border)',
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
              maxHeight: 'min(70vh, 420px)',
              overflowY: 'auto',
              padding: 8,
            }}
          >
            {REGIONS.map(region => {
              const regionCampuses = CAMPUSES.filter(c => c.region === region);
              if (!regionCampuses.length) return null;
              return (
                <div key={region} style={{ marginBottom: 8 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                    margin: '6px 8px 4px',
                  }}>
                    {region}
                  </p>
                  {regionCampuses.map(c => {
                    const active = c.id === campusId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          if (c.id !== campusId) onCampusChange(c.id);
                          setOpen(false);
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: active ? 'var(--dw-accent)' : 'transparent',
                          color: active ? '#fff' : 'var(--dw-text-primary)',
                          border: 'none', borderRadius: 10, cursor: 'pointer',
                          padding: '10px 12px',
                          fontFamily: 'var(--font-sans)', minHeight: 44,
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                        <span style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 2 }}>{c.city}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
