// Shared dialog accessibility for the app's overlay components (EmailGate,
// PushOptIn, PathwayPicker, SetupPromptModal, VerseNoteDrawer, GreekHebrewPopup).
// While `open`: moves focus into the dialog, traps Tab inside it, closes on
// Escape (when a dismiss path exists), and restores focus to the opener on
// close. Semantics (role="dialog" aria-modal aria-label/ledby) stay on the
// component's own container element — attach the returned ref to it.
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y(open: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus into the dialog (first focusable, else the container itself).
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    const first = container.querySelector<HTMLElement>(FOCUSABLE);
    (first || container).focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCloseRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        // Skip elements hidden by display:none (offsetParent null) — but keep
        // whatever currently holds focus so the cycle can't dead-end.
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && container.contains(active);
      if (e.shiftKey) {
        if (!inside || active === firstEl) { e.preventDefault(); lastEl.focus(); }
      } else {
        if (!inside || active === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };

    // Capture phase so the trap wins over window-level shortcuts (e.g. the
    // Home screen's Space handler).
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return containerRef;
}
