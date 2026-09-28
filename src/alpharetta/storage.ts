const PREFIX = 'dw_alpharetta_';

// This prefix is deliberately NOT in cloudSync's MISC_KEYS / MISC_PREFIXES, so feature data never syncs into a person's cloud backup.
export function alphaGet<T = unknown>(key: string): T | null {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? null : JSON.parse(value) as T;
  } catch { return null; }
}

export function alphaSet(key: string, value: unknown): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function alphaRemove(key: string): void {
  try { localStorage.removeItem(PREFIX + key); } catch { /* storage unavailable */ }
}
