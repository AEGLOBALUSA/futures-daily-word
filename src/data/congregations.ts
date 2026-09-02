/**
 * The three congregations that each get their own Sermon Notes (Ashley,
 * 2 Sep 2026). Mirrors netlify/functions/lib/congregations.js — keep both
 * lists identical. Proper nouns: not translated.
 */
export type CongregationId = 'futures-us' | 'futures-au' | 'futuros-us';

export interface Congregation {
  id: CongregationId;
  name: string;
  /** One-line hint under the name in the chooser. */
  hint: string;
}

export const CONGREGATIONS: Congregation[] = [
  { id: 'futures-us', name: 'Futures USA', hint: 'Georgia · Tennessee' },
  { id: 'futures-au', name: 'Futures Australia', hint: 'South Australia' },
  { id: 'futuros-us', name: 'Futuros USA', hint: 'En español · Georgia' },
];

export const DEFAULT_CONGREGATION: CongregationId = 'futures-us';

export function isCongregationId(v: unknown): v is CongregationId {
  return v === 'futures-us' || v === 'futures-au' || v === 'futuros-us';
}

export function congregationName(id: string | null | undefined): string {
  return CONGREGATIONS.find(c => c.id === id)?.name || '';
}
