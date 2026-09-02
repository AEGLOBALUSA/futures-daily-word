/**
 * More from Futures — one restrained block, max three cards, 3:2 imagery.
 * Mount only on More and the end of Home when there is room — not Day N,
 * sermon notes, or /staff.
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
    <section className="dw-more-from" aria-labelledby="dw-more-from-title">
      <h2 id="dw-more-from-title" className="dw-more-from-title">
        {t('more_from_futures', lang)}
      </h2>
      <div className="dw-more-from-grid">
        <a
          href="https://futures.church/books"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_books')}
          aria-label={`${t('promo_books_title', lang)} — ${t('promo_shop', lang)}`}
          className="dw-more-from-card is-featured"
        >
          <div className="dw-more-from-image" aria-hidden>
            <img src={COVERS[0]} alt="" />
          </div>
          <div className="dw-more-from-copy">
            <p className="dw-more-from-name">{t('promo_books_title', lang)}</p>
            <span className="dw-more-from-cta">{t('promo_shop', lang)}</span>
          </div>
        </a>

        <a
          href={college.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_college', campus)}
          aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
          className="dw-more-from-card"
        >
          <div className="dw-more-from-image">
            <img
              src="/promos/logo-flc-horizontal-cream.svg"
              alt="Futures Leadership College"
              style={{ objectFit: 'contain', objectPosition: 'center', padding: 24, background: '#17130F' }}
            />
          </div>
          <div className="dw-more-from-copy">
            <p className="dw-more-from-name">{t(college.locKey, lang)}</p>
            <span className="dw-more-from-cta">{t('promo_explore', lang)}</span>
          </div>
        </a>

        <a
          href={SELAH_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_selah')}
          aria-label={`${t('promo_selah_name', lang)} — ${t('promo_selah_date', lang)}`}
          className="dw-more-from-card"
        >
          <div className="dw-more-from-image" aria-hidden>
            <img src={COVERS[1]} alt="" style={{ objectPosition: 'center 30%' }} />
          </div>
          <div className="dw-more-from-copy">
            <p className="dw-more-from-name">{t('promo_selah_name', lang)}</p>
            <span className="dw-more-from-cta">{t('promo_coming', lang)}</span>
          </div>
        </a>
      </div>
    </section>
  );
}
