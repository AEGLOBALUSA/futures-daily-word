import type { PathwayDay } from '../data/pathway-types';

/** The day's plain-words lead sentence in the reader's language, English when a
 *  translation is missing, '' when the day has none at all (most days don't). */
export function localizedPlain(day: Pick<PathwayDay, 'plain' | 'plainEs' | 'plainPt' | 'plainId'>, lang: string): string {
  const local = lang === 'es' ? day.plainEs
    : lang === 'pt' ? day.plainPt
    : lang === 'id' ? day.plainId
    : undefined;
  return (local || day.plain || '').trim();
}
