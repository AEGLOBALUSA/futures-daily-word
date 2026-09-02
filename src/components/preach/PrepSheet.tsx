/**
 * PrepSheet — the pastor's working page for one passage, inside the Preach
 * workspace (Phase 3, PASTOR-STUDY-PREACH-PLAN.md §4.3). One passage in two
 * translations, weighted cross-references, the six classic commentaries
 * (with an on-demand AI summary), key original-language words, places,
 * people, and matched illustrations. Every commentary entry and
 * illustration can be filed straight to the outline builder.
 *
 * Persona-gated by the caller (mounted for pastor_leader only) — this file
 * makes no persona checks of its own and touches no congregation-facing
 * storage keys.
 *
 * Licence note: the ONLY thing ever sent to the AI endpoint here is
 * commentary text from the study layer (all public-domain / CC sources,
 * see COMMENTARY_NAMES) — never the reader's translation text (which may be
 * ESV/NIV/NLT/etc, none of which may be sent to a model).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Loader2, Plus } from 'lucide-react';
import { t, getLang } from '../../utils/i18n';
import { fetchPassage } from '../../utils/api';
import type { TranslationCode } from '../../utils/api';
import { fetchStudyPassage, fetchStudyCommentary, COMMENTARY_NAMES } from '../../utils/study';
import type { StudyCommentaryEntry } from '../../utils/study';
import type { StudyPassage } from '../../utils/study';
import { useScriptureSelection } from '../../contexts/ScriptureSelectionContext';
import { API_BASE } from '../../utils/api-base';

const CROSSREF_VISIBLE = 6;
const PLACES_VISIBLE = 8;
const PEOPLE_VISIBLE = 8;
const ILLUSTRATIONS_VISIBLE = 4;
const KEY_WORDS_VISIBLE = 6;
const COMMENTARY_CHAR_BUDGET = 6000;
const ILLUSTRATION_EXCERPT = 200;

// Cached per-ref for the life of the tab — re-opening a passage during the
// same session must not re-bill the summary call.
const summaryCache = new Map<string, string>();

function getTranslation(): TranslationCode {
  try {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  } catch {
    return 'ESV';
  }
}

// ── styles (idiom copied from SermonWorkspace.tsx) ──────────────────────────
const cardStyle: CSSProperties = {
  background: 'var(--dw-card)',
  border: '1px solid var(--dw-border)',
  borderRadius: 16,
  padding: '18px 20px',
  marginBottom: 16,
};
const sectionLabelStyle: CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 10px',
};
const mutedLineStyle: CSSProperties = {
  fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5,
};
const chipButtonStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 40,
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
  borderRadius: 999, padding: '8px 14px', color: 'var(--dw-accent)',
  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
};
const mutedChipStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
  borderRadius: 999, padding: '6px 12px', color: 'var(--dw-text-muted)',
  fontSize: 12, fontFamily: 'var(--font-sans)',
};
const sectionHeaderButtonStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
  minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  color: 'var(--dw-text-primary)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
};
const addButtonStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44,
  background: 'var(--dw-accent-bg, rgba(168,85,47,0.1))', border: '1px solid var(--dw-accent)',
  borderRadius: 10, color: 'var(--dw-accent)', cursor: 'pointer', flexShrink: 0,
};
const entryLabelStyle: CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', margin: '0 0 4px',
};
const entryContentStyle: CSSProperties = {
  fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)',
  margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
};

function LoadingLine({ lang }: { lang: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Loader2 size={14} style={{ color: 'var(--dw-text-muted)', animation: 'spin 1s linear infinite' }} />
      <span style={mutedLineStyle}>{t('preach_prep_loading', lang)}</span>
    </div>
  );
}

/** Splits "[1] In the beginning... [2] The earth..." into numbered verses.
 *  Returns null when the text has no verse markers, so callers can fall
 *  back to a single flowing paragraph. */
function parseVerses(text: string): { num: number; text: string }[] | null {
  const re = /\[(\d+)\]\s*/g;
  const marks = [...text.matchAll(re)];
  if (!marks.length) return null;
  const verses: { num: number; text: string }[] = [];
  for (let i = 0; i < marks.length; i++) {
    const start = (marks[i].index ?? 0) + marks[i][0].length;
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    verses.push({ num: Number(marks[i][1]), text: text.slice(start, end).trim() });
  }
  return verses;
}

function TranslationBlock({ code, loading, text, lang }: {
  code: string; loading: boolean; text: string; lang: string;
}) {
  if (loading) return <LoadingLine lang={lang} />;
  if (!text) {
    return <p style={mutedLineStyle} data-testid={`prep-text-empty-${code}`}>{t('preach_prep_text_empty', lang)}</p>;
  }
  const verses = parseVerses(text);
  return (
    <div data-testid={`prep-text-${code}`}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>
        {code}
      </p>
      {verses ? (
        <p style={entryContentStyle}>
          {verses.map(v => (
            <span key={v.num}>
              <sup style={{ fontSize: 10, color: 'var(--dw-text-muted)', marginRight: 2 }}>{v.num}</sup>
              {v.text}{' '}
            </span>
          ))}
        </p>
      ) : (
        <p style={entryContentStyle}>{text}</p>
      )}
    </div>
  );
}

interface KeyWord { strongs: string; word: string; translit: string | null; gloss: string | null; count: number }

function topKeyWords(words: StudyPassage['words'] | undefined): KeyWord[] {
  if (!words?.length) return [];
  const byStrongs = new Map<string, KeyWord>();
  for (const w of words) {
    if (!w.strongs) continue;
    const existing = byStrongs.get(w.strongs);
    if (existing) { existing.count += 1; continue; }
    byStrongs.set(w.strongs, { strongs: w.strongs, word: w.word, translit: w.translit, gloss: w.gloss, count: 1 });
  }
  return [...byStrongs.values()].sort((a, b) => b.count - a.count).slice(0, KEY_WORDS_VISIBLE);
}

function Card({ testId, children }: { testId: string; children: ReactNode }) {
  return <div data-testid={testId} style={cardStyle}>{children}</div>;
}

export function PrepSheet({ passage, onPassageChange, onAddToOutline, lang }: {
  passage: string;
  onPassageChange: (ref: string) => void;
  onAddToOutline: (item: { ref: string; text: string }) => void;
  lang: string;
}) {
  const l = lang || getLang();
  const { setActivePopupWord } = useScriptureSelection();

  const [inputVal, setInputVal] = useState(passage);
  useEffect(() => { setInputVal(passage); }, [passage]);

  const [translation, setTranslation] = useState<TranslationCode>(getTranslation);
  useEffect(() => {
    const sync = () => setTranslation(getTranslation());
    window.addEventListener('dw-translation-changed', sync);
    return () => window.removeEventListener('dw-translation-changed', sync);
  }, []);
  const secondTranslation: TranslationCode | null = translation !== 'KJV' ? 'KJV' : null;

  const [study, setStudy] = useState<StudyPassage | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);
  const [primaryText, setPrimaryText] = useState('');
  const [primaryLoading, setPrimaryLoading] = useState(true);
  const [secondaryText, setSecondaryText] = useState('');
  const [secondaryLoading, setSecondaryLoading] = useState(!!secondTranslation);

  const [textOpen, setTextOpen] = useState(true);
  const [openCommentary, setOpenCommentary] = useState<Record<string, boolean>>({});
  const [crossRefExpanded, setCrossRefExpanded] = useState<Record<number, boolean>>({});
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  // The passage response carries a count + preview per commentary; the full
  // entries of a source arrive when it is opened (or when Summarise runs).
  const [loadedEntries, setLoadedEntries] = useState<Record<string, StudyCommentaryEntry[]>>({});
  const [loadingEntries, setLoadingEntries] = useState<Record<string, boolean>>({});

  // Passage changed: reload the study layer (best-effort — fetchStudyPassage
  // never throws, it resolves null on any failure) and any cached summary.
  useEffect(() => {
    let live = true;
    setStudyLoading(true);
    setStudy(null);
    setLoadedEntries({});
    setSummary(summaryCache.get(passage) || '');
    fetchStudyPassage(passage)
      .then(data => { if (live) setStudy(data); })
      .finally(() => { if (live) setStudyLoading(false); });
    return () => { live = false; };
  }, [passage]);

  // Reader's current translation.
  useEffect(() => {
    let live = true;
    setPrimaryLoading(true);
    setPrimaryText('');
    fetchPassage(passage, translation)
      .then(text => { if (live) setPrimaryText(text); })
      .catch(() => { /* best-effort: leave the muted empty state */ })
      .finally(() => { if (live) setPrimaryLoading(false); });
    return () => { live = false; };
  }, [passage, translation]);

  // Second translation (KJV), only when the reader isn't already on KJV.
  useEffect(() => {
    if (!secondTranslation) { setSecondaryText(''); setSecondaryLoading(false); return; }
    let live = true;
    setSecondaryLoading(true);
    setSecondaryText('');
    fetchPassage(passage, secondTranslation)
      .then(text => { if (live) setSecondaryText(text); })
      .catch(() => { /* best-effort */ })
      .finally(() => { if (live) setSecondaryLoading(false); });
    return () => { live = false; };
  }, [passage, secondTranslation]);

  const goToPassage = useCallback(() => {
    const ref = inputVal.trim();
    if (ref) onPassageChange(ref);
  }, [inputVal, onPassageChange]);

  // Commentaries in the fixed teaching order (Matthew Henry, JFB, Gill,
  // Clarke, Calvin, Keil & Delitzsch) — COMMENTARY_NAMES is already keyed in
  // that order, so we drive off it rather than the API's array order.
  const orderedCommentary = useMemo(() => {
    const bySource = new Map((study?.commentary || []).map(c => [c.sourceId, c]));
    return Object.keys(COMMENTARY_NAMES)
      .map(id => bySource.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [study]);

  /** Full entries for one source: from the passage response when it inlined
   *  them (depth=full), else fetched once per passage. */
  const entriesFor = useCallback(async (c: { sourceId: string; entries: StudyCommentaryEntry[] }): Promise<StudyCommentaryEntry[]> => {
    if (c.entries.length) return c.entries;
    const key = `${passage}|${c.sourceId}`;
    if (loadedEntries[key]) return loadedEntries[key];
    setLoadingEntries(prev => ({ ...prev, [c.sourceId]: true }));
    const entries = await fetchStudyCommentary(passage, c.sourceId);
    // Keyed by passage too: a fetch that resolves after the passage changed
    // is stored under ITS passage, never shown under the new one.
    setLoadedEntries(prev => ({ ...prev, [key]: entries }));
    setLoadingEntries(prev => ({ ...prev, [c.sourceId]: false }));
    return entries;
  }, [loadedEntries, passage]);

  const toggleCommentary = useCallback((c: { sourceId: string; entries: StudyCommentaryEntry[]; count?: number }) => {
    const opening = !openCommentary[c.sourceId];
    setOpenCommentary(prev => ({ ...prev, [c.sourceId]: opening }));
    if (opening && (c.count ?? c.entries.length) > 0) void entriesFor(c);
  }, [openCommentary, entriesFor]);

  // Only public-domain/CC commentary text ever reaches this string — never
  // the reader's translation text, which may be under a licence (ESV, NIV,
  // NLT, ...) that forbids sending it to a model.
  const commentaryText = useMemo(() => {
    let out = '';
    for (const c of orderedCommentary) {
      for (const e of (c.entries.length ? c.entries : loadedEntries[`${passage}|${c.sourceId}`] || [])) {
        if (out.length >= COMMENTARY_CHAR_BUDGET) break;
        const label = COMMENTARY_NAMES[c.sourceId] || c.sourceId;
        const verseLabel = e.verseTo !== e.verseFrom ? `${e.verseFrom}-${e.verseTo}` : String(e.verseFrom);
        out += `\n\n[${label} ${verseLabel}] ${e.content}`;
      }
    }
    return out.trim().slice(0, COMMENTARY_CHAR_BUDGET);
  }, [orderedCommentary, loadedEntries, passage]);
  const hasCommentary = orderedCommentary.some(c => (c.count ?? c.entries.length) > 0);

  const runSummary = useCallback(async () => {
    if (!hasCommentary || summarizing) return;
    const cached = summaryCache.get(passage);
    if (cached) { setSummary(cached); return; }
    setSummarizing(true);
    try {
      // Pull every source's entries first (the passage response only has previews).
      const all = await Promise.all(orderedCommentary.map(c => entriesFor(c).then(entries => ({ c, entries }))));
      let text = '';
      for (const { c, entries } of all) {
        for (const e of entries) {
          if (text.length >= COMMENTARY_CHAR_BUDGET) break;
          const label = COMMENTARY_NAMES[c.sourceId] || c.sourceId;
          const verseLabel = e.verseTo !== e.verseFrom ? `${e.verseFrom}-${e.verseTo}` : String(e.verseFrom);
          text += `\n\n[${label} ${verseLabel}] ${e.content}`;
        }
      }
      text = text.trim().slice(0, COMMENTARY_CHAR_BUDGET) || commentaryText;
      if (!text) { setSummarizing(false); return; }
      const res = await fetch(`${API_BASE}/.netlify/functions/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          system: `You are helping a pastor prepare. Summarise these public-domain commentary excerpts on ${passage} for a preacher in at most 120 words: the main interpretive lines and one disagreement if there is one. Plain prose, no headings.`,
          max_tokens: 300,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string = data?.content?.[0]?.text || '';
        if (text) { summaryCache.set(passage, text); setSummary(text); }
      }
    } catch {
      // best-effort — the button just stays available to retry
    }
    setSummarizing(false);
  }, [hasCommentary, commentaryText, orderedCommentary, entriesFor, passage, summarizing]);

  const keyWords = useMemo(() => topKeyWords(study?.words), [study]);
  const testament = study?.testament || 'NT';

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Passage picker ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') goToPassage(); }}
          placeholder={t('preach_prep_passage_ph', l)}
          data-testid="prep-passage-input"
          style={{
            flex: 1, boxSizing: 'border-box', padding: '10px 14px', minHeight: 44,
            background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
            borderRadius: 10, color: 'var(--dw-text-primary)',
            fontSize: 15, fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={goToPassage}
          aria-label={t('preach_prep_go', l)}
          data-testid="prep-go-btn"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, minHeight: 44, padding: '0 16px',
            background: 'var(--dw-accent-bg, rgba(168,85,47,0.1))', border: '1px solid var(--dw-accent)',
            borderRadius: 10, color: 'var(--dw-accent)', cursor: 'pointer',
          }}
        >
          <ArrowRight size={18} />
        </button>
      </div>
      <h2 data-testid="prep-heading" style={{
        fontSize: 22, fontWeight: 400, color: 'var(--dw-text-primary)',
        fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em', margin: '0 0 16px', lineHeight: 1.2,
      }}>
        {passage}
      </h2>

      {/* ── Passage text, two translations ── */}
      <Card testId="prep-text">
        <button
          type="button"
          onClick={() => setTextOpen(o => !o)}
          aria-expanded={textOpen}
          style={sectionHeaderButtonStyle}
        >
          <span>{t('preach_prep_text_label', l)}</span>
          {textOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {textOpen && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <TranslationBlock code={translation} loading={primaryLoading} text={primaryText} lang={l} />
            {secondTranslation && (
              <TranslationBlock code={secondTranslation} loading={secondaryLoading} text={secondaryText} lang={l} />
            )}
          </div>
        )}
      </Card>

      {/* ── Cross-references ── */}
      <Card testId="prep-crossrefs">
        <p style={sectionLabelStyle}>{t('preach_prep_crossrefs_label', l)}</p>
        {studyLoading ? (
          <LoadingLine lang={l} />
        ) : study?.crossRefs?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {study.crossRefs.map(group => {
              const expanded = !!crossRefExpanded[group.verse];
              const visible = expanded ? group.refs : group.refs.slice(0, CROSSREF_VISIBLE);
              const remaining = group.refs.length - CROSSREF_VISIBLE;
              return (
                <div key={group.verse}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 8px' }}>
                    {t('preach_prep_verse_label', l)} {group.verse}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {visible.map(r => (
                      <button
                        key={r.ref}
                        type="button"
                        onClick={() => onPassageChange(r.ref)}
                        style={chipButtonStyle}
                        data-testid="prep-crossref-chip"
                      >
                        {r.ref}
                      </button>
                    ))}
                    {!expanded && remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => setCrossRefExpanded(prev => ({ ...prev, [group.verse]: true }))}
                        style={{ ...chipButtonStyle, background: 'none', color: 'var(--dw-text-muted)' }}
                        data-testid="prep-crossref-more"
                      >
                        {t('preach_prep_more', l)} +{remaining}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={mutedLineStyle} data-testid="prep-crossrefs-empty">{t('preach_prep_crossrefs_empty', l)}</p>
        )}
      </Card>

      {/* ── Commentaries ── */}
      <Card testId="prep-commentary">
        <p style={sectionLabelStyle}>{t('preach_prep_commentary_label', l)}</p>
        <div style={{ marginBottom: 14 }}>
          {summary ? (
            <p data-testid="prep-summary-text" style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, margin: 0 }}>
              {summary}
            </p>
          ) : (
            <button
              type="button"
              onClick={runSummary}
              disabled={!hasCommentary || summarizing}
              data-testid="prep-summarise-btn"
              style={{ ...chipButtonStyle, opacity: !hasCommentary ? 0.5 : 1, cursor: !hasCommentary ? 'default' : 'pointer' }}
            >
              {summarizing && <Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />}
              {summarizing ? t('preach_prep_summarising', l) : t('preach_prep_summarise', l)}
            </button>
          )}
        </div>
        {studyLoading ? (
          <LoadingLine lang={l} />
        ) : orderedCommentary.length ? (
          <div>
            {orderedCommentary.map(c => {
              const isOpen = !!openCommentary[c.sourceId];
              return (
                <div key={c.sourceId} style={{ borderTop: '1px solid var(--dw-border)', paddingTop: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => toggleCommentary(c)}
                    aria-expanded={isOpen}
                    data-testid="prep-commentary-toggle"
                    style={sectionHeaderButtonStyle}
                  >
                    <span>{COMMENTARY_NAMES[c.sourceId] || c.sourceId}{typeof c.count === 'number' && c.count > 0 ? ` · ${c.count}` : ''}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {!isOpen && c.preview && (
                    <p style={{ ...entryContentStyle, marginTop: 6, opacity: 0.8 }} data-testid="prep-commentary-preview">{c.preview}</p>
                  )}
                  {isOpen && loadingEntries[c.sourceId] && <LoadingLine lang={l} />}
                  {isOpen && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(c.entries.length ? c.entries : loadedEntries[`${passage}|${c.sourceId}`] || []).map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={entryLabelStyle}>
                              {e.verseTo !== e.verseFrom ? `${e.verseFrom}–${e.verseTo}` : e.verseFrom}
                            </p>
                            <p style={entryContentStyle}>{e.content}</p>
                          </div>
                          <button
                            type="button"
                            aria-label={t('preach_prep_add_outline', l)}
                            onClick={() => onAddToOutline({ ref: passage, text: e.content })}
                            style={addButtonStyle}
                            data-testid="prep-commentary-add"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={mutedLineStyle} data-testid="prep-commentary-empty">{t('preach_prep_commentary_empty', l)}</p>
        )}
      </Card>

      {/* ── Key words ── */}
      <Card testId="prep-words">
        <p style={sectionLabelStyle}>{t('preach_prep_words_label', l)}</p>
        {studyLoading ? (
          <LoadingLine lang={l} />
        ) : keyWords.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {keyWords.map(w => (
              <button
                key={w.strongs}
                type="button"
                onClick={() => setActivePopupWord({ word: w.word, strongsNum: w.strongs, testament })}
                style={chipButtonStyle}
                data-testid="prep-word-chip"
              >
                <span style={{ fontWeight: 700 }}>{w.word}</span>
                {w.translit && <span style={{ opacity: 0.75, marginLeft: 4 }}>&middot; {w.translit}</span>}
                {w.gloss && <span style={{ opacity: 0.75, marginLeft: 4 }}>&mdash; {w.gloss}</span>}
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>({w.strongs})</span>
              </button>
            ))}
          </div>
        ) : (
          <p style={mutedLineStyle} data-testid="prep-words-empty">{t('preach_prep_words_empty', l)}</p>
        )}
      </Card>

      {/* ── Places & people ── */}
      <Card testId="prep-places">
        <p style={sectionLabelStyle}>{t('preach_prep_places_label', l)}</p>
        {studyLoading ? (
          <LoadingLine lang={l} />
        ) : study?.places?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }} data-testid="prep-places-chips">
            {study.places.slice(0, PLACES_VISIBLE).map(p => (
              <span key={p.id} style={mutedChipStyle}>{p.name}</span>
            ))}
          </div>
        ) : (
          <p style={{ ...mutedLineStyle, marginBottom: 16 }} data-testid="prep-places-empty">{t('preach_prep_places_empty', l)}</p>
        )}
        <p style={sectionLabelStyle}>{t('preach_prep_people_label', l)}</p>
        {studyLoading ? null : study?.people?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} data-testid="prep-people-chips">
            {study.people.slice(0, PEOPLE_VISIBLE).map(p => (
              <span key={p.id} style={mutedChipStyle}>{p.name}</span>
            ))}
          </div>
        ) : (
          <p style={mutedLineStyle} data-testid="prep-people-empty">{t('preach_prep_people_empty', l)}</p>
        )}
      </Card>

      {/* ── Illustrations ── */}
      <Card testId="prep-illustrations">
        <p style={sectionLabelStyle}>{t('preach_prep_illustrations_label', l)}</p>
        {studyLoading ? (
          <LoadingLine lang={l} />
        ) : study?.illustrations?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {study.illustrations.slice(0, ILLUSTRATIONS_VISIBLE).map(ill => {
              const excerpt = ill.body.length > ILLUSTRATION_EXCERPT
                ? ill.body.slice(0, ILLUSTRATION_EXCERPT).trimEnd() + '…'
                : ill.body;
              return (
                <div key={ill.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={entryLabelStyle}>{ill.topic}</p>
                    <p style={entryContentStyle}>{excerpt}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={t('preach_prep_add_outline', l)}
                    onClick={() => onAddToOutline({ ref: passage, text: excerpt })}
                    style={addButtonStyle}
                    data-testid="prep-illustration-add"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={mutedLineStyle} data-testid="prep-illustrations-empty">{t('preach_prep_illustrations_empty', l)}</p>
        )}
      </Card>
    </div>
  );
}

export default PrepSheet;
