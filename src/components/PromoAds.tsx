/**
 * PromoAds — quiet house ads for Futures offers. Rendered on congregation
 * tabs (Home except new_to_faith, Plans, Journal, Messages, More, Sermon Notes).
 * Staff /staff does not use this. One college card by IP (AU vs US), never both.
 *
 * Mosaic: Books is the featured photography tile. College and Selah are the
 * 1:1 companions. Mobile stacks Books full-width then College | Selah.
 * Desktop is a 2fr/1fr magazine grid.
 */
import { useEffect, useState } from 'react';
import { track } from '../utils/analytics';
import { t, getLang } from '../utils/i18n';
import { campusFromTimezone, campusFromCountry, detectCountry, COLLEGE, type CollegeCampus } from '../utils/geo';

const COVERS = [
  '/promos/book-no-more-fear.jpg',
  '/promos/book-scarcity-to-supply.jpg',
  '/promos/book-multiply-or-die.jpg',
];

const SELAH_HREF = 'https://futures.church/';

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
    <div className="dw-promo-strip">
      {/* ── Books — featured photography tile ── */}
      <a
        href="https://futures.church/books"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_books')}
        aria-label={`${t('promo_books_title', lang)} — ${t('promo_shop', lang)}`}
        className="dw-promo-card dw-promo-books"
      >
        <div className="dw-promo-band" aria-hidden>
          <div className="dw-promo-covers">
            {COVERS.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        </div>
        <div className="dw-promo-copy">
          <div className="dw-promo-title-row">
            <p className="dw-promo-title">{t('promo_books_title', lang)}</p>
            <span className="dw-promo-cta">{t('promo_shop', lang)}</span>
          </div>
        </div>
      </a>

      {/* ── College — one card, geo AU vs US ── */}
      <a
        href={college.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_college', campus)}
        aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
        className="dw-promo-card dw-promo-college"
      >
        <div className="dw-promo-mark">
          <img
            className="dw-promo-logo"
            src="/promos/logo-flc-horizontal-cream.svg"
            alt="Futures Leadership College"
          />
        </div>
        <div className="dw-promo-copy">
          <div className="dw-promo-title-row">
            <p className="dw-promo-title">{t(college.locKey, lang)}</p>
            <span className="dw-promo-cta">{t('promo_explore', lang)}</span>
          </div>
        </div>
      </a>

      {/* ── Selah — coming 1 October. Type is the image; not a shop. ── */}
      <a
        href={SELAH_HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_selah')}
        aria-label={`${t('promo_selah_name', lang)} — ${t('promo_selah_date', lang)}`}
        className="dw-promo-card dw-promo-selah"
      >
        <span className="dw-promo-meta">{t('promo_coming', lang)}</span>
        <div className="dw-promo-selah-type">
          <p className="dw-promo-title">{t('promo_selah_name', lang)}</p>
          <p className="dw-promo-date">{t('promo_selah_date', lang)}</p>
        </div>
      </a>
    </div>
  );
}
