/**
 * Address-bar routes for a tab app.
 *
 * The shell is one page. These paths are the ones people actually open
 * (/listen, /plans, /tracks, /auth, /sign-in, /pricing, /pro) plus a stable
 * path for every tab, so a tab change can update the URL. Pulse (px.js)
 * beacons a pageview only when the pathname changes, which is why a tab
 * switch that called pushState without a URL left every hit on `/`.
 *
 * On the app's own hosts the paths are root-relative. On a church proxy
 * (futures.church/daily-word-app/…) the proxy prefix stays on the URL so a
 * tab change cannot jump the browser to the church homepage.
 */
import type { TabId } from '../components/TabBar';

export type RouteKind = 'home' | 'tab' | 'listen' | 'tracks' | 'auth' | 'pricing' | 'pro';

export interface AppRoute {
  kind: RouteKind;
  tab: TabId;
  /** Path within the app, always starting with `/`, without a proxy prefix. */
  path: string;
}

const TAB_CANONICAL: Record<TabId, string> = {
  home: '/',
  journal: '/notes',
  messages: '/campus',
  plans: '/plans',
  more: '/settings',
  'sermon-notes': '/sermon',
};

/** Longer prefixes first so `/daily-word-app` is not read as `/daily-word`. */
const PROXY_BASES = ['/daily-word-app', '/daily-word'];

const PATH_TABLE: Record<string, AppRoute> = {
  '/': { kind: 'home', tab: 'home', path: '/' },
  '/listen': { kind: 'listen', tab: 'home', path: '/listen' },
  '/plans': { kind: 'tab', tab: 'plans', path: '/plans' },
  '/tracks': { kind: 'tracks', tab: 'plans', path: '/tracks' },
  '/auth': { kind: 'auth', tab: 'home', path: '/auth' },
  '/sign-in': { kind: 'auth', tab: 'home', path: '/sign-in' },
  '/signin': { kind: 'auth', tab: 'home', path: '/sign-in' },
  '/login': { kind: 'auth', tab: 'home', path: '/sign-in' },
  '/pricing': { kind: 'pricing', tab: 'home', path: '/pricing' },
  '/pro': { kind: 'pro', tab: 'home', path: '/pro' },
  '/notes': { kind: 'tab', tab: 'journal', path: '/notes' },
  '/journal': { kind: 'tab', tab: 'journal', path: '/notes' },
  '/campus': { kind: 'tab', tab: 'messages', path: '/campus' },
  '/settings': { kind: 'tab', tab: 'more', path: '/settings' },
  '/more': { kind: 'tab', tab: 'more', path: '/settings' },
  '/sermon': { kind: 'tab', tab: 'sermon-notes', path: '/sermon' },
  '/sermon-notes': { kind: 'tab', tab: 'sermon-notes', path: '/sermon' },
};

function stripSlash(pathname: string): string {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

/** App origins own `/`. A church embed keeps its proxy prefix. */
export function isAppHost(host: string | undefined): boolean {
  const h = (host || '').toLowerCase();
  return h === ''
    || h === 'futuresdailyword.com'
    || h === 'www.futuresdailyword.com'
    || h === 'localhost'
    || h === '127.0.0.1'
    || h.endsWith('.netlify.app');
}

export function appPathname(pathname: string, host = 'futuresdailyword.com'): { base: string; path: string } {
  const clean = stripSlash(pathname);
  if (!isAppHost(host)) {
    for (const base of PROXY_BASES) {
      if (clean === base) return { base, path: '/' };
      if (clean.startsWith(`${base}/`)) return { base, path: clean.slice(base.length) || '/' };
    }
  }
  return { base: '', path: clean };
}

export function resolveAppRoute(pathname: string, host = 'futuresdailyword.com'): AppRoute {
  const { path } = appPathname(pathname, host);
  return PATH_TABLE[path] ?? { kind: 'home', tab: 'home', path };
}

export function canonicalPathForTab(tab: TabId): string {
  return TAB_CANONICAL[tab] || '/';
}

/** A named path (not the plain home shell). Deep links skip the Day 1 gate. */
export function isDeepLink(route: AppRoute): boolean {
  return route.kind !== 'home';
}

export function preservedEmbedSearch(search: string): string {
  try {
    const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return q.get('embed') === '1' ? '?embed=1' : '';
  } catch {
    return '';
  }
}

export function buildAppUrl(
  currentPathname: string,
  targetPath: string,
  search = '',
  host = 'futuresdailyword.com',
): string {
  const { base } = appPathname(currentPathname, host);
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const tail = path === '/' ? (base ? `${base}/` : '/') : `${base}${path}`;
  return `${tail}${search}`;
}

export function urlForTab(
  tab: TabId,
  loc: { pathname: string; search: string; hostname: string },
): string {
  return buildAppUrl(loc.pathname, canonicalPathForTab(tab), preservedEmbedSearch(loc.search), loc.hostname);
}

/** Path Pulse / our page_view should record. API shells are not pages. */
export function analyticsPath(pathname: string, host?: string): string {
  const { path } = appPathname(pathname, host);
  if (path.startsWith('/.netlify/') || path.startsWith('/api/')) return '/';
  return path || '/';
}

export function bootTab(opts: {
  sermon: boolean;
  pathname: string;
  hostname: string;
  signedIn: boolean;
}): TabId {
  const route = resolveAppRoute(opts.pathname, opts.hostname);
  if (opts.sermon && (route.kind === 'home' || route.kind === 'listen')) return 'sermon-notes';
  if (route.kind === 'auth' && opts.signedIn) return 'more';
  return route.tab;
}
