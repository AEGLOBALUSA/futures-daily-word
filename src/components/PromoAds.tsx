/**
 * PromoAds — house ads for the two Futures offers (Ashley, 26 Aug 2026):
 * the free books on futures.church and Futures Leadership College. Rendered on
 * every tab, styled like the paid ad creative: the whole graphic is the link.
 * Real brand assets only (covers + FLC lockup copied from the church repo) —
 * never redrawn. Self-contained colors so the cards read identically in both
 * themes.
 */
import { track } from '../utils/analytics';
import { t, getLang } from '../utils/i18n';

const COVERS = [
  '/promos/book-no-more-fear.jpg',
  '/promos/book-scarcity-to-supply.jpg',
  '/promos/book-multiply-or-die.jpg',
];

export function PromoAds() {
  const lang = getLang();
  return (
    <div style={{ margin: '8px 0 24px' }}>
      {/* ── Books ── */}
      <a
        href="https://futures.church/books"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_books')}
        aria-label={`${t('promo_books_title', lang)} — ${t('promo_books_sub', lang)}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: '#17130F',
          borderRadius: 14, padding: '16px 18px', marginBottom: 12,
          textDecoration: 'none', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {COVERS.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              width={52}
              height={72}
              style={{
                width: 52, height: 72, objectFit: 'cover', borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.45)',
                marginLeft: i === 0 ? 0 : -18,
                transform: `rotate(${(i - 1) * 4}deg)`,
                position: 'relative', zIndex: 3 - i,
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8926E', fontFamily: 'var(--font-sans)', margin: '0 0 3px' }}>
            {t('promo_books_label', lang)}
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#F5EFE6', fontFamily: 'var(--font-serif)', margin: '0 0 3px', lineHeight: 1.25 }}>
            {t('promo_books_title', lang)}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(245,239,230,0.75)', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {t('promo_books_sub', lang)} →
          </p>
        </div>
      </a>

      {/* ── College ── */}
      <a
        href="https://futuresglobal.college"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_college')}
        aria-label={`Futures Leadership College — ${t('promo_college_sub', lang)}`}
        style={{
          display: 'block',
          background: 'linear-gradient(120deg, #232A24 0%, #35403A 100%)',
          borderRadius: 14, padding: '18px 18px 16px',
          textDecoration: 'none', overflow: 'hidden',
        }}
      >
        <img
          src="/promos/logo-flc-horizontal-cream.svg"
          alt="Futures Leadership College"
          style={{ height: 26, width: 'auto', maxWidth: '100%', display: 'block', marginBottom: 8 }}
        />
        <p style={{ fontSize: 12, color: 'rgba(245,239,230,0.8)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('promo_college_sub', lang)} <span style={{ color: '#DCC9A8', fontWeight: 600 }}>{t('promo_college_cta', lang)} →</span>
        </p>
      </a>
    </div>
  );
}
