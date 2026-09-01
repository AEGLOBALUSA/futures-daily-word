/**
 * Superdesign Day 1 reading surface — after Read, before app chrome.
 * Preview: https://p.superdesign.dev/draft/7bcbaa30-1fc8-4a7a-bc2f-bb9733b5de58
 *
 * Same parchment / ember tokens as the closed hero. Used on refresh after
 * they have tapped Read but have not yet marked the day read.
 */
import { Day1Landing } from './Day1Landing';

interface Props {
  onDone: () => void;
}

export function Day1Reading({ onDone }: Props) {
  return <Day1Landing startOpen onDone={onDone} />;
}
