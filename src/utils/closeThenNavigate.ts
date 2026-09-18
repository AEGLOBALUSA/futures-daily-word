/**
 * Leave a full-screen sub-view for another tab without stranding its history entry.
 *
 * A sub-view owns one pushed history entry while it is open (useSubView). Tabs
 * stay mounted once visited, so switching tab does NOT unmount the sub-view and
 * its entry is never released: pushing the tab entry on top of it left one dead
 * back press, and the press after that closed the surface the reader had left
 * (found in review, 18 Sep 2026). Closing and navigating in the same tick is no
 * better — history.back() is asynchronous, so it would land on, and undo, the
 * tab entry just pushed.
 *
 * So: close, wait for the popstate that says the sub-view's entry has been
 * consumed, then navigate. App's own popstate handler was registered first and
 * has already run by then. The backstop covers a sub-view that never got its
 * entry (pushState can throw); it is the same 600 ms App uses for the path sheet.
 */
export function closeThenNavigate(close: () => void, navigate: () => void, backstopMs = 600): void {
  let done = false;
  let timer = 0;
  const go = () => {
    if (done) return;
    done = true;
    window.removeEventListener('popstate', go);
    window.clearTimeout(timer);
    navigate();
  };
  window.addEventListener('popstate', go);
  timer = window.setTimeout(go, backstopMs);
  close();
}
