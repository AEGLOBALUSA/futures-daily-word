/**
 * Door 3 — asked once, after the first read (Ashley, 2 Sep 2026). Right after
 * the first "Mark as read" on Day 1 and BEFORE the push ask: a check, "Day 1,
 * done.", one question, a sage Yes, and a text link into the chooser sheet.
 * Never for comfort, never after a real choice, never stacked with the push ask
 * (App.tsx gates all three). `dw_path_asked` rides the misc bag so it never
 * returns on any device. No focus trap: the sheet opens above this screen.
 */
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { hapticTap } from '../utils/haptics';

export function PathAskedOnce({ onKeepGoing, onSomethingElse }: { onKeepGoing: () => void; onSomethingElse: () => void }) {
  const lang = getLang();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="dw-cp-ask-title"
      tabIndex={-1}
      className="dw-cp-ask"
    >
      <div className="dw-cp-ask-inner">
        <span className="dw-cp-ask-check" aria-hidden>
          <Check size={26} strokeWidth={2.6} />
        </span>
        <h1 id="dw-cp-ask-title" className="dw-cp-ask-title">{t('path_ask_title', lang)}</h1>
        <p className="dw-cp-ask-body">{t('path_ask_body', lang)}</p>
        <button
          type="button"
          className="dw-cp-cta"
          onClick={() => { hapticTap(); onKeepGoing(); }}
          style={{
            display: 'block', width: '100%', height: 54, marginTop: 24,
            border: 'none', borderRadius: 14, cursor: 'pointer',
            background: 'var(--dw-new)', color: 'var(--dw-new-on-fill)',
            fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600,
          }}
        >
          {t('path_ask_yes', lang)}
        </button>
        <button
          type="button"
          className="dw-cp-ask-link"
          aria-haspopup="dialog"
          onClick={() => { hapticTap(); onSomethingElse(); }}
        >
          {t('path_ask_other', lang)}
        </button>
        <p className="dw-cp-ask-eyebrow">{t('path_ask_eyebrow', lang)}</p>
      </div>
    </div>
  );
}
