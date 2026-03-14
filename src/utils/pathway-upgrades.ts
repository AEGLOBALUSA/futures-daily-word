/**
 * Pathway Upgrade System — "Ready for More?"
 * Checks conditions for when a user might benefit from a different persona,
 * and provides gentle prompts to upgrade/transition.
 */
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

function getDaysActive(): number {
  try {
    const firstOpen = localStorage.getItem('dw_first_open');
    if (!firstOpen) return 0;
    const start = new Date(firstOpen);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  } catch { return 0; }
}

function isFaithPathwayCompleted(): boolean {
  try {
    const progress = JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}');
    const completedDays: number[] = progress.completedDays || [];
    // Faith pathway has 40 days
    return completedDays.length >= 40;
  } catch { return false; }
}

export const UPGRADE_CONDITIONS: UpgradeCondition[] = [
  {
    from: 'new_to_faith',
    to: 'congregation',
    label: 'Ready for More?',
    description: "You've been growing in your faith. Ready to explore more of the Daily Word experience?",
    check: () => isFaithPathwayCompleted() || getDaysActive() >= 60,
  },
  {
    from: 'congregation',
    to: 'deeper_study',
    label: 'Go Deeper?',
    description: "You've been consistent in the Word. Ready for original languages, commentary, and deeper study tools?",
    check: () => getCompletedPlansCount() >= 3 || getAIConversationCount() >= 20,
  },
  {
    from: 'comfort',
    to: 'congregation',
    label: 'Feeling Stronger?',
    description: "When you're ready, there's more to explore. No pressure — God's timing is perfect.",
    check: () => getDaysActive() >= 30,
  },
];

/**
 * Check if the current persona has an eligible upgrade.
 * Returns the upgrade condition if eligible and not dismissed, null otherwise.
 */
export function checkForUpgrade(currentPersona: string): UpgradeCondition | null {
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
