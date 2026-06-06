/**
 * Base URL for API calls. When the app is proxied through the church site,
 * relative /api/* paths conflict with the church site's own API routes.
 * Using an absolute URL ensures calls always reach the Daily Word backend.
 *
 * In development (localhost), we use relative paths so Vite's proxy works.
 */
export const API_BASE = import.meta.env.DEV ? '' : 'https://futuresdailyword.com';
