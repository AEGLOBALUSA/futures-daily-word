/**
 * Sermon archive — Preach workspace, "past messages" list (design doc §4.3.5).
 * Search + tap-to-open over every `published_sermons` row (newest first).
 * Read-only: nothing here writes anything. Persona-gated by the parent —
 * this component itself makes no persona check.
 */
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { t } from '../../utils/i18n';
import { fetchSermonArchive, searchSermons, sermonPassages, type ArchivedSermon } from '../../utils/sermonArchive';
import type { SermonNotesData } from '../SermonNotesSurface';

function formatDate(iso: string | undefined, lang: string): string {
  const raw = String(iso || '').slice(0, 10);
  if (!raw) return '';
  const d = new Date(raw + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return raw;
  const locale = lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : lang;
  try {
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return raw;
  }
}

function SermonCard({ row, lang, onOpen }: { row: ArchivedSermon; lang: string; onOpen: (s: SermonNotesData) => void }) {
  const sermon = row.sermon;
  const metaBits = [sermon.series, formatDate(sermon.date, lang)].filter(Boolean);
  const passages = sermonPassages(sermon);
  return (
    <button
      data-testid="archive-card"
      onClick={() => onOpen(sermon)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 10, minHeight: 44,
      }}
    >
      <p style={{
        fontSize: 16, fontWeight: 400, color: 'var(--dw-text-primary)',
        fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em', margin: '0 0 4px', lineHeight: 1.3,
      }}>
        {sermon.title}
      </p>
      {metaBits.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>
          {metaBits.join(' · ')}
        </p>
      )}
      {sermon.speaker && (
        <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>
          {sermon.speaker}
        </p>
      )}
      {passages.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {passages.join(' · ')}
        </p>
      )}
    </button>
  );
}

export function SermonArchive({ onOpen, lang }: { onOpen: (sermon: SermonNotesData) => void; lang: string }) {
  const [all, setAll] = useState<ArchivedSermon[] | null>(null); // null = still loading
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSermonArchive().then((rows) => { if (!cancelled) setAll(rows); });
    return () => { cancelled = true; };
  }, []);

  const loading = all === null;
  const results = all ? searchSermons(all, query) : [];

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
        borderRadius: 10, padding: '0 12px', marginBottom: 14, minHeight: 44,
      }}>
        <Search size={15} style={{ color: 'var(--dw-text-muted)', flexShrink: 0 }} />
        <input
          data-testid="archive-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('preach_archive_search_ph', lang)}
          style={{
            flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
            color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)', padding: '10px 0',
          }}
        />
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('preach_archive_loading', lang)}
        </p>
      )}

      {!loading && results.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {all && all.length === 0 ? t('preach_archive_empty', lang) : t('preach_archive_no_results', lang)}
        </p>
      )}

      {!loading && results.map((row) => (
        <SermonCard key={row.id} row={row} lang={lang} onOpen={onOpen} />
      ))}
    </div>
  );
}
