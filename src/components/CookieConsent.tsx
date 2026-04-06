import { useState } from 'react';

/**
 * GDPR-compliant cookie consent banner.
 * Shows once until user accepts or declines.
 * When declined, disables Google Analytics by setting window property.
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
    setVisible(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem('dw_cookie_consent', 'declined'); } catch {}
    // Disable Google Analytics
    (window as unknown as Record<string, unknown>)[`ga-disable-G-E0CGKS9P9Q`] = true;
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 72, // above tab bar
        left: 12,
        right: 12,
        zIndex: 9999,
        background: 'var(--dw-card-bg, #1a1a1a)',
        border: '1px solid var(--dw-border, rgba(255,255,255,0.1))',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontFamily: 'var(--font-sans)',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <p style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--dw-text-primary, #fff)',
        margin: '0 0 12px',
      }}>
        We use cookies for analytics to improve your experience.
        See our{' '}
        <a
          href="https://futuresdailyword.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--dw-accent, #E84858)', textDecoration: 'underline' }}
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
            border: '1px solid var(--dw-border, rgba(255,255,255,0.15))',
            background: 'transparent',
            color: 'var(--dw-text-muted, #999)',
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
            background: 'var(--dw-accent, #E84858)',
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
