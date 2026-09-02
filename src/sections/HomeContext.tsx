/**
 * HomeContext — shared state for HomeScreen section components.
 * Each section receives PersonaConfig as a prop and handles its own gating.
 * This context provides the shared data many sections depend on.
 */
import { createContext, useContext } from 'react';
import type { TranslationCode } from '../utils/api';
import type { PersonaConfig } from '../utils/persona-config';

export interface HomeContextValue {
  // Persona
  personaConfig: PersonaConfig;

  // Day & content
  dayOffset: number;
  setDayOffset: (fn: (d: number) => number) => void;
  translation: TranslationCode;
  setTranslation: (t: TranslationCode) => void;

  // Devotion
  todaysDevotion: { title: string; body: string; verse?: string; author?: string };

  // Passages
  passageTexts: Record<string, string>;
  loadingPassages: Set<string>;
  expandedPassages: Set<string>;
  loadPassage: (passage: string) => void;
  handleRead: (passage: string) => void;
  handleListen: (passage: string) => void;

  // Audio
  audioPlaying: boolean;
  audioLoading: boolean;
  audioCurrentPassage: string | null;
  audioError: boolean;
  handleHeroListen: () => void;

  // Selection
  selection: { text: string; verseRefs: string[]; source: string } | null;
  setSelection: (sel: { text: string; verseRefs: string[]; source: string } | null) => void;

  // User
  userProfile: { firstName?: string; campus?: string; email?: string } | null;
  setup: { persona?: string } | null;
  streakCount: number;

  // Plans
  todaysPlanPassages: Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; author: string; body: string } }>;
  homeActivePlans: Array<{ plan: { id: string; title: string; totalDays: number; bookId?: string }; completedCount: number }>;
  startPlanFromHome: (planId: string) => void;
  removePlanFromHome: (planId: string) => void;

  // Bible AI
  setBibleAIContext: (ctx: string) => void;
  setShowBibleAI: (show: boolean) => void;

  // Greek/Hebrew
  greekHebrewMode: boolean;
  renderScripture: (text: string, passage: string) => React.ReactNode;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children, value }: { children: React.ReactNode; value: HomeContextValue }) {
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error('useHome must be used within HomeProvider');
  return ctx;
}
