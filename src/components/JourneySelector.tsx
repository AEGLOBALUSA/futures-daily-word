/**
 * JourneySelector — header control. NOT a CTA.
 * Label "Journey" + status. Green is a 6px marker when New to Faith is active.
 * Opens the chooser; does not start the journey.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { isNewChristianPersona } from '../utils/persona-config';
import type { Persona } from '../utils/persona-config';
import { useSubView } from '../utils/useSubView';
import { useModalA11y } from '../utils/useModalA11y';
import { hapticTap } from '../utils/haptics';
import { JourneyChoiceList, PERSONA_LABEL_KEY } from './JourneyChoiceCard';

interface JourneySelectorProps {
  persona: string;
  onPersonaChange: (persona: Persona) => void;
}

export function JourneySelector({ persona, onPersonaChange }: JourneySelectorProps) {
  const lang = getLang();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const isNew = isNewChristianPersona(persona);
  const status = t(PERSONA_LABEL_KEY[(persona as Persona)] || 'persona_member', lang);

  useSubView(open, () => setOpen(false));
  const panelRef = useModalA11y(open, () => setOpen(false));

  const placePanel = () => {
    const btn = btnRef.current;
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
    placePanel();
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
    <div className="dw-journey-selector-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`dw-journey-selector${isNew ? ' is-new' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('journey_label', lang)}: ${status}`}
        onClick={toggle}
      >
        <span className="dw-journey-selector-kicker">{t('journey_label', lang)}</span>
        <span className="dw-journey-selector-status">
          {isNew && <span className="dw-journey-selector-dot" aria-hidden />}
          {status}
          <ChevronDown size={14} aria-hidden className={open ? 'is-open' : undefined} />
        </span>
      </button>

      {open && (
        <>
          <div
            className="dw-journey-selector-scrim"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('your_journey', lang)}
            className="dw-journey-selector-panel"
            style={panelStyle}
          >
            <JourneyChoiceList
              value={persona}
              labelledBy={undefined}
              onChange={(id) => {
                if (id !== persona) onPersonaChange(id);
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
