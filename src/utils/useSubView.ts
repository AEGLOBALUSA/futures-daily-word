// Browser-history integration for in-screen sub-views (readers, dashboards,
// full-screen editors, the Bible AI panel) so the Android back button /
// browser back-swipe closes the topmost open sub-view instead of ejecting the
// user from the whole tab. App.tsx's popstate handler drives closeSubViewsTo;
// each open sub-view owns exactly one history entry while it is open.
import { useEffect, useRef } from 'react';

interface SubViewEntry {
  close: () => void;
}

// Module-level registry of currently-open sub-views, newest last. Matches the
// dwSubDepth stamped into each pushed history entry.
const stack: SubViewEntry[] = [];

/** Number of currently-open registered sub-views. */
export function openSubViewCount(): number {
  return stack.length;
}

/** Close registered sub-views (newest first) until only `depth` remain. */
export function closeSubViewsTo(depth: number): void {
  while (stack.length > Math.max(0, depth)) {
    const entry = stack.pop();
    try { entry?.close(); } catch { /* ignore */ }
  }
}

/**
 * Register a sub-view with the history stack. While `isOpen`, one pushed
 * history entry represents this view, so the back gesture closes it (via
 * `close`) instead of popping the tab. Idempotent with UI-driven closes:
 * closing the view yourself consumes the pushed entry, and entries orphaned
 * by unmounts are skipped by App's popstate handler.
 */
export function useSubView(isOpen: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  const entryRef = useRef<SubViewEntry | null>(null);

  useEffect(() => {
    if (isOpen && !entryRef.current) {
      const entry: SubViewEntry = {
        // Called by the popstate path — clear entryRef FIRST so the follow-up
        // isOpen=false run of this effect doesn't also call history.back().
        close: () => { entryRef.current = null; closeRef.current(); },
      };
      entryRef.current = entry;
      stack.push(entry);
      try { window.history.pushState({ dwSub: true, dwSubDepth: stack.length }, ''); } catch { /* ignore */ }
    } else if (!isOpen && entryRef.current) {
      // Closed by its own UI (not popstate) — release the registry entry and
      // consume the history entry we pushed so Back doesn't need a dead press.
      const entry = entryRef.current;
      entryRef.current = null;
      const i = stack.indexOf(entry);
      if (i >= 0) {
        stack.splice(i, 1);
        try { window.history.back(); } catch { /* ignore */ }
      }
    }
  }, [isOpen]);

  // Unmount (tab switch / sync remount): release the entry WITHOUT touching
  // history — a tab entry may already sit on top of ours, and the popstate
  // handler skips stale sub-view entries on its own.
  useEffect(() => () => {
    const entry = entryRef.current;
    if (entry) {
      entryRef.current = null;
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    }
  }, []);
}
