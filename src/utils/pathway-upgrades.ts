/**
 * Pathway Upgrade System
 * Gentle prompts when a user might benefit from a different persona.
 * new_to_faith is intentionally omitted — I'm New stays until they change
 * path themselves in Settings / the path picker. Do not re-add a
 * new_to_faith → congregation prompt; getDaysActive() is since dw_first_open,
 * not since they chose I'm New, so it interrupts the 40-day journey.
 */
import { isNewChristianPersona } from './persona-config';
import type { Persona } from './persona-config';

interface UpgradeCondition {
  from: Persona;
  to: Persona;
  label: string;
  description: string;
  check: () => boolean;
}

function getCompletedPlansCount(): number {
  try {
    const ap: Record<string, { completedDays: number[] }> = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
    let count = 0;
    for (const prog of Object.values(ap)) {
      // Consider a plan "completed" if 80%+ of days are done
      if (prog.completedDays && prog.completedDays.length > 0) {
        count++;
      }
    }
    return count;
  } catch { return 0; }
}

function getAIConversationCount(): number {
  try {
    return parseInt(localStorage.getItem('dw_ai_conversation_count') || '0', 10);
  } catch { return 0; }
}

export const UPGRADE_CONDITIONS: UpgradeCondition[] = [
  {
    from: 'congregation',
    to: 'deeper_study',
    label: 'Go Deeper?',
    description: "You've been consistent in the Word. Ready for original languages, commentary, and deeper study tools?",
    check: () => getCompletedPlansCount() >= 3 || getAIConversationCount() >= 20,
  },
  // Comfort has NO graduation prompt (persona-flow spec, 1 Sep 2026): someone
  // in a hard season is never nudged onward — they leave the path only by
  // choosing to, in Settings or a picker. Do not re-add 'Feeling Stronger?'.
];

/**
 * Check if the current persona has an eligible upgrade.
 * Returns the upgrade condition if eligible and not dismissed, null otherwise.
 */
export function checkForUpgrade(currentPersona: string): UpgradeCondition | null {
  // I'm New / New Christian stays on that path until they change it themselves.
  if (isNewChristianPersona(currentPersona)) return null;

  // Check if user has dismissed this upgrade
  const dismissedKey = `dw_upgrade_dismissed_${currentPersona}`;
  const dismissed = localStorage.getItem(dismissedKey);
  if (dismissed) {
    // Allow re-prompting after 14 days
    const dismissedDate = new Date(dismissed);
    const daysSinceDismissed = Math.floor((Date.now() - dismissedDate.getTime()) / 86400000);
    if (daysSinceDismissed < 14) return null;
  }

  return UPGRADE_CONDITIONS.find(u => u.from === currentPersona && u.check()) || null;
}

/**
 * Dismiss an upgrade prompt — stores timestamp so we can re-check later.
 */
export function dismissUpgrade(currentPersona: string): void {
  localStorage.setItem(`dw_upgrade_dismissed_${currentPersona}`, new Date().toISOString());
}
