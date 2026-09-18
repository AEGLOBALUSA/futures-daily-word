/**
 * PromoAds — "More from Futures", built to the standard of the invitation on
 * futures.church (components/books/BookBrowsingInvitation.tsx in that repo):
 * one dark scene with the three covers fanned under a display headline and a
 * ginger button, then College as a photograph and Selah as a paper card.
 *
 * Ashley, 18 Sep 2026: "they should be as good as the ones on the
 * futures.church site." The ivory back page this replaces (2 Sep) had shrunk
 * the offer to three small covers and text links. The books copy is the church
 * site's own, word for word in all four languages, so the two never disagree.
 *
 * Each whole graphic is the link (Ashley, 26 Aug). Placement is the host's job:
 * congregation Home (when a reading exists) and More. Stay out of the Settings
 * footer (never under © Futures Global), /staff, the ivory sermon canvas, empty
 * I'm-New Day N, and the church homepage. One college offer by IP (AU vs US vs
 * chooser), never both.
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

/** Left, centre, right — the fan reads in this order. */
const COVERS = [
  { src: '/promos/book-no-more-fear.jpg', place: 'is-left' },
  { src: '/promos/book-scarcity-to-supply.jpg', place: 'is-centre' },
  { src: '/promos/book-multiply-or-die.jpg', place: 'is-right' },
];

const SELAH_HREF = 'https://futures.church/';

/** How many mounted promo blocks currently intersect the active tab. */
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

  // Hide the AI FAB while this block is on screen so it cannot cover the button.
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

  // One entrance per scene, the first time it is seen. Copy and controls never
  // move; only the artwork settles. CSS skips it under prefers-reduced-motion.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.visible = 'true';
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    el.querySelectorAll('[data-promo-scene]').forEach((scene) => seen.observe(scene));
    return () => seen.disconnect();
  }, []);

  const college = COLLEGE[campus];

  return (
    <section
      ref={rootRef}
      className="dw-promo-block"
      aria-label={t('promo_more_from', lang)}
    >
      <a
        href="https://futures.church/books"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('house_ad_books')}
        aria-label={`${t('promo_books_headline', lang)} — ${t('promo_books_cta', lang)}`}
        className="dw-promo-books"
        data-promo-scene="books"
      >
        <div className="dw-promo-books-copy">
          <p className="dw-promo-eyebrow">{t('promo_books_eyebrow', lang)}</p>
          <h2 className="dw-promo-books-title">{t('promo_books_headline', lang)}</h2>
          <p className="dw-promo-books-desc">{t('promo_books_desc', lang)}</p>
          <span className="dw-promo-cta">
            {t('promo_books_cta', lang)}
            <span aria-hidden className="dw-promo-cta-arrow">↗</span>
          </span>
        </div>
        <div className="dw-promo-art" aria-hidden>
          <div className="dw-promo-glow" />
          <div className="dw-promo-fan">
            {COVERS.map((cover) => (
              <img key={cover.src} src={cover.src} alt="" className={`dw-promo-cover ${cover.place}`} />
            ))}
          </div>
        </div>
      </a>

      <div className="dw-promo-aside">
        <a
          href={college.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_college')}
          aria-label={`Futures Leadership College — ${t(college.locKey, lang)}`}
          className="dw-promo-college"
          data-promo-scene="college"
        >
          <img className="dw-promo-photo" src="/promos/college-students.jpg" alt="" loading="lazy" />
          <div className="dw-promo-shade" aria-hidden />
          <div className="dw-promo-college-copy">
            <img
              className="dw-promo-logo"
              src="/promos/logo-flc-horizontal-cream.svg"
              alt="Futures Leadership College"
            />
            <h3 className="dw-promo-card-title">{t('promo_college_sub', lang)}</h3>
            <p className="dw-promo-college-loc">{t(college.locKey, lang)}</p>
            <span className="dw-promo-link">{t('promo_college_cta', lang)} →</span>
          </div>
        </a>

        <a
          href={SELAH_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('house_ad_selah')}
          aria-label={`${t('promo_selah_name', lang)} — ${t('promo_selah_date', lang)}`}
          className="dw-promo-selah"
        >
          <div className="dw-promo-rules" aria-hidden />
          <p className="dw-promo-selah-meta">{t('promo_coming', lang)}</p>
          <h3 className="dw-promo-selah-name">{t('promo_selah_name', lang)}</h3>
          <p className="dw-promo-selah-sub">{t('promo_selah_sub', lang)}</p>
          <p className="dw-promo-selah-date">{t('promo_selah_date', lang)}</p>
        </a>
      </div>
    </section>
  );
}
