// Shared dedupe rule between the plan sections and the hero reading panel.
// A passage counts as "already in the hero" when its chapter-level reference
// matches a chapter-level reference already rendered in the hero.

export const chapterOf = (ref: string): string => ref.replace(/:\d+(-\d+)?$/, '').trim();

export function notInHero<T>(items: T[], getRef: (item: T) => string, heroRefs: string[]): T[] {
  const heroChapters = heroRefs.map(chapterOf);
  return items.filter(item => !heroChapters.includes(chapterOf(getRef(item))));
}
