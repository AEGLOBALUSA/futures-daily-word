/**
 * Sunday Service Window helpers
 * Active from Sunday 5:00 AM → Monday 5:00 AM local time (24-hour window)
 */

/** Returns true if the current time falls inside the Sunday service window */
export function isSundayWindow(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  // Sunday 5:00 AM through midnight
  if (day === 0 && hour >= 5) return true;
  // Monday midnight through 5:00 AM
  if (day === 1 && hour < 5) return true;

  return false;
}

/** Returns the Sunday date string (YYYY-MM-DD) for the current service window */
export function getSundayDate(): string {
  const now = new Date();
  const day = now.getDay();
  // If Monday before 5 AM, the "Sunday" is yesterday
  if (day === 1 && now.getHours() < 5) {
    const sun = new Date(now);
    sun.setDate(sun.getDate() - 1);
    return sun.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

/** Check if the user arrived via a ?sunday=1 QR/deep link */
export function isSundayDeepLink(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('sunday') === '1';
  } catch {
    return false;
  }
}

/** Set up guest mode for Sunday QR visitors */
export function activateSundayGuest(): void {
  const date = getSundayDate();
  localStorage.setItem('dw_sunday_guest', date);
  // Set a default persona so feature gating works
  if (!localStorage.getItem('dw_setup')) {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'sunday-guest' }));
  }
  // Mark pathway as done so PathwayPicker doesn't block
  if (!localStorage.getItem('dw_v7_pathway_done')) {
    localStorage.setItem('dw_v7_pathway_done', 'true');
  }
  // Clean up URL param without page reload
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('sunday');
    window.history.replaceState({}, '', url.toString());
  } catch { /* ignore */ }
}

/** Check if we're currently in Sunday guest mode (and it hasn't expired) */
export function isSundayGuest(): boolean {
  const guestDate = localStorage.getItem('dw_sunday_guest');
  if (!guestDate) return false;
  // Guest mode is valid for the Sunday window only
  if (isSundayWindow()) return true;
  // Outside window — clean up the flag
  localStorage.removeItem('dw_sunday_guest');
  return false;
}
