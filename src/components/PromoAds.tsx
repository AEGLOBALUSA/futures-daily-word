/**
 * PromoAds — one “More from Futures” mosaic. Books is the featured photography
 * tile; College and Selah are the 1:1 pair. Not three matching strips.
 *
 * Placement is the host’s job: congregation Home (when a reading exists) and
 * More. Stay out of /staff, the ivory sermon canvas, and the I’m-New Day N
 * reading column. One college card by IP (AU vs US vs chooser), never both.
 */
import { useEffect, useState } from 'react';
import { track } from '../utils/analytics';
import { t, getLang } from '../utils/i18n';
import {
  campusFromTimezone,
  campusFromCountry,
  detectCountry,
  COLLEGE,
  type CollegeCampus,
} from '../utils/geo';

const COVERS = [
  '/promos/book-no-more-fear.jpg',
  '/promos/book-scarcity-to-supply.jpg',
  '/promos/book-multiply-or-die.jpg',
];

const SELAH_HREF = 'https://futures.church/';
const FIELD = '#17130F';

export function PromoAds() {
  const [lang, setLang] = useState(getLang);
  const [campus, setCampus] = useState<CollegeCampus>(() => campusFromTimezone());

  useEffect(() => {
    const onLang = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', onLang);
    return () => window.removeEventListener('dw-lang-changed', onLang);
  }, []);

  useEffect(() => {
    let cancelled = false;
    detectCountry().then((country) => {
      if (!cancelled) setCampus(campusFromCountry(country));
    });
    return () => { cancelled = true; };
  }, []);

  const college = COLLEGE[campus];

  return (
    <section className="dw-promo-block" aria-label={t('promo_more_from', lang)}>
      <h2 className="dw-promo-heading">{t('promo_more_from', lang)}</h2>
      <div className="dw-promo-strip">
        {/* ── Books — featured photography tile. Only card with real photos. ── */}
        <a
          href="https://futures.church/books"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_books')}
          aria-label={`${t('promo_books_title', lang)} — ${t('promo_shop', lang)}`}
          className="dw-promo-card dw-promo-books"
          style={{ background: FIELD }}
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

        {/* ── College — one geo card. Title is the loc string. ── */}
        <a
          href={college.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_college')}
          aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
          className="dw-promo-card dw-promo-college"
          style={{ background: FIELD }}
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
          style={{ background: FIELD }}
        >
          <div className="dw-promo-selah-type">
            <div className="dw-promo-title-row">
              <p className="dw-promo-title">{t('promo_selah_name', lang)}</p>
              <span className="dw-promo-meta">{t('promo_coming', lang)}</span>
            </div>
            <p className="dw-promo-date">{t('promo_selah_date', lang)}</p>
          </div>
        </a>
      </div>
    </section>
  );
}
