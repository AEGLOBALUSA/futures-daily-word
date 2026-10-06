/**
 * The Bible AI action card's logic (DW-P09). The card (AskActionCard) renders
 * what this returns and calls its handlers; every handler is a tap. Nothing
 * here runs on its own: a setting changes only on the card's Yes, a prayer is
 * posted only on the Prayer Wall's Post it, and the care door makes no call at
 * all.
 */
import { useEffect, useMemo, useState } from 'react';
import type { TabId } from '../components/TabBar';
import { useUser } from '../contexts/UserContext';
import { campusName } from '../data/campuses';
import { formatReminderTime } from './openTimes';
import type { AskIntent } from './askIntents';
import {
  CARE_MAILTO,
  confirmCampus,
  confirmReminder,
  confirmTranslation,
  openAddPrayer,
  openImNew,
  openPassage,
  openReminderSettings,
  openSundayNotes,
  planCards,
  reminderRoute,
  showsUsCrisisLine,
  startPlanFromAsk,
  type AskNav,
  type AskPlanCard,
  type ReminderRoute,
} from './askActions';

/** idle: the question is showing · saving: waiting on the server · done: it changed · failed: it did not. */
export type AskStatus = 'idle' | 'saving' | 'done' | 'failed';

export interface AskActionView {
  status: AskStatus;
  /** set_reminder: the hour in her language ("6:00 AM"), and how this phone can do it. */
  reminderTime: string;
  reminderRoute: ReminderRoute | null;
  /** set_campus: the campus's name ("Futures Paradise"). */
  campusName: string;
  /** set_campus after Yes: saved, or the email gate opened first (it keeps the campus). */
  campusResult: 'saved' | 'needs-email' | null;
  /** start_plan: one card per plan, in her language. */
  plans: AskPlanCard[];
  /** care: the empty email to the care team, and whether the US crisis line applies to her. */
  careMailto: string;
  showCrisisLine: boolean;
  /** Actions (each one is her tap). */
  openPassage: () => void;
  openSundayNotes: () => void;
  openImNew: () => void;
  openAddPrayer: () => void;
  startPlan: (planId: string) => void;
  openReminderSettings: () => void;
  confirmReminder: () => Promise<void>;
  confirmTranslation: () => void;
  confirmCampus: () => void;
}

export function useAskAction(
  intent: AskIntent | null,
  opts: { lang: string; close: () => void; navigate?: (tab: TabId) => void },
): AskActionView {
  const { lang, close, navigate } = opts;
  const { userProfile, saveProfile, requireEmail } = useUser();
  const [status, setStatus] = useState<AskStatus>('idle');
  const [campusResult, setCampusResult] = useState<'saved' | 'needs-email' | null>(null);
  useEffect(() => { setStatus('idle'); setCampusResult(null); }, [intent]);

  const nav: AskNav = { close, navigate };
  const plans = useMemo(
    () => (intent?.kind === 'start_plan' ? planCards(intent.args.planIds, lang) : []),
    [intent, lang],
  );

  return {
    status,
    reminderTime: intent?.kind === 'set_reminder' ? formatReminderTime(intent.args.hour, lang) : '',
    reminderRoute: intent?.kind === 'set_reminder' ? reminderRoute() : null,
    campusName: intent?.kind === 'set_campus' ? campusName(intent.args.campusId) : '',
    campusResult,
    plans,
    careMailto: CARE_MAILTO,
    showCrisisLine: intent?.kind === 'care' ? showsUsCrisisLine(userProfile?.campus) : false,

    openPassage: () => { if (intent?.kind === 'read_ref') openPassage(intent.args.ref, nav); },
    openSundayNotes: () => { if (intent?.kind === 'sunday_notes') openSundayNotes(nav); },
    openImNew: () => { if (intent?.kind === 'im_new') openImNew(nav); },
    openAddPrayer: () => { if (intent?.kind === 'add_prayer') openAddPrayer(intent.args.text, nav); },
    startPlan: (planId: string) => {
      if (intent?.kind === 'start_plan' && intent.args.planIds.includes(planId)) startPlanFromAsk(planId, nav);
    },
    openReminderSettings: () => { if (intent?.kind === 'set_reminder') openReminderSettings(nav); },

    confirmReminder: async () => {
      if (intent?.kind !== 'set_reminder' || status === 'saving') return;
      setStatus('saving');
      setStatus((await confirmReminder(intent.args.hour)) ? 'done' : 'failed');
    },
    confirmTranslation: () => {
      if (intent?.kind !== 'set_translation') return;
      setStatus(confirmTranslation(intent.args.code, lang) ? 'done' : 'failed');
    },
    confirmCampus: () => {
      if (intent?.kind !== 'set_campus') return;
      const r = confirmCampus(intent.args.campusId, {
        userProfile,
        saveProfile,
        requireEmail: () => requireEmail(),
      });
      if (r === 'ignored') { setStatus('failed'); return; }
      setCampusResult(r);
      setStatus('done');
    },
  };
}

