/**
 * Which one-time set-up asks apply right now (B09-08 kind 8). Each mirrors the
 * condition its own component already uses, so the next-step card only offers
 * an ask the component would show:
 *   install  → PWAInstallBanner  (not installed or embedded, not dismissed, a reading done)
 *   email    → EmailNudgeCard    (not dismissed, a reading recorded, push asked, no email)
 *   upgrade  → UpgradePromptCard (checkForUpgrade: not I'm New, conditions met, not dismissed in 14 days)
 * Every read is wrapped: blocked storage means "does not apply".
 */
import { isStandaloneDisplay, isEmbeddedApp, isInstallDismissed } from './pwa';
import { getStreak } from './streak';
import { checkForUpgrade } from './pathway-upgrades';
import { isNewChristianPersona } from './persona-config';
import type { SetupAsk } from './nextStep';

export function installApplies(): boolean {
  try {
    if (isStandaloneDisplay() || isEmbeddedApp() || isInstallDismissed()) return false;
    return !!localStorage.getItem('dw_reading_done');
  } catch {
    return false;
  }
}

export function emailApplies(email: string | null | undefined): boolean {
  try {
    if (email) return false;
    if (localStorage.getItem('dw_email_nudge_dismissed')) return false;
    if (!localStorage.getItem('dw_push_onboarded')) return false;
    return !!getStreak().lastDate;
  } catch {
    return false;
  }
}

export function upgradeApplies(persona: string): boolean {
  try {
    if (isNewChristianPersona(persona)) return false;
    return !!checkForUpgrade(persona);
  } catch {
    return false;
  }
}

/** The asks that apply now, in the card's order (install, email, upgrade). */
export function applicableSetupAsks(persona: string, email: string | null | undefined): SetupAsk[] {
  const out: SetupAsk[] = [];
  if (installApplies()) out.push('install');
  if (emailApplies(email)) out.push('email');
  if (upgradeApplies(persona)) out.push('upgrade');
  return out;
}
