/**
 * NewToFaithButton — THE "New to Faith? Start here" control.
 *
 * Ashley's rule (1 Sep 2026): every New-to-Faith button on the site is the same
 * button — same wording, same colour, same shape, same hierarchy, everywhere.
 * It is a recognisable product element, not a per-screen decision.
 *
 * So: no `variant`, no `color`, no `size` props. If a screen needs it to look
 * different, the answer is that the screen is wrong, not the button.
 */
import { ArrowRight } from 'lucide-react';
import { getLang } from '../utils/i18n';
import { hapticTap } from '../utils/haptics';
import { track } from '../utils/analytics';

const LABEL: Record<string, string> = {
  en: 'New to faith? Start here',
  es: '¿Nuevo en la fe? Comienza aquí',
  pt: 'Novo na fé? Comece aqui',
  id: 'Baru mengenal iman? Mulai di sini',
};

interface Props {
  /** Where the tap came from — analytics only, never changes the look. */
  source: string;
  onStart: () => void;
}

export function NewToFaithButton({ source, onStart }: Props) {
  const label = LABEL[getLang()] || LABEL.en;
  return (
    <button
      className="dw-new-to-faith"
      onClick={() => { hapticTap(); track('new_to_faith_start', source); onStart(); }}
    >
      <span>{label}</span>
      <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
