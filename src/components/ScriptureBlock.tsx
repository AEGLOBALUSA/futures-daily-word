import { useRef, useState, useCallback } from 'react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';

interface GreekToken {
  word: string;
  orig: string;
  strongs: string;
}

interface ScriptureBlockProps {
  verseKey: string;
  verseNumber: number | string;
  text: string;
  testament?: 'OT' | 'NT';
  tokens?: GreekToken[];
  onRangeStart?: (key: string) => void;
  onRangeExtend?: (key: string) => void;
  inRange?: boolean;
}

export function ScriptureBlock({
  verseKey, verseNumber, text, testament = 'NT',
  tokens, onRangeStart, onRangeExtend, inRange = false,
}: ScriptureBlockProps) {
  const { highlights, toggleHighlight, greekHebrewMode, setActivePopupWord } = useScriptureSelection();
  const isHighlighted = !!highlights[verseKey];
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  const handlePointerDown = useCallback(() => {
    setPressing(true);
    holdTimer.current = setTimeout(() => {
      try { navigator.vibrate?.(40); } catch {}
      onRangeStart?.(verseKey);
    }, 320);
  }, [verseKey, onRangeStart]);

  const handlePointerUp = useCallback(() => {
    setPressing(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const handlePointerEnter = useCallback(() => {
    if (pressing && inRange !== undefined) onRangeExtend?.(verseKey);
  }, [pressing, verseKey, onRangeExtend, inRange]);

  const handleTap = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    toggleHighlight(verseKey, text);
  }, [verseKey, text, toggleHighlight]);

  const bg = isHighlighted
    ? 'rgba(154,123,46,0.28)'
    : inRange
    ? 'rgba(74,99,64,0.22)'
    : 'transparent';

  return (
    <p
      style={{
        background: bg,
        borderRadius: 4,
        padding: isHighlighted || inRange ? '3px 5px' : '3px 0',
        margin: '4px 0',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        transition: 'background 0.15s ease',
        lineHeight: 1.75,
        fontSize: 15,
        color: 'var(--dw-text)',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onClick={handleTap}
    >
      <span style={{
        color: 'var(--dw-accent)', fontSize: 10, fontWeight: 700,
        marginRight: 5, verticalAlign: 'super', lineHeight: 1,
      }}>
        {verseNumber}
      </span>
      {greekHebrewMode && tokens && tokens.length > 0 ? (
        tokens.map((tok, i) => (
          <ruby
            key={i}
            style={{ margin: '0 1px', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopupWord({ word: tok.orig, strongsNum: tok.strongs, testament });
            }}
          >
            {tok.word}
            <rt style={{
              fontSize: 9, color: '#C47B2B', fontWeight: 600,
              letterSpacing: 0.3, lineHeight: 1.2,
            }}>
              {tok.orig}
            </rt>
          </ruby>
        ))
      ) : (
        text
      )}
    </p>
  );
}
