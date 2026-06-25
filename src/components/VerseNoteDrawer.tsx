import { useState, useRef, useEffect } from 'react';
import { X, Check, BookOpen, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { COMMENTARY } from '../data/commentary';
import { trackBehavior } from '../utils/behavior';
import { fetchAICommentary } from '../utils/api';
import { t, getLang } from '../utils/i18n';

interface VerseNoteDrawerProps {
  open: boolean;
  onClose: () => void;
  planContext?: string; // e.g. "Grace and Favor Revolution — Day 7"
}

const JOURNAL_KEY = 'dw_journal';

// Mirror of the helper in ScriptureSelectionContext — same function so IDs match.
// Used so a user writing a note on an already-highlighted verse upgrades the
// existing auto-saved entry instead of creating a duplicate.
function autoEntryId(verseKey: string, text: string): string {
  const stamp = verseKey + '::' + text.slice(0, 40);
  return 'hl_' + btoa(unescape(encodeURIComponent(stamp))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
}

interface SaveToJournalArgs {
  verseRef: string;
  highlightedText: string;
  note: string;
  planContext?: string;
  commentarySource?: string;   // Fix 3: which commentary source they were reading
  commentaryExcerpt?: string;  // Fix 3: the passage text captured with the note
}

function saveToJournal({ verseRef, highlightedText, note, planContext, commentarySource, commentaryExcerpt }: SaveToJournalArgs) {
  try {
    const existing = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    const autoId = autoEntryId(verseRef, highlightedText);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const updatedAt = now.toISOString();

    // If there's already an auto-saved entry for this highlight, upgrade it in place.
    const autoIdx = existing.findIndex((e: { id?: string }) => e.id === autoId);
    const baseTags = planContext ? ['scripture', 'plan-note'] : ['scripture'];
    if (commentarySource) baseTags.push('commentary');

    if (autoIdx !== -1) {
      existing[autoIdx] = {
        ...existing[autoIdx],
        title: verseRef || existing[autoIdx].title || 'Scripture Note',
        body: note,
        tags: Array.from(new Set([...(existing[autoIdx].tags || []), ...baseTags])),
        verseRef,
        highlightedText,
        planContext,
        commentarySource,
        commentaryExcerpt,
        autoSaved: false,  // user wrote a note — no longer pure auto-save
        deleted: false,    // writing a note revives a previously-deleted entry
        updatedAt,
      };
    } else {
      existing.unshift({
        id: Date.now().toString(),
        date: dateStr,
        type: 'saved',
        title: verseRef || 'Scripture Note',
        body: note,
        tags: baseTags,
        verseRef,
        highlightedText,
        planContext,
        commentarySource,
        commentaryExcerpt,
        autoSaved: false,
        updatedAt,
      });
    }
    // Raised from 500 to 5000 to match the cloud cap — avoid silently dropping a pastor's old notes.
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(existing.slice(0, 5000)));
    // Notify JournalScreen to refresh its entries
    window.dispatchEvent(new Event('dw-journal-updated'));
  } catch {}
}

/** Strip verse numbers so "John 3:16-21" → "John 3" for commentary lookup */
function normalizeRef(ref: string): string {
  return ref.replace(/:\d+(-\d+)?$/, '').trim();
}

/** All commentary sources available for this passage */
function getCommentariesForRef(ref: string): { source: string; text: string }[] {
  const key = normalizeRef(ref);
  const sources = COMMENTARY as Record<string, Record<string, string>>;
  const results: { source: string; text: string }[] = [];
  for (const [source, entries] of Object.entries(sources)) {
    if (entries[key]) results.push({ source, text: entries[key] });
  }
  return results;
}

// Source display order preference
const SOURCE_ORDER = ["Matthew Henry", "Thayer's", "Spurgeon", "Wesley", "A.W. Tozer", "Wigglesworth", "Teachers (Structure)", "Teachers (Application)"];

function sortSources(commentaries: { source: string; text: string }[]) {
  return [...commentaries].sort((a, b) => {
    const ai = SOURCE_ORDER.indexOf(a.source);
    const bi = SOURCE_ORDER.indexOf(b.source);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function VerseNoteDrawer({ open, onClose, planContext }: VerseNoteDrawerProps) {
  const { selection } = useScriptureSelection();
  const lang = getLang();
  const [tab, setTab] = useState<'note' | 'commentary'>('note');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI commentary fallback — used when the curated set has no entry for this passage.
  const [aiCommentary, setAiCommentary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  const passage = selection?.verseRefs[0] || '';
  const commentaries = passage ? sortSources(getCommentariesForRef(passage)) : [];
  const hasCommentary = commentaries.length > 0;

  useEffect(() => {
    if (open) {
      setSaved(false);
      setNote('');
      setTab('note');
      setSelectedSourceIdx(0);
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [open]);

  // Reset source idx + AI state when passage changes
  useEffect(() => {
    setSelectedSourceIdx(0);
    setAiCommentary('');
    setAiError(false);
    setAiLoading(false);
  }, [passage]);

  // When the Commentary tab is open for a passage with no curated commentary,
  // generate one with AI instead of dead-ending on the empty state.
  useEffect(() => {
    if (tab !== 'commentary' || hasCommentary || !passage) return;
    if (aiCommentary || aiLoading || aiError) return;
    let cancelled = false;
    setAiLoading(true);
    trackBehavior('greek_hebrew', `ai-commentary:${passage}`);
    fetchAICommentary(normalizeRef(passage), lang)
      .then(text => { if (!cancelled) { setAiCommentary(text); setAiLoading(false); } })
      .catch(() => { if (!cancelled) { setAiError(true); setAiLoading(false); } });
    return () => { cancelled = true; };
  }, [tab, hasCommentary, passage, aiCommentary, aiLoading, aiError, lang]);

  const handleSave = () => {
    if (!selection || !note.trim()) return;
    const ref = selection.verseRefs[0] || '';
    trackBehavior('note_created', ref);
    // Fix 3: if the user was reading commentary while writing the note, capture that context too.
    const activeCommentary = commentaries[selectedSourceIdx];
    let commentarySource: string | undefined;
    let commentaryExcerpt: string | undefined;
    if (activeCommentary) {
      commentarySource = activeCommentary.source;
      commentaryExcerpt = activeCommentary.text;
    } else if (aiCommentary) {
      commentarySource = 'AI Insight';
      commentaryExcerpt = aiCommentary;
    }
    saveToJournal({
      verseRef: ref,
      highlightedText: selection.text,
      note,
      planContext,
      commentarySource,
      commentaryExcerpt,
    });
    setSaved(true);
    setTimeout(() => {
      onClose();
      setSaved(false);
    }, 1800);
  };

  const handleCommentaryTab = () => {
    if (passage) trackBehavior('greek_hebrew', `commentary:${passage}`);
    setTab('commentary');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 96,
          background: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: open ? 0 : '-100%',
        zIndex: 97,
        background: 'var(--dw-canvas)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        transition: 'bottom 0.3s cubic-bezier(0.32,0.72,0,1)',
        maxHeight: '82vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--dw-border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 20px 10px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {passage && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)',
              }}>
                {passage}
              </span>
            )}
            {planContext && (
              <span style={{ fontSize: 10, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {planContext}
              </span>
            )}
          </div>
          <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab selector */}
        <div style={{
          display: 'flex', margin: '0 20px 12px',
          background: 'var(--dw-surface)', borderRadius: 10, padding: 3, gap: 2,
        }}>
          <button
            onClick={() => setTab('note')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
              background: tab === 'note' ? 'var(--dw-canvas)' : 'transparent',
              color: tab === 'note' ? 'var(--dw-text)' : 'var(--dw-text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: tab === 'note' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <MessageSquare size={13} /> Note
          </button>
          <button
            onClick={handleCommentaryTab}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
              background: tab === 'commentary' ? 'var(--dw-canvas)' : 'transparent',
              color: tab === 'commentary' ? 'var(--dw-text)' : 'var(--dw-text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: tab === 'commentary' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <BookOpen size={13} />
            Commentary
            {hasCommentary && (
              <span style={{
                fontSize: 9, fontWeight: 800, background: 'var(--dw-accent)',
                color: '#fff', borderRadius: 999, padding: '1px 5px',
                fontFamily: 'var(--font-sans)',
              }}>
                {commentaries.length}
              </span>
            )}
          </button>
        </div>

        {/* ── NOTE TAB ── */}
        {tab === 'note' && (
          <>
            {/* Highlighted passage quote */}
            {selection && (
              <div style={{
                margin: '0 20px 12px',
                padding: '10px 14px',
                background: 'rgba(154,123,46,0.10)',
                borderLeft: '3px solid var(--dw-accent)',
                borderRadius: '0 8px 8px 0',
              }}>
                {selection.verseRefs[0] && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {selection.verseRefs[0]}
                  </p>
                )}
                <p style={{ fontSize: 13, color: 'var(--dw-text)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '…' : ''}"
                </p>
              </div>
            )}

            {/* Note input */}
            <textarea
              ref={textareaRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('write_reflection_placeholder', lang)}
              style={{
                margin: '0 20px',
                padding: '12px',
                borderRadius: 12,
                border: '1.5px solid var(--dw-border)',
                background: 'var(--dw-card)',
                color: 'var(--dw-text)',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'none',
                minHeight: 120,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            {/* Save button */}
            <div style={{ padding: '14px 20px' }}>
              <button
                onClick={handleSave}
                disabled={!note.trim() || saved}
                style={{
                  width: '100%', padding: '13px', borderRadius: 14,
                  background: saved ? 'var(--dw-success)' : 'var(--dw-accent)',
                  color: '#fff', border: 'none', cursor: note.trim() ? 'pointer' : 'default',
                  fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  opacity: !note.trim() && !saved ? 0.5 : 1,
                  transition: 'background 0.2s',
                }}
              >
                {saved ? <><Check size={16} /> {t('saved_to_notes', lang)}</> : t('save_to_notes_btn', lang)}
              </button>
            </div>
          </>
        )}

        {/* ── COMMENTARY TAB ── */}
        {tab === 'commentary' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {!hasCommentary ? (
              // No curated commentary → AI-generated fallback (loading / result / error)
              <div style={{ padding: '4px 20px 24px' }}>
                {aiLoading ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <Loader2 size={26} style={{ color: 'var(--dw-gold)', marginBottom: 10, animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                      Drawing insight from {normalizeRef(passage) || 'this passage'}…
                    </p>
                  </div>
                ) : aiCommentary ? (
                  <>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--dw-gold)',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontFamily: 'var(--font-sans)', marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Sparkles size={11} /> AI Insight
                    </p>
                    <div style={{
                      background: 'var(--dw-card)',
                      border: '1px solid var(--dw-border)',
                      borderLeft: '3px solid var(--dw-gold)',
                      borderRadius: '0 12px 12px 0',
                      padding: '14px 16px',
                    }}>
                      <p style={{
                        fontSize: 14, lineHeight: 1.75,
                        color: 'var(--dw-text-secondary)',
                        fontFamily: 'var(--font-serif)',
                        margin: 0, whiteSpace: 'pre-line',
                        WebkitUserSelect: 'text', userSelect: 'text',
                      }}>
                        {aiCommentary}
                      </p>
                    </div>
                    <p style={{
                      fontSize: 11, color: 'var(--dw-text-faint)',
                      fontFamily: 'var(--font-sans)', marginTop: 10, textAlign: 'right',
                    }}>
                      {normalizeRef(passage)} · AI-generated, review with Scripture
                    </p>
                  </>
                ) : (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <BookOpen size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                      Couldn't load commentary for {normalizeRef(passage) || 'this passage'} right now
                    </p>
                    <button
                      onClick={() => { setAiError(false); }}
                      style={{
                        marginTop: 12, padding: '8px 16px', borderRadius: 10,
                        background: 'var(--dw-gold)', color: '#fff', border: 'none',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Source tabs */}
                {commentaries.length > 1 && (
                  <div style={{
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                    padding: '0 20px 12px',
                  }}>
                    {commentaries.map((c, i) => (
                      <button
                        key={c.source}
                        onClick={() => setSelectedSourceIdx(i)}
                        style={{
                          padding: '5px 12px', borderRadius: 20,
                          border: '1px solid',
                          borderColor: i === selectedSourceIdx ? 'var(--dw-accent)' : 'var(--dw-border)',
                          background: i === selectedSourceIdx ? 'var(--dw-accent)' : 'transparent',
                          color: i === selectedSourceIdx ? '#fff' : 'var(--dw-text-muted)',
                          fontSize: 11, fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          letterSpacing: '0.02em',
                          transition: 'all 0.14s',
                        }}
                      >
                        {c.source}
                      </button>
                    ))}
                  </div>
                )}

                {/* Commentary text */}
                {commentaries[selectedSourceIdx] && (
                  <div style={{ padding: '0 20px 24px' }}>
                    {/* Source label (shown when only one source) */}
                    {commentaries.length === 1 && (
                      <p style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--dw-accent)',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: 'var(--font-sans)', marginBottom: 10,
                      }}>
                        {commentaries[0].source}
                      </p>
                    )}

                    <div style={{
                      background: 'var(--dw-card)',
                      border: '1px solid var(--dw-border)',
                      borderLeft: '3px solid var(--dw-accent)',
                      borderRadius: '0 12px 12px 0',
                      padding: '14px 16px',
                    }}>
                      <p style={{
                        fontSize: 14, lineHeight: 1.75,
                        color: 'var(--dw-text-secondary)',
                        fontFamily: 'var(--font-serif)',
                        margin: 0,
                        WebkitUserSelect: 'text', userSelect: 'text',
                      }}>
                        {commentaries[selectedSourceIdx].text}
                      </p>
                    </div>

                    {/* Passage being referenced */}
                    <p style={{
                      fontSize: 11, color: 'var(--dw-text-faint)',
                      fontFamily: 'var(--font-sans)', marginTop: 10, textAlign: 'right',
                    }}>
                      {normalizeRef(passage)} · {commentaries[selectedSourceIdx].source}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
