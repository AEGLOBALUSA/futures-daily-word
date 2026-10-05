// MultiplyOS UI switch, ON by default (owner ruling 5 Oct 2026); ?ui=legacy switches a device back. Presentation only. No storage beyond the cookie, no network.
export const UI_FLAG_COOKIE = "mos_ui";

export function applyUiFlag({ scoped }: { scoped: boolean }): void {
  try {
    const m = /(?:^|[?&])ui=([^&]*)/.exec(location.search || "");
    const v = m ? m[1] : "";
    if (v === "multiplyos") {
      document.cookie = `${UI_FLAG_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    } else if (v === "legacy") {
      document.cookie = `${UI_FLAG_COOKIE}=0; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    }
    if (scoped && !new RegExp(`(?:^|;\\s*)${UI_FLAG_COOKIE}=0(?:;|$)`).test(document.cookie || "")) {
      const r = document.documentElement;
      r.setAttribute("data-ui", "multiplyos");
      r.classList.add("mos-ui");
    }
  } catch {
    /* never throws */
  }
}

export function isMosUi(): boolean {
  try {
    return document.documentElement.getAttribute("data-ui") === "multiplyos";
  } catch {
    return false;
  }
}
