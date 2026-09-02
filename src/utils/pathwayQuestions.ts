import type { PathwayDay } from '../data/pathway-types';

/** The day's questions in the reader's language, English when a translation is missing. */
export function localizedQuestions(day: Pick<PathwayDay, 'questions' | 'questionsEs' | 'questionsPt' | 'questionsId'>, lang: string): string[] {
  const local = lang === 'es' ? day.questionsEs
    : lang === 'pt' ? day.questionsPt
    : lang === 'id' ? day.questionsId
    : undefined;
  return (local && local.length > 0 ? local : day.questions) || [];
}
