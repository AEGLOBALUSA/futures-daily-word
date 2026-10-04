/**
 * College house-ad region: one campus (AU or US), never both.
 * IP country from /api/geo; timezone is the offline fallback.
 */
import { localApiBase } from './api-base';

export type CollegeCampus = 'AU' | 'US' | 'OTHER';

export const COLLEGE = {
  AU: {
    href: 'https://futures.church/college',
    locKey: 'promo_college_loc_au',
  },
  US: {
    href: 'https://futuresglobal.college/',
    locKey: 'promo_college_loc_us',
  },
  OTHER: {
    href: 'https://futures.church/college',
    locKey: 'promo_college_choose',
  },
} as const;

const GEO_CACHE = 'dw_geo_country';

export function campusFromTimezone(timeZone?: string): CollegeCampus {
  const tz = timeZone
    || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '')
    || '';
  if (tz.startsWith('Australia/')) return 'AU';
  if (tz.startsWith('America/')) return 'US';
  return 'OTHER';
}

/** IP country wins. Known non-AU/US country → chooser. Missing country → timezone. */
export function campusFromCountry(
  country: string | null | undefined,
  timeZone?: string,
): CollegeCampus {
  const c = String(country || '').trim().toUpperCase();
  if (c === 'AU') return 'AU';
  if (c === 'US') return 'US';
  if (/^[A-Z]{2}$/.test(c)) return 'OTHER';
  return campusFromTimezone(timeZone);
}

export async function detectCountry(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(GEO_CACHE);
    if (cached !== null) return cached || null;
  } catch { /* private mode */ }
  try {
    const res = await fetch(`${localApiBase()}/api/geo`);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : '';
    const country = /^[A-Z]{2}$/.test(raw) ? raw : '';
    try { sessionStorage.setItem(GEO_CACHE, country); } catch { /* ignore */ }
    return country || null;
  } catch {
    return null;
  }
}

export interface GeoPlace {
  country: string | null;
  city: string | null;
  subdivision: string | null;
}

let placePromise: Promise<GeoPlace> | null = null;

function cleanPlace(v: unknown): string | null {
  return typeof v === 'string' && v.trim() && v.length <= 80 ? v.trim() : null;
}

/**
 * Country, town and state for the campus guess (B09-07). Town and state live
 * in memory only, for this page load: never localStorage, never sessionStorage,
 * never synced, never sent anywhere. Never throws; offline gives all nulls.
 */
export function detectPlace(): Promise<GeoPlace> {
  if (!placePromise) {
    placePromise = (async () => {
      try {
        const res = await fetch(`${localApiBase()}/api/geo`);
        if (!res.ok) return { country: null, city: null, subdivision: null };
        const data = await res.json();
        const raw = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : '';
        return {
          country: /^[A-Z]{2}$/.test(raw) ? raw : null,
          city: cleanPlace(data?.city),
          subdivision: cleanPlace(data?.subdivision),
        };
      } catch {
        return { country: null, city: null, subdivision: null };
      }
    })();
  }
  return placePromise;
}

/** Test seam. */
export function __resetPlaceForTests(): void {
  placePromise = null;
}
