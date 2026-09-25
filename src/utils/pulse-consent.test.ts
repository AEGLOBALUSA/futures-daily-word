/**
 * Pulse loads on every visit; GA4 stays behind cookie consent.
 * Ashley Evans / Faith Products, 2026-09-25.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const index = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const consent = readFileSync(resolve(__dirname, '../components/CookieConsent.tsx'), 'utf8');
const vite = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');

function loadAnalyticsBody(html: string) {
  const start = html.indexOf('window.__dwLoadAnalytics = function () {');
  const endMarker = 'document.head.appendChild(ga);';
  const end = html.indexOf(endMarker, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end + endMarker.length);
}

describe('Pulse vs GA consent split', () => {
  it('loads px.js with defer on every page, outside the consent callback', () => {
    expect(index).toContain('<script defer src="https://futures.church/px.js"></script>');
    const body = loadAnalyticsBody(index);
    expect(body).not.toContain('px.js');
    expect(body).not.toContain('futures.church');
    // A baked SRI hash would block Pulse the next time futures.church updates px.js.
    expect(vite).toContain("skipResources: ['https://futures.church/px.js']");
  });

  it('keeps GA4 inside __dwLoadAnalytics and still auto-loads only after accept', () => {
    const body = loadAnalyticsBody(index);
    expect(body).toContain('www.googletagmanager.com/gtag/js?id=');
    expect(body).toContain('anonymize_ip: true');
    expect(index).toContain("localStorage.getItem('dw_cookie_consent') === 'accepted'");
    expect(index).toContain('window.__dwLoadAnalytics()');
    expect(index).not.toMatch(/<script[^>]+googletagmanager\.com/);
  });

  it('leaves the consent banner in place as the GA gate', () => {
    expect(consent).toContain('__dwLoadAnalytics');
    expect(consent).toContain('ga-disable-G-E0CGKS9P9Q');
    expect(consent).toContain('Decline');
    expect(consent).toContain('Accept');
  });
});
