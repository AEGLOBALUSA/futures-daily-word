import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { schedulePush } from '../utils/cloudSync';

export interface ScriptureHighlight {
  verseKey: string;
  text: string;
  timestamp: number;
  color: 'gold' | 'sage';
}

export interface ScriptureSelection {
  text: string;
  verseRefs: string[];
  source: 'tap' | 'range' | 'select-all';
}

interface ScriptureSelectionContextValue {
  selection: ScriptureSelection | null;
  setSelection: (s: ScriptureSelection | null) => void;
  highlights: Record<string, ScriptureHighlight>;
  toggleHighlight: (verseKey: string, text: string) => void;
  clearHighlights: () => void;
  greekHebrewMode: boolean;
  setGreekHebrewMode: (v: boolean) => void;
  activePopupWord: { word: string; strongsNum: string; testament: 'OT' | 'NT' } | null;
  setActivePopupWord: (w: { word: string; strongsNum: string; testament: 'OT' | 'NT' } | null) => void;
  /** Screens rendering scripture should call this so auto-saved highlight entries preserve the plan/devotional context. */
  setCurrentPlanContext: (ctx: string | undefined) => void;
}

const ScriptureSelectionContext = createContext<ScriptureSelectionContextValue | null>(null);

const STORAGE_KEY = 'dw_highlights';
const JOURNAL_KEY = 'dw_journal';

function loadHighlights(): Record<string, ScriptureHighlight> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/* ── Journal auto-entry helpers (Fix 1) ──────────────────────────────────
   When a user toggles a highlight on, we append a 'saved' Journal entry
   with autoSaved: true. When they toggle it off AND haven't written a
   note yet, we remove that auto-saved entry. If they later wrote a note
   on it via VerseNoteDrawer, the entry stays (autoSaved becomes false
   at that point). This delivers the "highlighted verses automatically
   appear in the Notes tab" behavior without creating duplicates when
   the user later types a reflection.
*/

// Deterministic ID for an auto-saved highlight entry so we can find + remove it.
function autoEntryId(verseKey: string, text: string): string {
  // Simple stable hash: verseKey + first 40 chars of text. Good enough; collisions are harmless.
  const stamp = verseKey + '::' + text.slice(0, 40);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'hl_' + btoa(unescape(encodeURIComponent(stamp))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
}

interface JournalEntryLike {
  id: string;
  date: string;
  type: string;
  title: string;
  body: string;
  tags: string[];
  verseRef?: string;
  highlightedText?: string;
  planContext?: string;
  autoSaved?: boolean;
  highlightColor?: 'gold' | 'sage';
  updatedAt?: string;
}

function readJournal(): JournalEntryLike[] {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
  } catch { return []; }
}

function writeJournal(entries: JournalEntryLike[]) {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 5000))); } catch {}
  window.dispatchEvent(new Event('dw-journal-updated'));
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || '{}');
    if (profile.email) schedulePush(profile.email);
  } catch {}
}

function appendHighlightEntry(verseKey: string, text: string, color: 'gold' | 'sage', planContext?: string) {
  const id = autoEntryId(verseKey, text);
  const entries = readJournal();
  if (entries.find(e => e.id === id)) return; // already saved — no duplicate
  const now = new Date();
  const entry: JournalEntryLike = {
    id,
    date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    type: 'saved',
    title: verseKey,
    body: '',
    tags: planContext ? ['scripture', 'plan-note', 'highlight'] : ['scripture', 'highlight'],
    verseRef: verseKey,
    highlightedText: text,
    planContext,
    autoSaved: true,
    highlightColor: color,
    updatedAt: now.toISOString(),
  };
  entries.unshift(entry);
  writeJournal(entries);
}

function removeHighlightEntryIfUntouched(verseKey: string, text: string) {
  const id = autoEntryId(verseKey, text);
  const entries = readJournal();
  const match = entries.find(e => e.id === id);
  // Only remove if we originally auto-saved it and the user never wrote a note on it.
  if (!match || !match.autoSaved || (match.body && match.body.trim())) return;
  const next = entries.filter(e => e.id !== id);
  writeJournal(next);
}

export function ScriptureSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<ScriptureSelection | null>(null);
  const [highlights, setHighlights] = useState<Record<string, ScriptureHighlight>>(loadHighlights);
  const [greekHebrewMode, setGreekHebrewMode] = useState(false);
  const [activePopupWord, setActivePopupWord] = useState<{ word: string; strongsNum: string; testament: 'OT' | 'NT' } | null>(null);
  // Held in a ref so toggleHighlight stays referentially stable and always reads the current value.
  const planContextRef = useRef<string | undefined>(undefined);

  const setCurrentPlanContext = useCallback((ctx: string | undefined) => {
    planContextRef.current = ctx;
  }, []);

  const toggleHighlight = useCallback((verseKey: string, text: string) => {
    setHighlights(prev => {
      const next = { ...prev };
      const wasHighlighted = !!next[verseKey];
      if (wasHighlighted) {
        delete next[verseKey];
      } else {
        next[verseKey] = { verseKey, text, timestamp: Date.now(), color: 'gold' };
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}

      // Fix 1: mirror the highlight into the Journal so it appears in the Notes tab automatically.
      if (wasHighlighted) {
        removeHighlightEntryIfUntouched(verseKey, text);
      } else {
        appendHighlightEntry(verseKey, text, 'gold', planContextRef.current);
      }

      // Also push the highlights map itself (Fix 2 ensures this reaches the cloud).
      try {
        const profile = JSON.parse(localStorage.getItem('dw_profile') || '{}');
        if (profile.email) schedulePush(profile.email);
      } catch {}

      return next;
    });
    setSelection({ text, verseRefs: [verseKey], source: 'tap' });
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    // Clear matching auto-saved, untouched journal entries too.
    const entries = readJournal();
    const remaining = entries.filter(e => !(e.autoSaved && (!e.body || !e.body.trim())));
    if (remaining.length !== entries.length) writeJournal(remaining);
  }, []);

  return (
    <ScriptureSelectionContext.Provider value={{
      selection, setSelection,
      highlights, toggleHighlight, clearHighlights,
      greekHebrewMode, setGreekHebrewMode,
      activePopupWord, setActivePopupWord,
      setCurrentPlanContext,
    }}>
      {children}
    </ScriptureSelectionContext.Provider>
  );
}

export function useScriptureSelection() {
  const ctx = useContext(ScriptureSelectionContext);
  if (!ctx) throw new Error('useScriptureSelection must be used within ScriptureSelectionProvider');
  return ctx;
}
