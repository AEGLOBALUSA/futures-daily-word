/**
 * ScripturePassage — renders a Bible passage with per-verse tap-to-highlight.
 *
 * Parses the raw passage text (which contains [N] verse markers) into
 * individual verses. Each verse is tappable → highlights just that verse
 * and fires the toolbar via ScriptureSelectionContext.
 *
 * Includes a "Select All" pill at the top for people who want the whole passage.
 */
import { useCallback, useMemo } from 'react';
import { parseVerses } from '../utils/parseVerses';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';

interface ScripturePassageProps {
  /** Raw passage text with [N] verse markers */
  text: string;
  /** Human-readable passage reference, e.g. "Genesis 37" */
  passageRef: string;
  /** Render tokens for Greek/Hebrew mode (optional, passed from parent) */
  renderScripture?: (text: string, passage: string) => React.ReactNode;
  /** Whether Greek/Hebrew mode is active */
  greekHebrewMode?: boolean;
}

export function ScripturePassage({
  text,
  passageRef,
  renderScripture,
  greekHebrewMode = false,
}: ScripturePassageProps) {
  const { selection, setSelection } = useScriptureSelection();

  const verses = useMemo(() => parseVerses(text), [text]);

  const handleVerseTap = useCallback(
    (verseNum: number, verseText: string) => {
      if (greekHebrewMode) return; // in Gk/Heb mode, word taps take priority
      const ref = verseNum > 0 ? `${passageRef}:${verseNum}` : passageRef;
      setSelection({ text: verseText, verseRefs: [ref], source: 'tap' });
    },
    [passageRef, setSelection, greekHebrewMode],
  );

  const handleSelectAll = useCallback(() => {
    // Combine all verse texts (without the [N] markers — they're already stripped)
    const fullText = verses.map(v => v.text).join(' ');
    setSelection({ text: fullText, verseRefs: [passageRef], source: 'select-all' });
  }, [verses, passageRef, setSelection]);

  // Determine if a specific verse is currently selected
  const selectedRef = selection?.verseRefs?.[0] || '';
  const isAllSelected =
    selection?.source === 'select-all' && selectedRef === passageRef;

  return (
    <div>
      {/* Select All pill — shown only when there are multiple verses */}
      {verses.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <button
            onClick={handleSelectAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: isAllSelected ? 'rgba(154,123,46,0.18)' : 'var(--dw-surface-raised, rgba(0,0,0,0.03))',
              border: '1px solid var(--dw-border)',
              borderRadius: 14,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: isAllSelected ? '#9A7B2E' : 'var(--dw-text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.03em',
              transition: 'all 0.15s ease',
            }}
          >
            Select All
          </button>
        </div>
      )}

      {/* Greek/Hebrew hint */}
      {greekHebrewMode && (
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#9A7B2E',
            marginBottom: 6,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Tap any word to explore its original meaning
        </p>
      )}

      {/* Per-verse rendering */}
      {verses.map((v) => {
        const verseRef =
          v.verse > 0 ? `${passageRef}:${v.verse}` : passageRef;
        const isSelected =
          isAllSelected || (selectedRef === verseRef && !isAllSelected);

        return (
          <p
            key={v.verse}
            onClick={() => handleVerseTap(v.verse, v.text)}
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: 'var(--dw-text-secondary)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-serif-text, Georgia, serif)',
              margin: '3px 0',
              padding: isSelected ? '2px 5px' : '2px 0',
              background: isSelected
                ? 'rgba(154,123,46,0.18)'
                : 'transparent',
              borderRadius: 4,
              cursor: greekHebrewMode ? 'default' : 'pointer',
              transition: 'background 0.15s ease',
              userSelect: 'none',
              WebkitUserSelect: 'none' as any,
            }}
          >
            {v.verse > 0 && (
              <span
                style={{
                  color: '#9A7B2E',
                  fontSize: 10,
                  fontWeight: 700,
                  marginRight: 5,
                  verticalAlign: 'super',
                  lineHeight: 1,
                }}
              >
                {v.verse}
              </span>
            )}
            {greekHebrewMode && renderScripture
              ? renderScripture(v.text, passageRef)
              : v.text}
          </p>
        );
      })}
    </div>
  );
}
