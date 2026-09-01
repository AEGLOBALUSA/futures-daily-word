/**
 * PromoAds — quiet house ads for Futures offers. Rendered on every congregation
 * tab (Home, Plans, Journal, Messages, More, Sermon Notes). Staff /staff does
 * not use this. One college card by IP (AU vs US), never both.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { track } from '../utils/analytics';
import { t, getLang } from '../utils/i18n';
import { campusFromTimezone, campusFromCountry, detectCountry, COLLEGE, type CollegeCampus } from '../utils/geo';

const COVERS = [
  '/promos/book-no-more-fear.jpg',
  '/promos/book-scarcity-to-supply.jpg',
  '/promos/book-multiply-or-die.jpg',
];

const SELAH_HREF = 'https://futures.church/';

const card: CSSProperties = {
  display: 'block',
  borderRadius: 14,
  padding: '16px 18px',
  marginBottom: 12,
  textDecoration: 'none',
  overflow: 'hidden',
};

export function PromoAds() {
  const lang = getLang();
  const [campus, setCampus] = useState<CollegeCampus>(() => campusFromTimezone());

  useEffect(() => {
    let cancelled = false;
    detectCountry().then((country) => {
      if (cancelled) return;
      setCampus(campusFromCountry(country));
    });
    return () => { cancelled = true; };
  }, []);

  const college = COLLEGE[campus];

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
          ...card,
          display: 'flex', alignItems: 'center', gap: 16,
          background: '#17130F',
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

      {/* ── College — one card, geo AU vs US ── */}
      <a
        href={college.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_college', campus)}
        aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
        style={{
          ...card,
          background: 'linear-gradient(120deg, #232A24 0%, #35403A 100%)',
          padding: '18px 18px 16px',
        }}
      >
        <img
          src="/promos/logo-flc-horizontal-cream.svg"
          alt="Futures Leadership College"
          style={{ height: 26, width: 'auto', maxWidth: '100%', display: 'block', marginBottom: 6 }}
        />
        <p style={{ fontSize: 12, color: 'rgba(245,239,230,0.88)', fontFamily: 'var(--font-sans)', margin: '0 0 4px' }}>
          {t(college.locKey, lang)}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(245,239,230,0.75)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('promo_college_sub', lang)}{' '}
          <span style={{ color: '#DCC9A8', fontWeight: 600 }}>{t('promo_college_cta', lang)} →</span>
        </p>
      </a>

      {/* ── Selah — coming 1 October (learn more, not a fake download) ── */}
      <a
        href={SELAH_HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_selah')}
        aria-label={`${t('promo_selah_label', lang)} — ${t('promo_selah_title', lang)}`}
        style={{
          ...card,
          background: '#1A1612',
          marginBottom: 0,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8926E', fontFamily: 'var(--font-sans)', margin: '0 0 3px' }}>
          {t('promo_selah_label', lang)}
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#F5EFE6', fontFamily: 'var(--font-serif)', margin: '0 0 3px', lineHeight: 1.25 }}>
          {t('promo_selah_title', lang)}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(245,239,230,0.75)', fontFamily: 'var(--font-sans)', margin: '0 0 6px', lineHeight: 1.4 }}>
          {t('promo_selah_sub', lang)}
        </p>
        <p style={{ fontSize: 12, color: '#DCC9A8', fontWeight: 600, fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('promo_selah_cta', lang)} →
        </p>
      </a>
    </div>
  );
}
