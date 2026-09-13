/**
 * CrossRefsCard — the cross-reference surface the deeper-study door has
 * promised since "Commentary, original languages, cross-references"
 * (i18n.ts ~930). One row per verse in the open chapter, each with chips
 * for the passages the study layer links to it (source `openbible-crossrefs`,
 * OpenBible.info, CC BY 4.0, derived from the Treasury of Scripture
 * Knowledge — see scripts/study/crossrefs.mjs). Tapping a chip opens the
 * referenced passage inline, right under its row.
 *
 * Rides the same session-memoised fetchChapterStudy() call every other
 * chapter-scoped surface uses — never fetchStudyPassage (the heavy, full-
 * depth path).
 */
import { useEffect, useState } from 'react';
import { t } from '../../utils/i18n';
import { fetchChapterStudy } from '../../utils/study';
import type { StudyCrossRef } from '../../utils/study';
import { fetchPassage } from '../../utils/api';
import type { TranslationCode } from '../../utils/api';
import { useStudySources } from '../../utils/useStudySources';
import { formatProvenance, provenanceForSource } from '../../utils/provenance';
import { ScripturePassage } from '../ScripturePassage';
import { Card } from '../Card';

const CHIPS_VISIBLE = 4;

interface CrossRefsCardProps {
  chapterRef: string;
  translation: TranslationCode;
  lang: string;
  onSelectText: (text: string, ref: string) => void;
}

interface ChipState {
  loading: boolean;
  text?: string;
  error?: boolean;
}

type CrossRefsResult = { verse: number; refs: StudyCrossRef[] }[];

/** Session cache of the chapter-level cross-refs fetch, keyed by chapterRef —
 *  a card fetches once per chapter per session, matching CommentaryCard's
 *  fetch-on-expand discipline. `'error'` records a failed fetch so re-opening
 *  the card doesn't hammer the endpoint again. */
const crossRefsCache = new Map<string, CrossRefsResult | 'error'>();

const chipButtonStyle = {
  display: 'inline-flex' as const, alignItems: 'center' as const, minHeight: 36,
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
  borderRadius: 999, padding: '7px 12px', color: 'var(--dw-accent)',
  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

export function CrossRefsCard({ chapterRef, translation, lang }: CrossRefsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [crossRefs, setCrossRefs] = useState<CrossRefsResult>([]);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState<Record<number, boolean>>({});
  const [openTarget, setOpenTarget] = useState<{ verse: number; ref: string } | null>(null);
  const [chipData, setChipData] = useState<Record<string, ChipState>>({});
  const studySources = useStudySources();

  // Fetched only once the card is expanded ("tap to read"), never on mount —
  // and only once per chapterRef per session (crossRefsCache above).
  useEffect(() => {
    if (!expanded) return;
    setVerseExpanded({});
    setOpenTarget(null);
    setChipData({});

    const cached = crossRefsCache.get(chapterRef);
    if (cached !== undefined) {
      setFetchFailed(cached === 'error');
      setCrossRefs(cached === 'error' ? [] : cached);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setFetchFailed(false);
    fetchChapterStudy(chapterRef).then(r => {
      if (!alive) return;
      if (r === null) {
        crossRefsCache.set(chapterRef, 'error');
        setFetchFailed(true);
        setCrossRefs([]);
      } else {
        const refs = r.crossRefs || [];
        crossRefsCache.set(chapterRef, refs);
        setCrossRefs(refs);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [expanded, chapterRef]);

  // Keyed on verse + ref (not just ref) so a target referenced from two
  // verses in the same chapter opens under only the verse that was tapped.
  // Opening a cross-reference inline is not a text selection, so this never
  // calls onSelectText — that stays reserved for the actual selection flow.
  async function handleChipTap(verse: number, ref: string) {
    if (openTarget && openTarget.verse === verse && openTarget.ref === ref) {
      setOpenTarget(null);
      return;
    }
    setOpenTarget({ verse, ref });
    if (chipData[ref] && !chipData[ref].error) return;
    setChipData(prev => ({ ...prev, [ref]: { loading: true } }));
    try {
      const text = await fetchPassage(ref, translation);
      setChipData(prev => ({ ...prev, [ref]: { loading: false, text } }));
    } catch {
      setChipData(prev => ({ ...prev, [ref]: { loading: false, error: true } }));
    }
  }

  const provenance = formatProvenance(
    provenanceForSource('openbible-crossrefs', studySources, 'OpenBible.info cross-references', t('prov_share_alike', lang))
  );

  return (
    <Card style={{ marginBottom: 16 }}>
      <div
        onClick={() => !expanded && setExpanded(true)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: expanded ? 'default' : 'pointer', marginBottom: expanded ? 10 : 0 }}
      >
        <h2 className="text-section-header" style={{ margin: 0 }}>{t('preach_prep_crossrefs_label', lang)}</h2>
        {!expanded && (
          <span style={{ fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{t('tap_to_read', lang)}</span>
        )}
      </div>

      {expanded && (
        <>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {t('crossrefs_loading', lang)}
            </p>
          ) : fetchFailed ? (
            <p data-testid="crossrefs-empty" style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {t('pastor_offline_error', lang)}
            </p>
          ) : crossRefs.length === 0 ? (
            <p data-testid="crossrefs-empty" style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {t('preach_prep_crossrefs_empty', lang)}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {crossRefs.map(group => {
                const isVerseExpanded = !!verseExpanded[group.verse];
                const visible = isVerseExpanded ? group.refs : group.refs.slice(0, CHIPS_VISIBLE);
                const remaining = group.refs.length - CHIPS_VISIBLE;
                return (
                  <div key={group.verse} data-testid="crossrefs-verse-group" data-verse={group.verse}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>
                      {t('preach_prep_verse_label', lang)} {group.verse}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {visible.map(r => (
                        <button
                          key={r.ref}
                          type="button"
                          onClick={() => handleChipTap(group.verse, r.ref)}
                          style={chipButtonStyle}
                          data-testid="crossrefs-chip"
                        >
                          {r.ref}
                        </button>
                      ))}
                      {!isVerseExpanded && remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => setVerseExpanded(prev => ({ ...prev, [group.verse]: true }))}
                          style={{ ...chipButtonStyle, background: 'none', color: 'var(--dw-text-muted)' }}
                          data-testid="crossrefs-chip-more"
                        >
                          +{remaining} {t('crossrefs_more', lang)}
                        </button>
                      )}
                    </div>
                    {openTarget && openTarget.verse === group.verse && (
                      <div style={{ marginTop: 10, paddingLeft: 4, borderLeft: '2px solid var(--dw-border)' }}>
                        {chipData[openTarget.ref]?.loading ? (
                          <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                            {t('crossrefs_loading', lang)}
                          </p>
                        ) : chipData[openTarget.ref]?.error ? (
                          <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                            {t('commentary_offline', lang)}
                          </p>
                        ) : chipData[openTarget.ref]?.text ? (
                          <ScripturePassage text={chipData[openTarget.ref]!.text!} passageRef={openTarget.ref} fontSize={14} />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {provenance && (
            <p
              data-testid="crossrefs-provenance"
              style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '14px 0 0' }}
            >
              {provenance}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
