/**
 * CommentaryCard — the whole Commentary surface on Home, lifted out of
 * HomeScreen and re-sourced onto the study library (src/utils/study.ts,
 * netlify/functions/study.js). Order: the curated Daily Word entry for this
 * chapter (when one exists, labelled honestly — never as one of the public-
 * domain commentaries it sits beside), then one tab per study-layer
 * commentary that actually has text for the chapter, each with its own
 * provenance line. The AI paragraph never joins that strip: it renders in
 * its own labelled block below, with the model named as its author.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card } from '../Card';
import { COMMENTARY } from '../../data/commentary';
import { fetchChapterStudy, fetchStudyCommentary, COMMENTARY_NAMES, type StudyCommentary, type StudyCommentaryEntry } from '../../utils/study';
import { fetchAICommentarySourced } from '../../utils/api';
import { formatProvenance, provenanceForSource } from '../../utils/provenance';
import { useStudySources } from '../../utils/useStudySources';
import { t } from '../../utils/i18n';

interface CommentaryCardProps {
  chapterRef: string;
  lang: string;
  mode: 'collapsed' | 'expanded';
  sourced: boolean;
  onSelectText: (text: string, ref: string) => void;
  onOpenSources: () => void;
}

const CURATED_ID = 'curated';

/** The first curated entry found for this chapter, across whichever curated
 *  source wrote it. commentary.ts stores prose keyed source -> passage; the
 *  reader never sees which source, only the honest "Daily Word editors" label. */
function curatedEntryFor(chapterRef: string): string | null {
  const sources = COMMENTARY as Record<string, Record<string, string>>;
  for (const entries of Object.values(sources)) {
    if (entries[chapterRef]) return entries[chapterRef];
  }
  return null;
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 20,
  border: '1px solid',
  borderColor: active ? 'var(--dw-accent)' : 'var(--dw-border, #E8E6E0)',
  background: active ? 'var(--dw-accent)' : 'transparent',
  color: active ? '#fff' : 'var(--dw-text-muted)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  letterSpacing: '0.02em',
  transition: 'all 0.15s',
});

export function CommentaryCard({ chapterRef, lang, mode, sourced, onSelectText, onOpenSources }: CommentaryCardProps) {
  const [expanded, setExpanded] = useState(mode === 'expanded');
  const sourcesMap = useStudySources();

  const curatedText = useMemo(() => curatedEntryFor(chapterRef), [chapterRef]);

  // Study-layer tabs — only the commentaries that actually have text for this
  // chapter (count > 0), fetched once the card is expanded so a collapsed
  // card costs nothing.
  const [studyList, setStudyList] = useState<StudyCommentary[]>([]);
  useEffect(() => {
    setStudyList([]);
    if (!chapterRef || !expanded || !sourced) return;
    let alive = true;
    fetchChapterStudy(chapterRef).then(r => {
      if (!alive) return;
      setStudyList((r?.commentary || []).filter(c => (c.count ?? 0) > 0));
    });
    return () => { alive = false; };
  }, [expanded, sourced, chapterRef]);

  const tabs = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    if (curatedText) out.push({ id: CURATED_ID, label: t('commentary_curated_source', lang) });
    for (const c of studyList) {
      out.push({ id: c.sourceId, label: COMMENTARY_NAMES[c.sourceId] || c.sourceId });
    }
    return out;
  }, [curatedText, studyList, lang]);

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  useEffect(() => { setSelectedTabId(null); setLoadingSourceId(null); }, [chapterRef]);
  const activeTabId = (selectedTabId && tabs.some(x => x.id === selectedTabId)) ? selectedTabId : (tabs[0]?.id ?? null);

  // Study-layer entry text, memoised per "chapterRef|sourceId" for the session
  // (the study.ts get() cache already memoises the fetch; this just holds the
  // entries for render). Keying by chapterRef too means paging the hero to a
  // new chapter can never show the previous chapter's cached text — the key
  // simply isn't there yet, so it fetches fresh. `null` marks a failed fetch;
  // `[]` marks a source that genuinely has no rows for this chapter.
  const [studyEntries, setStudyEntries] = useState<Record<string, StudyCommentaryEntry[] | null>>({});
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  useEffect(() => {
    if (!chapterRef) return;
    if (!activeTabId || activeTabId === CURATED_ID) return;
    const cacheKey = `${chapterRef}|${activeTabId}`;
    if (studyEntries[cacheKey] !== undefined) return;
    let alive = true;
    setLoadingSourceId(activeTabId);
    fetchStudyCommentary(chapterRef, activeTabId).then(entries => {
      if (!alive) return;
      setStudyEntries(prev => ({ ...prev, [cacheKey]: entries }));
      setLoadingSourceId(null);
    });
    return () => { alive = false; };
  }, [activeTabId, chapterRef, studyEntries]);

  // AI fallback / labelled AI Insight block — fetched only once the card is
  // expanded, and only for personas whose commentary is sourced or expanded
  // by default (the pre-B2 contract: congregation never had an AI paragraph).
  const [aiResult, setAiResult] = useState<{ text: string; model: string | null } | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const aiEligible = sourced || mode === 'expanded';
  useEffect(() => {
    setAiResult(null);
    setAiFailed(false);
    if (!chapterRef || !expanded || !aiEligible) return;
    let alive = true;
    fetchAICommentarySourced(chapterRef, lang)
      .then(r => {
        if (!alive) return;
        if (r) setAiResult(r); else setAiFailed(true);
      })
      .catch(() => { if (alive) setAiFailed(true); });
    return () => { alive = false; };
  }, [expanded, aiEligible, chapterRef, lang]);

  if (!chapterRef) return null;

  const hasSourced = tabs.length > 0;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  const activeEntries = activeTabId && activeTabId !== CURATED_ID ? studyEntries[`${chapterRef}|${activeTabId}`] : undefined;
  const activeFailed = activeTabId !== CURATED_ID && activeEntries === null;
  const activeLoading = !!activeTabId && activeTabId !== CURATED_ID && loadingSourceId === activeTabId && activeEntries === undefined;

  const activeProvenance = activeTabId === CURATED_ID
    ? `${formatProvenance({ name: t('commentary_curated_source', lang), licence: null })}, ${t('prov_curated_note', lang)}`
    : (activeTabId
      ? formatProvenance(provenanceForSource(activeTabId, sourcesMap, COMMENTARY_NAMES[activeTabId] || activeTabId, t('prov_share_alike', lang)))
      : '');

  const mutedTextStyle: CSSProperties = { color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' };
  const bodyTextStyle: CSSProperties = { color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.65, fontFamily: 'var(--font-serif-text)', cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' };

  // The active tab body — loading / failed / genuinely-empty / rendered
  // entries, each as its own block with its own verse-range label so a tap
  // only selects the entry that was tapped.
  const activeBody: ReactNode = !activeTabId ? null : activeLoading ? (
    <p style={mutedTextStyle}>{t('commentary_loading', lang)}</p>
  ) : activeTabId === CURATED_ID ? (
    curatedText ? (
      <>
        <p onClick={() => onSelectText(curatedText, chapterRef)} style={bodyTextStyle}>{curatedText}</p>
        <p data-testid="commentary-provenance" style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 6 }}>
          {activeProvenance}
        </p>
        <button
          onClick={onOpenSources}
          style={{ height: 44, background: 'transparent', border: 'none', color: 'var(--dw-accent)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: 0, textAlign: 'left' as const }}
        >
          {t('commentary_where_from', lang)}
        </button>
      </>
    ) : null
  ) : activeFailed ? (
    <p style={mutedTextStyle}>{t('commentary_fetch_failed', lang)}</p>
  ) : !activeEntries ? null : activeEntries.length === 0 ? (
    <p style={mutedTextStyle}>{t('commentary_empty', lang)}</p>
  ) : (
    <>
      {activeEntries.map((entry: StudyCommentaryEntry, i) => {
        const range = entry.verseFrom === entry.verseTo ? String(entry.verseFrom) : `${entry.verseFrom}-${entry.verseTo}`;
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
              {t('commentary_verses_label', lang).replace('{range}', range)}
            </p>
            <p onClick={() => onSelectText(entry.content, chapterRef)} style={bodyTextStyle}>{entry.content}</p>
          </div>
        );
      })}
      <p data-testid="commentary-provenance" style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 6 }}>
        {activeProvenance}
      </p>
      <button
        onClick={onOpenSources}
        style={{ height: 44, background: 'transparent', border: 'none', color: 'var(--dw-accent)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: 0, textAlign: 'left' as const }}
      >
        {t('commentary_where_from', lang)}
      </button>
    </>
  );

  // The AI block's content, computed before the wrapper so a failed / not-
  // yet-eligible AI call renders no bordered empty block at all.
  const aiBlockContent: ReactNode = offline ? (
    <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{t('commentary_offline', lang)}</p>
  ) : !hasSourced && aiFailed ? (
    <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{t('commentary_empty', lang)}</p>
  ) : hasSourced && aiFailed ? (
    <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{t('commentary_ai_failed', lang)}</p>
  ) : aiResult ? (
    <>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--dw-accent)', letterSpacing: '0.06em', fontFamily: 'var(--font-sans)', marginBottom: 8, textTransform: 'uppercase' as const }}>
        {t('commentary_ai_label', lang)}
      </p>
      {!hasSourced && (
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 8 }}>{t('commentary_ai_none', lang)}</p>
      )}
      <p
        onClick={() => onSelectText(aiResult.text, chapterRef)}
        style={bodyTextStyle}
      >
        {aiResult.text}
      </p>
      <p data-testid="commentary-ai-provenance" title={aiResult.model || undefined} style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 6 }}>
        {`${formatProvenance({ name: aiResult.model ? 'Bible AI (Claude, Anthropic)' : 'Bible AI', licence: null })}, ${t('prov_ai_author', lang)}`}
      </p>
    </>
  ) : null;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div
        onClick={() => !expanded && setExpanded(true)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: expanded ? 'default' : 'pointer', marginBottom: expanded ? 10 : 0 }}
      >
        <h2 className="text-section-header" style={{ margin: 0 }}>{t('commentary_label', lang)}</h2>
        {!expanded && (
          <span style={{ fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{t('tap_to_read', lang)}</span>
        )}
      </div>

      {expanded && (
        <>
          {tabs.length > 0 && (
            <div data-testid="commentary-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTabId(tab.id)}
                  style={tabButtonStyle(tab.id === activeTabId)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {activeBody}

          {aiBlockContent && (
            <div data-testid="commentary-ai-block" style={{ marginTop: hasSourced ? 16 : 0, paddingTop: hasSourced ? 16 : 0, borderTop: hasSourced ? '1px solid var(--dw-border-subtle)' : 'none' }}>
              {aiBlockContent}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
