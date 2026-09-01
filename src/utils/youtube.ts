/** YouTube watch / youtu.be / shorts / embed / live → 11-char id. */
export function parseYoutubeId(url?: string | null): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') && parts[1] && /^[A-Za-z0-9_-]{11}$/.test(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(url?: string | null): string {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
}

export function youtubeWatchUrl(url?: string | null): string {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : '';
}
