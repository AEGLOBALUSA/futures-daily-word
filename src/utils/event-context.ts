/**
 * Reads the reader's current path + journey day straight from localStorage
 * so every analytics call site gets these automatically instead of having
 * to remember to pass them.
 */
import { LS } from './storage';

/** dw_setup.persona, or null if absent/blank/corrupt. */
export function getEventPath(): string | null {
  try {
    const raw = localStorage.getItem(LS.setup);
    if (!raw) return null;
    const setup = JSON.parse(raw);
    const persona = setup?.persona;
    return typeof persona === 'string' && persona.trim() !== '' ? persona : null;
  } catch {
    return null;
  }
}

/** dw_pathway_progress.currentDay, only for the new_to_faith path, else null. */
export function getJourneyDay(): number | null {
  try {
    if (getEventPath() !== 'new_to_faith') return null;
    const raw = localStorage.getItem(LS.pathwayProgress);
    if (!raw) return null;
    const progress = JSON.parse(raw);
    const day = progress?.currentDay;
    return Number.isInteger(day) && day >= 1 && day <= 1000 ? day : null;
  } catch {
    return null;
  }
}
