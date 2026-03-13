import { useState } from 'react';
import { Copy, Share2, BookOpen, Languages, Sparkles, X, Check, Volume2 } from 'lucide-react';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';

interface HighlightToolbarProps {
  onOpenNotes: () => void;
  onGoDeeper: () => void;
}

export function HighlightToolbar({ onOpenNotes, onGoDeeper }: HighlightToolbarProps) {
  const { selection, setSelection, clearHighlights, greekHebrewMode, setGreekHebrewMode } = useScriptureSelection();
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);

  if (!selection) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
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

  const handleListen = () => {
    if (!('speechSynthesis' in window)) return;
    if (listening) {
      window.speechSynthesis.cancel();
      setListening(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(selection.text.slice(0, 5000));
    utter.lang = 'en-US';
    utter.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en') && v.localService);
    if (preferred) utter.voice = preferred;
    utter.onend = () => setListening(false);
    utter.onerror = () => setListening(false);
    setListening(true);
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        const v2 = window.speechSynthesis.getVoices();
        const p2 = v2.find(v => /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en')) || v2.find(v => v.lang.startsWith('en') && v.localService);
        if (p2) utter.voice = p2;
        window.speechSynthesis.speak(utter);
      };
    } else {
      window.speechSynthesis.speak(utter);
    }
  };

  const handleDismiss = () => {
    window.speechSynthesis?.cancel();
    setListening(false);
    setSelection(null);
    clearHighlights();
  };

  const btn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3, padding: '8px 14px',
        background: active ? 'var(--dw-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--dw-text)',
        border: 'none', cursor: 'pointer', minWidth: 52,
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
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)',
      left: 0, right: 0, zIndex: 95,
      display: 'flex', justifyContent: 'center',
      padding: '0 12px',
      animation: 'slideUp 0.22s ease',
    }}>
      <div style={{
        background: 'var(--dw-surface)',
        borderRadius: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
        border: '1px solid var(--dw-border)',
        display: 'flex',
        overflow: 'hidden',
        maxWidth: '100%',
      }}>
        {btn(handleCopy,
          copied ? <Check size={16} color="#4A6340" /> : <Copy size={16} />,
          copied ? 'Copied!' : 'Copy'
        )}
        {btn(handleListen, <Volume2 size={16} />, listening ? 'Stop' : 'Listen', listening)}
        {btn(handleShare, <Share2 size={16} />, 'Share')}
        {btn(onOpenNotes, <BookOpen size={16} />, 'Note')}
        {btn(
          () => setGreekHebrewMode(!greekHebrewMode),
          <Languages size={16} />,
          greekHebrewMode ? 'Hide' : 'Gk/Heb',
          greekHebrewMode
        )}

        {/* ── Ask AI — gold rectangle ── */}
        <button
          onClick={onGoDeeper}
          style={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center',
            gap: 5,
            padding: '0 14px',
            alignSelf: 'stretch',
            background: 'linear-gradient(110deg, #7A5200 0%, #B8820A 30%, #D4A017 60%, #F5C842 80%, #B8820A 100%)',
            backgroundSize: '220% 100%',
            animation: 'aiAurora 4s ease infinite',
            color: '#fff',
            border: 'none',
            borderLeft: '1px solid rgba(212,160,23,0.4)',
            cursor: 'pointer',
            minWidth: 66,
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
          }}>Ask AI</span>
        </button>

        <button
          onClick={handleDismiss}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 10px', background: 'transparent',
            color: 'var(--dw-text-muted)', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
    </>
  );
}
