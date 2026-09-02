/** Mirrors parseYoutubeId in netlify/functions/lib/intake-core.js so a bad link
 *  is caught next to the field, before the server refuses the whole save. */
export function youtubeLinkProblem(raw: unknown): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  const isId = (id: string | null | undefined) => /^[A-Za-z0-9_-]{11}$/.test(String(id || ''));
  if (isId(v)) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be' && isId(u.pathname.split('/').filter(Boolean)[0])) return '';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      if (isId(u.searchParams.get('v'))) return '';
      const parts = u.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') && isId(parts[1])) return '';
    }
  } catch { /* fall through */ }
  return 'That is not a YouTube video link. Paste the watch, youtu.be, shorts, or embed link — or leave it blank and add it after Sunday.';
}
