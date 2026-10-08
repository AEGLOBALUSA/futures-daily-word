/**
 * Screens for paths that are not a tab.
 * /pricing and /pro have no checkout — say so, and send people to today's Word.
 * /tracks has no separate library — the plans list is where listening lives.
 */
import { useEffect, useState } from 'react';
import { t, getLang } from '../utils/i18n';
import { resolveAppRoute, type RouteKind } from '../utils/appRoutes';

function useLang() {
  const [lang, setLang] = useState(getLang);
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);
  return lang;
}

export function useRouteKind(): RouteKind {
  const read = () => {
    try { return resolveAppRoute(window.location.pathname, window.location.hostname).kind; }
    catch { return 'home' as const; }
  };
  const [kind, setKind] = useState<RouteKind>(read);
  useEffect(() => {
    const sync = () => setKind(read());
    window.addEventListener('popstate', sync);
    window.addEventListener('dw-tab-changed', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('dw-tab-changed', sync);
    };
  }, []);
  return kind;
}

export function RoutePlaceholder({ kind, onHome }: { kind: 'pricing' | 'pro'; onHome: () => void }) {
  const lang = useLang();
  const title = t(kind === 'pro' ? 'route_pro_title' : 'route_pricing_title', lang);
  const body = t(kind === 'pro' ? 'route_pro_body' : 'route_pricing_body', lang);
  return (
    <div className="screen-container">
      <div style={{ padding: '8px 24px 0', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--dw-text-primary)',
          letterSpacing: '-0.02em',
          margin: '0 0 12px',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 16,
          lineHeight: 1.5,
          color: 'var(--dw-text-secondary)',
          margin: '0 0 20px',
        }}>
          {body}
        </p>
        <button
          type="button"
          onClick={onHome}
          style={{
            width: '100%',
            minHeight: 48,
            border: 'none',
            borderRadius: 12,
            background: 'var(--dw-accent)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('route_read_today', lang)}
        </button>
      </div>
    </div>
  );
}

export function TracksNote() {
  const lang = useLang();
  return (
    <section
      aria-label={t('route_tracks_title', lang)}
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: 16,
        background: 'var(--dw-card)',
        border: '1px solid var(--dw-border)',
      }}
    >
      <p style={{
        margin: '0 0 4px',
        fontFamily: 'var(--font-serif)',
        fontSize: 18,
        color: 'var(--dw-text-primary)',
      }}>
        {t('route_tracks_title', lang)}
      </p>
      <p style={{
        margin: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        lineHeight: 1.45,
        color: 'var(--dw-text-secondary)',
      }}>
        {t('route_tracks_body', lang)}
      </p>
    </section>
  );
}
