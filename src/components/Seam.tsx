/**
 * Futures Church family "seam" — thin connective chrome that marks the Daily
 * Word app as its own product that is *part of Futures Church*, and always
 * offers a way back. Mirrors the church College footer lockup pattern
 * (components/layout/CollegeFooter.tsx in futures-church-web).
 *
 * The new church site is currently live at futures-church.netlify.app (its own
 * canonical URL). futures.church still redirects to the legacy site during the
 * cutover hold, and futures.global is a parked lander — so the return link
 * defaults to the working netlify.app URL.
 *
 * CUTOVER: when futures.church goes live, no code change is needed — set
 *   VITE_CHURCH_DAILY_WORD_URL=https://futures.church/daily-word
 * in the Daily Word Netlify env and redeploy. See CUTOVER-RUNBOOK.md.
 */

const CHURCH_DAILY_WORD_URL =
  import.meta.env.VITE_CHURCH_DAILY_WORD_URL ||
  'https://futures-church.netlify.app/daily-word';

/** Persistent top strip shown above every screen. */
export function SeamBar() {
  return (
    <div className="dw-seam-bar" role="banner">
      <span className="dw-seam-brand">
        <img
          className="dw-seam-mark"
          src="/images/futures-wordmark.png"
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
        aria-label="Open Futures Church"
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
