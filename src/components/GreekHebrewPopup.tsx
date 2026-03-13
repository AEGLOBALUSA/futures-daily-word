import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';

interface StrongsEntry {
  word: string;
  transliteration: string;
  definition: string;
  fullDefinition: string;
  usage: string;
}

export function GreekHebrewPopup({ onGoDeeper }: { onGoDeeper: (word: string) => void }) {
  const { activePopupWord, setActivePopupWord } = useScriptureSelection();
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!activePopupWord) { setEntry(null); return; }
    setLoading(true);
    setExpanded(false);
    fetch(`/.netlify/functions/strongs?num=${encodeURIComponent(activePopupWord.strongsNum)}&testament=${activePopupWord.testament}`)
      .then(r => r.json())
      .then(d => setEntry(d))
      .catch(() => setEntry({
        word: activePopupWord.word,
        transliteration: '',
        definition: 'Definition not available',
        fullDefinition: '',
        usage: '',
      }))
      .finally(() => setLoading(false));
  }, [activePopupWord]);

  if (!activePopupWord) return null;

  const langLabel = activePopupWord.testament === 'NT' ? 'Greek' : 'Hebrew';
  const langColor = activePopupWord.testament === 'NT' ? '#4A6340' : '#9A7B2E';

  return (
    <>
      <div
        onClick={() => setActivePopupWord(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 96,
          background: 'rgba(0,0,0,0.4)',
        }}
      />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 97,
        background: 'var(--dw-canvas)',
        borderRadius: 20,
        padding: '24px 24px 20px',
        width: 'min(340px, calc(100vw - 32px))',
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        {/* Close */}
        <button
          onClick={() => setActivePopupWord(null)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)' }}
        >
          <X size={18} />
        </button>

        {/* Language badge */}
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 20,
          background: langColor + '20', color: langColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12,
        }}>
          {langLabel} · {activePopupWord.strongsNum}
        </span>

        {loading ? (
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14 }}>Looking up…</p>
        ) : entry ? (
          <>
            {/* Original word */}
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--dw-text)', marginBottom: 4, lineHeight: 1.2 }}>
              {entry.word}
            </p>
            {entry.transliteration && (
              <p style={{ fontSize: 14, color: '#C47B2B', fontWeight: 600, marginBottom: 14, fontStyle: 'italic' }}>
                {entry.transliteration}
              </p>
            )}

            {/* Short definition */}
            <p style={{ fontSize: 15, color: 'var(--dw-text)', lineHeight: 1.6, marginBottom: 12 }}>
              {entry.definition}
            </p>

            {/* Expandable full definition */}
            {entry.fullDefinition && (
              <>
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}
                >
                  {expanded ? 'Show less ↑' : 'Full definition ↓'}
                </button>
                {expanded && (
                  <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                    {entry.fullDefinition}
                  </p>
                )}
              </>
            )}

            {entry.usage && (
              <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', marginBottom: 16 }}>
                {entry.usage}
              </p>
            )}

            {/* Study this word */}
            <button
              onClick={() => { onGoDeeper(entry.word + ' (' + langLabel + ')'); setActivePopupWord(null); }}
              style={{
                width: '100%', padding: '11px', borderRadius: 12,
                background: 'linear-gradient(135deg, #7B5EA7, #9B6FBF)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Sparkles size={15} /> Study this word with AI
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
