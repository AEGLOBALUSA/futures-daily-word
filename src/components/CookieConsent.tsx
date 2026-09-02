import { useState } from 'react';
import { t, getLang } from '../utils/i18n';

/**
 * Cookie consent banner. Shows once until the user accepts or declines.
 *
 * Analytics (GA4 + Pulse) are NOT loaded until this returns 'accepted' — see the
 * consent gate in index.html. Previously the tags loaded on every first visit and
 * this banner only set `ga-disable-*` after the fact, so a first-time visitor was
 * measured (and given _ga cookies) before they had answered.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem('dw_cookie_consent');
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const handleAccept = () => {
    try { localStorage.setItem('dw_cookie_consent', 'accepted'); } catch {}
    // Load the tags now, so consent takes effect without needing a reload.
    (window as unknown as { __dwLoadAnalytics?: () => void }).__dwLoadAnalytics?.();
    setVisible(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem('dw_cookie_consent', 'declined'); } catch {}
    // Nothing has loaded yet (the gate in index.html held it back); belt-and-braces
    // in case a tag was injected some other way.
    (window as unknown as Record<string, unknown>)[`ga-disable-G-E0CGKS9P9Q`] = true;
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t('cookie_consent_label', getLang())}
      style={{
        position: 'fixed',
        bottom: 72, // above tab bar
        left: 12,
        right: 12,
        zIndex: 9999,
        // --dw-card-bg is not a real token, so this fell back to a hardcoded dark
        // panel while the text below resolved to the LIGHT theme's ink (#241E17)
        // — 1.06:1, i.e. invisible. Use the surface token that actually exists so
        // the banner follows the theme and stays readable in both.
        background: 'var(--dw-surface)',
        border: '1px solid var(--dw-border)',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(20,12,6,0.18)',
        fontFamily: 'var(--font-sans)',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <p style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--dw-text-primary)',
        margin: '0 0 12px',
      }}>
        We use cookies for analytics to improve your experience.
        See our{' '}
        <a
          href="https://futuresdailyword.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--dw-accent)', textDecoration: 'underline' }}
        >
          Privacy Policy
        </a>.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleDecline}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: '1px solid var(--dw-border)',
            background: 'transparent',
            color: 'var(--dw-text-primary)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: 'var(--dw-accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
