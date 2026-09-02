/**
 * PromoAds — rotating house ads. Each screen passes a `variant` for a distinct
 * visual so users don't habituate. Auto-advances every 5 s; pauses on hover.
 *
 * variant guide (set on the host screen):
 *   card      — image band + copy, carousel dots  (Messages, More)
 *   banner    — tall full-bleed image, text overlay (SermonNotes, Plans)
 *   editorial — text-first serif + small thumb on right (Me)
 *   compact   — slim horizontal strip (Journal)
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

export type PromoVariant = 'card' | 'banner' | 'editorial' | 'compact';

const COVERS = [
  '/promos/book-no-more-fear.jpg',
  '/promos/book-scarcity-to-supply.jpg',
  '/promos/book-multiply-or-die.jpg',
];

interface AdItem {
  id: string;
  href: string;
  trackKey: string;
  ariaLabel: string;
  cover?: string;
  covers?: string[];
  logo?: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  bg: string;
}

function buildAds(campus: CollegeCampus, lang: string): AdItem[] {
  const college = COLLEGE[campus];
  return [
    {
      id: 'multiply',
      href: 'https://futures.church/books/multiply-or-die',
      trackKey: 'house_ad_multiply',
      ariaLabel: 'Multiply or Die by Ashley Evans — get your free copy',
      cover: '/promos/book-multiply-or-die.jpg',
      eyebrow: 'New release',
      title: 'Multiply or Die',
      body: 'Your life was never made to just survive.',
      cta: 'Get free copy',
      bg: '#1A0E04',
    },
    {
      id: 'books',
      href: 'https://futures.church/books',
      trackKey: 'house_ad_books',
      ariaLabel: `${t('promo_books_title', lang)} — ${t('promo_shop', lang)}`,
      covers: COVERS,
      eyebrow: 'Free books',
      title: t('promo_books_title', lang),
      body: 'Free copies. Free audiobooks.',
      cta: t('promo_shop', lang),
      bg: '#17130F',
    },
    {
      id: 'selah',
      href: 'https://futures.church/selah',
      trackKey: 'house_ad_selah',
      ariaLabel: 'Selah — a daily pastoral companion. Save your seat.',
      eyebrow: 'Now open',
      title: 'Selah',
      body: 'For the questions you can’t google.',
      cta: 'Save your seat',
      bg: '#0A1520',
    },
    {
      id: 'college',
      href: college.href,
      trackKey: 'house_ad_college',
      ariaLabel: `Futures Leadership College — ${t(college.locKey, lang)}`,
      logo: '/promos/logo-flc-horizontal-cream.svg',
      eyebrow: 'One year. Full time.',
      title: 'Leadership College',
      body: t(college.locKey, lang),
      cta: t('promo_explore', lang),
      bg: '#0D1A2A',
    },
  ];
}

function CardBand({ ad }: { ad: AdItem }) {
  if (ad.covers) {
    return (
      <div className="dw-promo-band">
        <div className="dw-promo-covers">
          {ad.covers.map((src) => <img key={src} src={src} alt="" />)}
        </div>
      </div>
    );
  }
  if (ad.cover) {
    return (
      <div className="dw-promo-band">
        <img className="dw-promo-single-cover" src={ad.cover} alt="" />
      </div>
    );
  }
  if (ad.logo) {
    return (
      <div className="dw-promo-band">
        <img className="dw-promo-logo" src={ad.logo} alt="Futures Leadership College" />
      </div>
    );
  }
  return (
    <div className="dw-promo-band dw-promo-band--text">
      <p className="dw-promo-band-label">{ad.eyebrow}</p>
      <p className="dw-promo-band-heading">{ad.title}</p>
    </div>
  );
}

export function PromoAds({ variant = 'card' }: { variant?: PromoVariant }) {
  const lang = getLang();
  const [campus, setCampus] = useState<CollegeCampus>(() => campusFromTimezone());
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detectCountry().then((country) => {
      if (!cancelled) setCampus(campusFromCountry(country));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % 4), 5000);
    return () => clearInterval(id);
  }, [paused]);

  const ads = buildAds(campus, lang);
  const ad = ads[idx];

  const linkProps = {
    href: ad.href,
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    onClick: () => track(ad.trackKey),
    'aria-label': ad.ariaLabel,
    style: { background: ad.bg },
  };

  return (
    <div
      className={`dw-promo-wrap dw-promo-wrap--${variant}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {variant === 'compact' && (
        <a key={`${ad.id}-${idx}`} {...linkProps} className="dw-promo-card dw-promo-card--compact dw-promo-anim-in">
          <div className="dw-promo-compact">
            {ad.cover && <img className="dw-promo-compact-thumb" src={ad.cover} alt="" />}
            {!ad.cover && ad.logo && <img className="dw-promo-compact-logo" src={ad.logo} alt="" />}
            {!ad.cover && !ad.logo && <div className="dw-promo-compact-gem" />}
            <div className="dw-promo-compact-text">
              <p className="dw-promo-compact-title">{ad.title}</p>
              <p className="dw-promo-compact-sub">{ad.body}</p>
            </div>
            <span className="dw-promo-cta">{ad.cta} &rarr;</span>
          </div>
        </a>
      )}

      {variant === 'banner' && (
        <a key={`${ad.id}-${idx}`} {...linkProps} className="dw-promo-card dw-promo-card--banner dw-promo-anim-in">
          {(ad.cover || ad.covers) && (
            <div className="dw-promo-banner-bg" aria-hidden>
              <img src={ad.cover ?? ad.covers![2]} alt="" />
            </div>
          )}
          {!ad.cover && !ad.covers && ad.logo && (
            <div className="dw-promo-banner-logo-bg" aria-hidden>
              <img src={ad.logo} alt="" />
            </div>
          )}
          <div className="dw-promo-banner-overlay">
            <p className="dw-promo-eyebrow">{ad.eyebrow}</p>
            <p className="dw-promo-banner-title">{ad.title}</p>
            <p className="dw-promo-banner-body">{ad.body}</p>
            <span className="dw-promo-cta">{ad.cta} &rarr;</span>
          </div>
        </a>
      )}

      {variant === 'editorial' && (
        <a key={`${ad.id}-${idx}`} {...linkProps} className="dw-promo-card dw-promo-card--editorial dw-promo-anim-in">
          <div className="dw-promo-editorial">
            <div className="dw-promo-editorial-text">
              <p className="dw-promo-eyebrow">{ad.eyebrow}</p>
              <p className="dw-promo-editorial-title">{ad.title}</p>
              <p className="dw-promo-editorial-body">{ad.body}</p>
              <span className="dw-promo-cta">{ad.cta} &rarr;</span>
            </div>
            {ad.cover && <img className="dw-promo-editorial-thumb" src={ad.cover} alt="" />}
            {!ad.cover && ad.covers && <img className="dw-promo-editorial-thumb" src={ad.covers[2]} alt="" />}
            {!ad.cover && !ad.covers && ad.logo && <img className="dw-promo-editorial-logo" src={ad.logo} alt="" />}
          </div>
        </a>
      )}

      {(variant === 'card' || (!['compact', 'banner', 'editorial'].includes(variant))) && (
        <a key={`${ad.id}-${idx}`} {...linkProps} className="dw-promo-card dw-promo-card--card dw-promo-anim-in">
          <CardBand ad={ad} />
          <div className="dw-promo-copy">
            <p className="dw-promo-eyebrow">{ad.eyebrow}</p>
            <div className="dw-promo-title-row">
              <p className="dw-promo-title">{ad.title}</p>
              <span className="dw-promo-cta">{ad.cta}</span>
            </div>
          </div>
        </a>
      )}

      <div className="dw-promo-dots" aria-hidden="true">
        {ads.map((a, i) => (
          <button
            key={a.id}
            tabIndex={-1}
            className={`dw-promo-dot${i === idx ? ' is-active' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}
