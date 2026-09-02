/**
 * StudySourcesCard — Settings card, pastor_leader only, that prints the
 * attribution every bulk-loaded study source's licence requires. Sits right
 * after the "Scripture Attribution" card in MoreScreen and mirrors its
 * markup/typography. Data comes from src/utils/study.ts (fetchStudySources,
 * netlify/functions/study.js) — public-domain / Creative Commons
 * cross-references, commentaries, lexicons and place data.
 */
import { useEffect, useState } from 'react';
import { Card } from './Card';
import { fetchStudySources, type StudySource } from '../utils/study';
import { t } from '../utils/i18n';

export function StudySourcesCard({ lang }: { lang: string }) {
  const [sources, setSources] = useState<StudySource[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchStudySources().then(res => {
      if (!alive) return;
      setSources(res?.sources ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const sorted = [...(sources || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>{t('study_sources_header', lang)}</h2>
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
          <p style={{ marginBottom: 8 }}>{t('study_sources_intro', lang)}</p>
          {loading ? (
            <p style={{ marginBottom: 0 }}>{t('study_sources_loading', lang)}</p>
          ) : sorted.length === 0 ? (
            <p style={{ marginBottom: 0 }}>{t('study_sources_none', lang)}</p>
          ) : (
            sorted.map((s, i) => (
              <p key={s.id} style={{ marginBottom: i === sorted.length - 1 ? 0 : 8 }}>
                <strong style={{ color: 'var(--dw-text-secondary)' }}>{s.name}</strong>
                {' — '}{s.licence}
                {typeof s.record_count === 'number' && ` (${s.record_count.toLocaleString()} ${t('study_sources_records', lang)})`}
                <br />
                {s.attribution}
                {s.url && <><br />{s.url}</>}
                {s.share_alike && <><br />{t('study_sources_share_alike', lang)}</>}
              </p>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
