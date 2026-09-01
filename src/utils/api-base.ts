/**
 * Base URL for API calls. When the app is proxied through the church site,
 * relative /api/* paths conflict with the church site's own API routes.
 * Using an absolute URL ensures calls always reach the Daily Word backend.
 *
 * In development (localhost), we use relative paths so Vite's proxy works.
 */
export const API_BASE = import.meta.env.DEV ? '' : 'https://futuresdailyword.com';

/**
 * Origin for APIs that live on this Daily Word deploy (staff intake, published
 * sermon). Relative on the app origin and Netlify previews so a preview talks
 * to its own functions; absolute when the SPA is proxied on futures.church.
 */
export function localApiBase(): string {
  if (typeof window === 'undefined') return API_BASE;
  const host = window.location.hostname;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'futuresdailyword.com' ||
    host === 'www.futuresdailyword.com' ||
    host.endsWith('.netlify.app')
  ) {
    return '';
  }
  return 'https://futuresdailyword.com';
}

export function staffPortalUrl(): string {
  return `${localApiBase()}/staff`;
}
