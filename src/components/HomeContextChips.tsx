/**
 * Home header chips — persona ("I'm New to This") and campus ("📍 Gwinnett").
 * Tap a chip to pick the new value right there. Applies on the tap; no trip
 * through Settings.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { ALL_PERSONAS, isNewChristianPersona } from '../utils/persona-config';
import type { Persona } from '../utils/persona-config';
import { CAMPUSES } from '../data/tokens';
import { useSubView } from '../utils/useSubView';
import { useModalA11y } from '../utils/useModalA11y';
import { hapticTap } from '../utils/haptics';

const PERSONA_LABEL: Record<Persona, string> = {
  new_to_faith: 'persona_new',
  congregation: 'persona_member',
  deeper_study: 'persona_study',
  pastor_leader: 'persona_leader',
  comfort: 'persona_comfort',
};
const PERSONA_DESC: Record<Persona, string> = {
  new_to_faith: 'persona_new_desc',
  congregation: 'persona_member_desc',
  deeper_study: 'persona_study_desc',
  pastor_leader: 'persona_leader_desc',
  comfort: 'persona_comfort_desc',
};

const REGIONS = ['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'] as const;

type OpenChip = 'persona' | 'campus' | null;

export function HomeContextChips({
  persona,
  campusId,
  onPersonaChange,
  onCampusChange,
}: {
  persona: string;
  campusId: string;
  onPersonaChange: (persona: Persona) => void;
  onCampusChange: (campusId: string) => void;
}) {
  const lang = getLang();
  const [open, setOpen] = useState<OpenChip>(null);
  const personaBtnRef = useRef<HTMLButtonElement>(null);
  const campusBtnRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useSubView(open !== null, () => setOpen(null));
  const panelRef = useModalA11y(open !== null, () => setOpen(null));

  const campus = CAMPUSES.find(c => c.id === campusId);
  const personaKey = PERSONA_LABEL[(persona as Persona)] || 'persona_member';
  const personaLabel = t(personaKey, lang);
  const newPathChip = isNewChristianPersona(persona);
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

  const toggle = (which: OpenChip, btn: HTMLButtonElement | null) => {
    if (open === which) { setOpen(null); return; }
    hapticTap();
    placePanel(btn);
    setOpen(which);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(null);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const chipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    padding: '4px 2px',
    margin: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.2,
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        ref={personaBtnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open === 'persona'}
        aria-label={personaLabel}
        onClick={() => toggle('persona', personaBtnRef.current)}
        style={{ ...chipStyle, fontSize: 11, fontWeight: 600, color: newPathChip ? 'var(--dw-new)' : 'var(--dw-accent)' }}
      >
        {personaLabel}
        <ChevronDown size={11} style={{ opacity: 0.7, transform: open === 'persona' ? 'rotate(180deg)' : undefined }} />
      </button>
      <span style={{ color: 'var(--dw-border)', fontSize: 10 }} aria-hidden>·</span>
      <button
        ref={campusBtnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open === 'campus'}
        aria-label={campus ? `📍 ${campusLabel}` : t('select_your_campus', lang)}
        onClick={() => toggle('campus', campusBtnRef.current)}
        style={{ ...chipStyle, fontSize: 11, fontWeight: 500, color: 'var(--dw-text-muted)' }}
      >
        📍 {campusLabel}
        <ChevronDown size={11} style={{ opacity: 0.7, transform: open === 'campus' ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 219, background: 'transparent' }}
          />
          <div
            ref={panelRef}
            role="listbox"
            aria-label={open === 'persona' ? t('your_journey', lang) : t('your_campus', lang)}
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
            {open === 'persona' && ALL_PERSONAS.map(id => {
              const active = id === persona;
              const isNewOption = isNewChristianPersona(id);
              const optionFill = isNewOption ? 'var(--dw-new)' : 'var(--dw-accent)';
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    if (id !== persona) onPersonaChange(id);
                    setOpen(null);
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: active ? optionFill : 'transparent',
                    color: active ? '#fff' : 'var(--dw-text-primary)',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    padding: '10px 12px', marginBottom: 2,
                    fontFamily: 'var(--font-sans)', minHeight: 44,
                  }}
                >
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: !active && isNewOption ? 'var(--dw-new)' : undefined }}>{t(PERSONA_LABEL[id], lang)}</span>
                  <span style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 2 }}>{t(PERSONA_DESC[id], lang)}</span>
                </button>
              );
            })}
            {open === 'campus' && REGIONS.map(region => {
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
                          setOpen(null);
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
