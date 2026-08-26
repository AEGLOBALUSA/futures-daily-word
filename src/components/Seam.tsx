/**
 * Futures Church family "seam" — thin connective chrome that marks the Daily
 * Word app as its own product that is *part of Futures Church*, and always
 * offers a way back. Mirrors the church College footer lockup pattern
 * (components/layout/CollegeFooter.tsx in futures-church-web).
 *
 * CUTOVER DONE: futures.church now serves the church site directly, and
 * futures-church.netlify.app/daily-word 301s to it. The default therefore points
 * at the canonical domain — showing a raw netlify.app hostname in the app chrome
 * (and bouncing users through a redirect) is no longer correct.
 *
 * These links go to the CHURCH SITE, not a Daily Word surface: the old
 * futures.church/daily-word default just reloaded this app (self-loop) — and
 * futures.church/daily-word-app is a live iframe embed of it. "Back to Futures
 * Church" must land on futures.church itself.
 * Still overridable via VITE_CHURCH_DAILY_WORD_URL. See CUTOVER-RUNBOOK.md.
 */

import { API_BASE } from '../utils/api-base';
import { t, getLang } from '../utils/i18n';

const CHURCH_DAILY_WORD_URL =
  import.meta.env.VITE_CHURCH_DAILY_WORD_URL ||
  'https://futures.church';

/** Persistent top strip shown above every screen. */
export function SeamBar() {
  return (
    <div className="dw-seam-bar" role="banner">
      <span className="dw-seam-brand">
        <img
          className="dw-seam-mark"
          src={`${API_BASE}/images/futures-wordmark.png`}
          alt="Futures"
          width={52}
          height={12}
          decoding="async"
        />
        <span className="dw-seam-name">Daily Word</span>
      </span>
      <a
        className="dw-seam-link"
        href={CHURCH_DAILY_WORD_URL}
        target="_blank"
        rel="noopener"
        aria-label={t('open_futures_church', getLang())}
      >
        Futures Church
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

/** Footer lockup rendered at the bottom of the More screen. */
export function SeamFooter() {
  return (
    <footer className="dw-seam-foot">
      <p className="dw-seam-foot-brand">
        Futures <em className="dw-seam-foot-accent">Daily Word</em>
      </p>
      <p className="dw-seam-foot-sub">Part of Futures Church · futuresdailyword.com</p>
      <a
        className="dw-seam-foot-link"
        href={CHURCH_DAILY_WORD_URL}
        target="_blank"
        rel="noopener"
      >
        <span aria-hidden>←</span>
        Back to Futures Church
      </a>
      <p className="dw-seam-foot-copy">© Futures Global. All rights reserved.</p>
    </footer>
  );
}
