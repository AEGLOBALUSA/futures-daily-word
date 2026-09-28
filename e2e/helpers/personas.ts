export type Persona = 'new_to_faith' | 'congregation' | 'deeper_study' | 'pastor_leader' | 'comfort';
export type TabName = 'home' | 'plans' | 'journal' | 'messages' | 'more';
export type Theme = 'light' | 'dark';

export interface ViewDef {
  /** e.g. congregation__home__light */
  name: string;
  persona: Persona;
  campus: string;
  tab: TabName;
  theme: Theme;
  /** Campus tab only: which sub-tab to land on. */
  campusSubTab?: 'pastor' | 'prayer';
  /** Click the "Alpharetta" sub-tab button when it exists (it doesn't on main yet). */
  clickAlpharettaSubTab?: boolean;
  /** Simulate a signed-in campus pastor. */
  staffSignedIn?: boolean;
  /** Navigate straight to /staff instead of the main app. */
  staffRoute?: boolean;
  /** Views that are expected to change only on the Alpharetta builder's PRs. */
  alpharetta?: boolean;
}

const PERSONAS: Persona[] = ['new_to_faith', 'congregation', 'deeper_study', 'pastor_leader', 'comfort'];
const TABS: TabName[] = ['home', 'plans', 'journal', 'messages', 'more'];

export function buildViews(): ViewDef[] {
  const views: ViewDef[] = [];

  // Every persona × every tab, light theme, campus us-kennesaw.
  for (const persona of PERSONAS) {
    for (const tab of TABS) {
      if (tab === 'messages') {
        // Congregation gets both Campus sub-tabs; everyone else gets Pastor's Corner.
        if (persona === 'congregation') {
          views.push({ name: `${persona}__messages_pastor__light`, persona, campus: 'us-kennesaw', tab, theme: 'light', campusSubTab: 'pastor' });
          views.push({ name: `${persona}__messages_prayer__light`, persona, campus: 'us-kennesaw', tab, theme: 'light', campusSubTab: 'prayer' });
        } else {
          views.push({ name: `${persona}__messages_pastor__light`, persona, campus: 'us-kennesaw', tab, theme: 'light', campusSubTab: 'pastor' });
        }
      } else {
        views.push({ name: `${persona}__${tab}__light`, persona, campus: 'us-kennesaw', tab, theme: 'light' });
      }
    }
  }

  // Alpharetta reader — Campus tab.
  views.push({
    name: 'alpharetta_reader__messages__light',
    persona: 'congregation', campus: 'us-alpharetta', tab: 'messages', theme: 'light',
    campusSubTab: 'pastor', alpharetta: true,
  });

  // Creator = the Alpharetta reader + signed-in pastor, clicking the
  // "Alpharetta" sub-tab button when it exists.
  views.push({
    name: 'creator__messages__light',
    persona: 'congregation', campus: 'us-alpharetta', tab: 'messages', theme: 'light',
    campusSubTab: 'pastor', staffSignedIn: true, clickAlpharettaSubTab: true, alpharetta: true,
  });

  // /staff signed out.
  views.push({
    name: 'staff__signed_out__light',
    persona: 'congregation', campus: 'us-kennesaw', tab: 'home', theme: 'light',
    staffRoute: true,
  });

  // Congregation's five tabs in dark.
  for (const tab of TABS) {
    if (tab === 'messages') {
      views.push({ name: `congregation__messages_pastor__dark`, persona: 'congregation', campus: 'us-kennesaw', tab, theme: 'dark', campusSubTab: 'pastor' });
    } else {
      views.push({ name: `congregation__${tab}__dark`, persona: 'congregation', campus: 'us-kennesaw', tab, theme: 'dark' });
    }
  }

  return views;
}
