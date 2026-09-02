import { useState, useRef } from 'react';
import { Copy, Share2, BookOpen, Languages, Sparkles, X, Check, Volume2, Pause, FolderPlus } from 'lucide-react';
import { AudioWave } from './AudioWave';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import * as AP from '../utils/audioPlayer';
import { t, getLang } from '../utils/i18n';
import { addPrepItem, isPastorPersona } from '../utils/sermonPrep';

interface HighlightToolbarProps {
  onOpenNotes: () => void;
  onGoDeeper: () => void;
  basicMode?: boolean;
  /** I'm-New study sheet: the tap already highlighted + auto-saved, so the
      sheet offers only "What this means" (plain-language AI) and Note.
      Gated on the persona — NOT basicMode, which comfort shares. */
  newPath?: boolean;
  onWhatThisMeans?: () => void;
  /** Comfort's gentle sheet: the tap saved the verse; the sheet offers only
      Note (write / pray) and close — no Copy/Listen/Share, no AI gold button,
      no Greek (persona-flow spec, 1 Sep). */
  comfortMode?: boolean;
}

export function HighlightToolbar({ onOpenNotes, onGoDeeper, basicMode = false, newPath = false, onWhatThisMeans, comfortMode = false }: HighlightToolbarProps) {
  const { selection, setSelection, greekHebrewMode, setGreekHebrewMode } = useScriptureSelection();
  const lang = getLang();
  const [copied, setCopied] = useState(false);
  const [filed, setFiled] = useState(false);
  const [listening, setListening] = useState(false);
  const listenAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!selection) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  // Pastor-only: file the selection into the sermon-prep bag (decision 5 —
  // the 1-tap capture finally has somewhere to put things).
  const handleFileToSermon = () => {
    addPrepItem(selection.verseRefs[0] || '', selection.text);
    setFiled(true);
    setTimeout(() => setFiled(false), 2000);
  };

  const handleShare = () => {
    const shareText = selection.verseRefs[0]
      ? selection.verseRefs[0] + '\n\n' + selection.text
      : selection.text;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      window.open('mailto:?body=' + encodeURIComponent(shareText));
    }
  };

  const handleListen = async () => {
    AP.unlock();
    if (listening) { AP.stop(); setListening(false); return; }
    setListening(true);
    try {
      const src = await AP.fetchAudioSrc(selection.text.slice(0, 20000), 'ESV');
      if (src) {
        await AP.playUrl('highlight-listen', src);
      } else { setListening(false); }
    } catch { setListening(false); }
  };

  const handleDismiss = () => {
    // Close the toolbar only — do NOT clearHighlights(), which would wipe
    // every highlight the user has ever made + delete every auto-saved
    // Notes entry. The X button is for dismissing the toolbar, not a nuke.
    if (listenAudioRef.current) { listenAudioRef.current.pause(); listenAudioRef.current = null; }
    setListening(false);
    setSelection(null);
  };

  const btn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 2, padding: '8px 10px',
        background: active ? 'var(--dw-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--dw-text)',
        border: 'none', cursor: 'pointer', minWidth: 44,
        borderRight: '1px solid var(--dw-border)',
        transition: 'background 0.15s',
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{label}</span>
    </button>
  );

  return (
    <>
    <style>{`
      @keyframes aiAurora {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes aiBeam {
        0%   { left: -40%; opacity: 0; }
        5%   { opacity: 1; }
        25%  { left: 140%; opacity: 0; }
        100% { left: 140%; opacity: 0; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes aiFloat {
        0%, 100% { transform: translateY(0px); }
        50%      { transform: translateY(-2px); }
      }
    `}</style>

    <div style={{
      position: 'fixed',
      bottom: 'calc(68px + env(safe-area-inset-bottom, 0px) + 8px)',
      left: 0, right: 0, zIndex: 95,
      display: 'flex', justifyContent: 'center',
      padding: '0 8px',
      animation: 'slideUp 0.22s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'var(--dw-surface)',
        borderRadius: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
        border: '1px solid var(--dw-border)',
        display: 'flex',
        overflow: 'hidden',
        maxWidth: '100%',
        pointerEvents: 'auto',
      }}>
        {/* I'm-New study sheet: one sage primary action + Note. The verse tap
            already highlighted and auto-saved, so nothing else competes. */}
        {newPath && onWhatThisMeans && (
          <button
            onClick={onWhatThisMeans}
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 5, padding: '0 14px',
              alignSelf: 'stretch',
              background: 'var(--dw-new)', color: 'var(--dw-new-on-fill)',
              border: 'none', cursor: 'pointer', minWidth: 58,
            }}
          >
            <Sparkles size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              {t('what_this_means', lang)}
            </span>
          </button>
        )}
        {newPath && btn(onOpenNotes, <BookOpen size={16} />, t('j_note', lang))}
        {!newPath && !comfortMode && btn(handleCopy,
          copied ? <Check size={16} color="var(--dw-success)" /> : <Copy size={16} />,
          copied ? t('copied_toast', lang) : t('copy_label', lang)
        )}
        {!newPath && !comfortMode && btn(handleListen, listening ? <><AudioWave bars={3} height={10} /><Pause size={14} /></> : <Volume2 size={16} />, listening ? t('pause', lang) : t('j_listen', lang), listening)}
        {!newPath && !comfortMode && btn(handleShare, <Share2 size={16} />, t('j_share', lang))}
        {!newPath && btn(onOpenNotes, <BookOpen size={16} />, t('j_note', lang))}
        {isPastorPersona() && btn(
          handleFileToSermon,
          filed ? <Check size={16} color="var(--dw-success)" /> : <FolderPlus size={16} />,
          filed ? t('filed_toast', lang) : t('file_to_sermon', lang)
        )}
        {!basicMode && btn(
          () => setGreekHebrewMode(!greekHebrewMode),
          <Languages size={16} />,
          greekHebrewMode ? t('hide_reading', lang) : t('gk_heb', lang),
          greekHebrewMode
        )}

        {/* ── Ask AI — gold rectangle (superseded by What-this-means on I'm New;
            absent from comfort's gentle sheet) ── */}
        {!newPath && !comfortMode && <button
          onClick={onGoDeeper}
          style={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center',
            gap: 4,
            padding: '0 10px',
            alignSelf: 'stretch',
            background: 'linear-gradient(110deg, #7A5200 0%, #B8820A 30%, #D4A017 60%, #F5C842 80%, #B8820A 100%)',
            backgroundSize: '220% 100%',
            animation: 'aiAurora 4s ease infinite',
            color: '#fff',
            border: 'none',
            borderLeft: '1px solid rgba(212,160,23,0.4)',
            cursor: 'pointer',
            minWidth: 58,
            borderRadius: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 0, bottom: 0, width: '30%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            animation: 'aiBeam 3.8s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <Sparkles size={14} strokeWidth={2} style={{ position: 'relative', flexShrink: 0 }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.05em',
            position: 'relative',
          }}>{t('ask_ai_label', lang)}</span>
        </button>}

        <button aria-label={t('j_close', lang)}
          onClick={handleDismiss}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 10px', background: 'transparent',
            color: 'var(--dw-text-muted)', border: 'none', cursor: 'pointer',
            minWidth: 44, // 44px hit area (row already stretches it to full height)
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
    </>
  );
}
