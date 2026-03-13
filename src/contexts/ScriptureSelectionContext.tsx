import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

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
}

const ScriptureSelectionContext = createContext<ScriptureSelectionContextValue | null>(null);

const STORAGE_KEY = 'dw_highlights';

function loadHighlights(): Record<string, ScriptureHighlight> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function ScriptureSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<ScriptureSelection | null>(null);
  const [highlights, setHighlights] = useState<Record<string, ScriptureHighlight>>(loadHighlights);
  const [greekHebrewMode, setGreekHebrewMode] = useState(false);
  const [activePopupWord, setActivePopupWord] = useState<{ word: string; strongsNum: string; testament: 'OT' | 'NT' } | null>(null);

  const toggleHighlight = useCallback((verseKey: string, text: string) => {
    setHighlights(prev => {
      const next = { ...prev };
      if (next[verseKey]) {
        delete next[verseKey];
      } else {
        next[verseKey] = { verseKey, text, timestamp: Date.now(), color: 'gold' };
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setSelection({ text, verseRefs: [verseKey], source: 'tap' });
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <ScriptureSelectionContext.Provider value={{
      selection, setSelection,
      highlights, toggleHighlight, clearHighlights,
      greekHebrewMode, setGreekHebrewMode,
      activePopupWord, setActivePopupWord,
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
