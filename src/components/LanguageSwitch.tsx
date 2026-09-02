/**
 * Front-page language switcher — the futures.church "Atelier Swatch" brought
 * into the app (Ashley, 2 Sep 2026). A warm tone-filled swatch carrying the
 * active language's monogram opens a 2×2 grid of family chips, each in its
 * language's family tone. Sits in the Home header (next to the theme toggle)
 * and on the cold-visitor Day 1 landing header, so it is obvious on arrival.
 * No motion gimmicks, no emoji flags (they render as bare letters on Windows).
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { LANGS, applyLanguage, type LangCode, type LangOption } from '../utils/language';

function toneRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function Marker({ short, size, color }: { short: string; size: number; color: string }) {
  return (
    <span aria-hidden style={{ fontSize: size, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1, color, fontFamily: 'var(--font-sans)' }}>
      {short}
    </span>
  );
}

/** The trigger's swatch: a tone-filled circle with the monogram in cream. */
function Swatch({ opt }: { opt: LangOption }) {
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: opt.tone, border: '1px solid rgba(28,20,12,0.08)',
    }}>
      <Marker short={opt.short} size={11} color="#FDFBF6" />
    </span>
  );
}

/** The cream node that carries the monogram inside a chip. */
function NodeMarker({ opt }: { opt: LangOption }) {
  return (
    <span style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: '#FBF8F1', border: '1px solid rgba(28,20,12,0.10)',
      boxShadow: '0 2px 7px rgba(28,20,12,0.12)',
    }}>
      <Marker short={opt.short} size={10} color={opt.tone} />
    </span>
  );
}

export function LanguageSwitch({ className, align = 'right' }: { className?: string; align?: 'left' | 'right' }) {
  const [lang, setLang] = useState<string>(getLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  const menuLabel = t('change_language', lang);

  // Positioning lives in CSS (.dw-lang-switch) so a host surface can override it —
  // an inline position would beat .dw-day1-lang's absolute placement.
  return (
    <div ref={ref} className={className ? `dw-lang-switch ${className}` : 'dw-lang-switch'}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`${current.label} — ${menuLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="dw-lang-trigger"
        style={{
          height: 36, padding: '0 8px 0 3px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          border: '1px solid var(--dw-border)', background: 'var(--dw-card)',
          cursor: 'pointer', color: 'var(--dw-text-muted)',
        }}
      >
        <Swatch opt={current} />
        <ChevronDown size={15} strokeWidth={2} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          className="dw-lang-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', [align]: 0, zIndex: 150,
            width: 288, maxWidth: 'calc(100vw - 24px)',
            background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
            borderRadius: 18, boxShadow: '0 20px 44px -22px rgba(28,20,12,0.34)', padding: 12,
          }}
        >
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase',
            color: 'var(--dw-text-muted)', padding: '2px 4px 10px', fontFamily: 'var(--font-sans)',
          }}>
            {menuLabel}
          </div>
          <div role="listbox" aria-label={menuLabel} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {LANGS.map(opt => {
              const active = opt.code === current.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { applyLanguage(opt.code as LangCode); setOpen(false); }}
                  style={{
                    position: 'relative', minHeight: 76, padding: 11, borderRadius: 14, textAlign: 'left',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer',
                    background: active ? toneRgba(opt.tone, 0.16) : toneRgba(opt.tone, 0.07),
                    border: `1.5px solid ${active ? opt.tone : toneRgba(opt.tone, 0.22)}`,
                    boxShadow: active ? `0 8px 20px -10px ${toneRgba(opt.tone, 0.45)}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <NodeMarker opt={opt} />
                    {active && <Check size={16} strokeWidth={2.4} style={{ color: opt.tone }} />}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, lineHeight: 1.15, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
