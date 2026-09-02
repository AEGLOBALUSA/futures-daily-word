/**
 * PromoAds — ivory “More from Futures” journal back page.
 * Paper, photography, type, air. Not three app banners, not a charcoal mosaic.
 *
 * Placement is the host’s job: congregation Home (when a reading exists)
 * and More. Stay out of the Settings footer (never under © Futures Global),
 * /staff, the ivory sermon canvas, empty I’m-New Day N, and the church homepage.
 * One college offer by IP (AU vs US vs chooser), never both.
 */
import { useEffect, useRef, useState } from 'react';
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

/** How many mounted mosaics currently intersect the active tab. */
let promoInViewCount = 0;

function setPromoInView(next: boolean, prev: boolean): boolean {
  if (next === prev) return prev;
  promoInViewCount += next ? 1 : -1;
  if (promoInViewCount < 0) promoInViewCount = 0;
  document.body.classList.toggle('dw-promo-in-view', promoInViewCount > 0);
  return next;
}

function inActiveTab(el: HTMLElement | null): boolean {
  const panel = el?.closest('.dw-tab-panel');
  return !panel || panel.classList.contains('is-active');
}

export function PromoAds() {
  const rootRef = useRef<HTMLElement>(null);
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

  // Hide the AI FAB while this block is on screen so it cannot cover Shop.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let intersecting = false;
    let counted = false;

    const apply = () => {
      counted = setPromoInView(intersecting && inActiveTab(el), counted);
    };

    const io = new IntersectionObserver((entries) => {
      intersecting = entries.some((entry) => entry.isIntersecting);
      apply();
    }, { threshold: 0.12 });
    io.observe(el);

    const onTab = () => apply();
    window.addEventListener('dw-tab-changed', onTab);

    return () => {
      io.disconnect();
      window.removeEventListener('dw-tab-changed', onTab);
      counted = setPromoInView(false, counted);
    };
  }, []);

  const college = COLLEGE[campus];

  return (
    <section
      ref={rootRef}
      className="dw-promo-block"
      aria-label={t('promo_more_from', lang)}
    >
      <h2 className="dw-promo-heading">{t('promo_more_from', lang)}</h2>
      <div className="dw-promo-strip">
        <a
          href="https://futures.church/books"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_books')}
          aria-label={`${t('promo_books_title', lang)} — ${t('promo_shop_books', lang)}`}
          className="dw-promo-books"
        >
          <div className="dw-promo-covers" aria-hidden>
            {COVERS.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
          <p className="dw-promo-books-title">{t('promo_books_title', lang)}</p>
          <span className="dw-promo-link">{t('promo_shop_books', lang)}</span>
        </a>

        <div className="dw-promo-aside">
          <a
            href={college.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('house_ad_college')}
            aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
            className="dw-promo-college"
          >
            <img
              className="dw-promo-logo"
              src="/promos/logo-flc-horizontal-ink.svg"
              alt="Futures Leadership College"
            />
            <p className="dw-promo-college-loc">{t(college.locKey, lang)}</p>
            <span className="dw-promo-link">{t('promo_college_cta', lang)}</span>
          </a>

          <a
            href={SELAH_HREF}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('house_ad_selah')}
            aria-label={`${t('promo_selah_name', lang)} — ${t('promo_selah_date', lang)}`}
            className="dw-promo-selah"
          >
            <p className="dw-promo-selah-meta">{t('promo_coming', lang)}</p>
            <p className="dw-promo-selah-name">{t('promo_selah_name', lang)}</p>
            <p className="dw-promo-selah-date">{t('promo_selah_date', lang)}</p>
          </a>
        </div>
      </div>
    </section>
  );
}
