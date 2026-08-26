import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { t, getLang } from '../utils/i18n';
import { API_BASE } from '../utils/api-base';
import { useModalA11y } from '../utils/useModalA11y';

interface StrongsEntry {
  word: string;
  transliteration: string;
  definition: string;
  fullDefinition: string;
  usage: string;
}

export function GreekHebrewPopup({ onGoDeeper }: { onGoDeeper: (word: string) => void }) {
  const { activePopupWord, setActivePopupWord } = useScriptureSelection();
  const lang = getLang();
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!activePopupWord) { setEntry(null); return; }
    setLoading(true);
    setExpanded(false);
    fetch(`${API_BASE}/.netlify/functions/strongs?num=${encodeURIComponent(activePopupWord.strongsNum)}&testament=${activePopupWord.testament}`)
      .then(r => r.json())
      .then(d => setEntry(d))
      .catch(() => setEntry({
        word: activePopupWord.word,
        transliteration: '',
        definition: t('definition_unavailable', getLang()),
        fullDefinition: '',
        usage: '',
      }))
      .finally(() => setLoading(false));
  }, [activePopupWord]);

  // Dialog semantics: focus in, Tab trap, Escape → close, focus restore.
  const dialogRef = useModalA11y(!!activePopupWord, () => setActivePopupWord(null));

  if (!activePopupWord) return null;

  const langLabel = activePopupWord.testament === 'NT' ? t('greek_label', lang) : t('hebrew_label', lang);
  const langColor = activePopupWord.testament === 'NT' ? 'var(--dw-info)' : 'var(--dw-gold)';

  return (
    <>
      <div
        onClick={() => setActivePopupWord(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 96,
          background: 'rgba(0,0,0,0.4)',
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dw-ghpopup-title"
        style={{
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
          aria-label={t('j_close', lang)}
          // padding 13 + top/right 3 = same visual icon spot, 44px hit area
          style={{ position: 'absolute', top: 3, right: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)', padding: 13 }}
        >
          <X size={18} />
        </button>

        {/* Language badge */}
        <span id="dw-ghpopup-title" style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 20,
          background: langColor + '20', color: langColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12,
        }}>
          {langLabel} · {activePopupWord.strongsNum}
        </span>

        {loading ? (
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14 }}>{t('looking_up', lang)}</p>
        ) : entry ? (
          <>
            {/* Original word */}
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--dw-text)', marginBottom: 4, lineHeight: 1.2 }}>
              {entry.word}
            </p>
            {entry.transliteration && (
              <p style={{ fontSize: 14, color: '#C47B2B', fontWeight: 600, marginBottom: 14, fontStyle: 'normal' }}>
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
                  {expanded ? t('show_less', lang) : t('full_definition', lang)}
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
              <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em' }}>{t('bible_ai', lang)}</span> {t('study_this_word', lang)}
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
