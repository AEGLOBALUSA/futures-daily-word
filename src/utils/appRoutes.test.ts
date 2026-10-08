import { describe, it, expect } from 'vitest';
import {
  resolveAppRoute,
  buildAppUrl,
  urlForTab,
  analyticsPath,
  isDeepLink,
  bootTab,
  canonicalPathForTab,
} from './appRoutes';

describe('app routes', () => {
  it('maps the public paths onto real tabs', () => {
    expect(resolveAppRoute('/plans').tab).toBe('plans');
    expect(resolveAppRoute('/listen')).toMatchObject({ kind: 'listen', tab: 'home', path: '/listen' });
    expect(resolveAppRoute('/tracks')).toMatchObject({ kind: 'tracks', tab: 'plans' });
    expect(resolveAppRoute('/auth').kind).toBe('auth');
    expect(resolveAppRoute('/sign-in').kind).toBe('auth');
    expect(resolveAppRoute('/notes').tab).toBe('journal');
    expect(resolveAppRoute('/campus').tab).toBe('messages');
    expect(resolveAppRoute('/settings').tab).toBe('more');
    expect(resolveAppRoute('/sermon').tab).toBe('sermon-notes');
  });

  it('pricing and pro are honest placeholders, not a checkout', () => {
    expect(resolveAppRoute('/pricing').kind).toBe('pricing');
    expect(resolveAppRoute('/pro').kind).toBe('pro');
    expect(isDeepLink(resolveAppRoute('/pricing'))).toBe(true);
    expect(isDeepLink(resolveAppRoute('/'))).toBe(false);
  });

  it('tab changes build a real pathname Pulse can see', () => {
    expect(canonicalPathForTab('plans')).toBe('/plans');
    expect(canonicalPathForTab('home')).toBe('/');
    expect(urlForTab('journal', { pathname: '/', search: '', hostname: 'futuresdailyword.com' })).toBe('/notes');
    expect(urlForTab('home', { pathname: '/plans', search: '?embed=1', hostname: 'futuresdailyword.com' })).toBe('/?embed=1');
    expect(urlForTab('plans', { pathname: '/', search: '?utm_source=pulse&email=a@b.com', hostname: 'localhost' })).toBe('/plans');
  });

  it('keeps a church proxy prefix so a tab change stays inside the embed', () => {
    expect(buildAppUrl('/daily-word-app/listen', '/plans', '', 'futures.church')).toBe('/daily-word-app/plans');
    expect(buildAppUrl('/daily-word-app', '/', '', 'futures.church')).toBe('/daily-word-app/');
    expect(resolveAppRoute('/daily-word/plans', 'futures.church').tab).toBe('plans');
    // On the app's own host, /plans is just /plans.
    expect(buildAppUrl('/plans', '/', '', 'futuresdailyword.com')).toBe('/');
  });

  it('does not treat a function URL as a page', () => {
    expect(analyticsPath('/.netlify/functions/campuses')).toBe('/');
    expect(analyticsPath('/api/user-profile')).toBe('/');
    expect(analyticsPath('/listen')).toBe('/listen');
  });

  it('a sermon link on home still opens notes; a real path wins', () => {
    expect(bootTab({ sermon: true, pathname: '/', hostname: 'futuresdailyword.com', signedIn: false })).toBe('sermon-notes');
    expect(bootTab({ sermon: true, pathname: '/plans', hostname: 'futuresdailyword.com', signedIn: false })).toBe('plans');
    expect(bootTab({ sermon: false, pathname: '/sign-in', hostname: 'futuresdailyword.com', signedIn: true })).toBe('more');
    expect(bootTab({ sermon: false, pathname: '/sign-in', hostname: 'futuresdailyword.com', signedIn: false })).toBe('home');
  });
});
