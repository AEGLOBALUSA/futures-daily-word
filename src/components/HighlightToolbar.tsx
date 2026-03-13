import { useState } from 'react';
import { Copy, Share2, BookOpen, Languages, Binoculars, X, Check, Volume2 } from 'lucide-react';
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
    } catch {
      // fallback
    }
  };

  const handleShare = () => {
    const shareText = selection.verseRefs[0]
      ? selection.verseRefs[0] + '\n\n' + selection.text
      : selection.text;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      // fallback: mailto
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

  const btn = (onClick: () => void, icon: React.ReactNode, label: string, active = false, accent = false) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3, padding: '8px 14px',
        background: active ? 'var(--dw-accent)' : accent ? '#7B5EA7' : 'transparent',
        color: active || accent ? '#fff' : 'var(--dw-text)',
        border: 'none', cursor: 'pointer', minWidth: 56,
        borderRight: '1px solid var(--dw-border)',
        transition: 'background 0.15s',
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)', left: 0, right: 0, zIndex: 95,
      display: 'flex', justifyContent: 'center', padding: '0 12px',
      pointerEvents: 'auto',
      animation: 'slideUp 0.2s ease',
    }}>
      <div style={{
        background: 'var(--dw-surface)', borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
        border: '1px solid var(--dw-border)',
        display: 'flex', overflow: 'hidden',
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
        {btn(onGoDeeper, <Binoculars size={16} />, 'Deeper', false, true)}
        <button
          onClick={handleDismiss}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 12px', background: 'transparent',
            color: 'var(--dw-text-muted)', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
