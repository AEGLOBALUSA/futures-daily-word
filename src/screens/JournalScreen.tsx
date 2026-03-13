import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { Plus, PenLine, Bookmark, Trash2, X, Save, BookOpen, Video, Circle, Square, Share2, RotateCcw, CheckCircle2, Loader2, Sparkles, Copy, Volume2, Check } from 'lucide-react';
import { fetchPassage } from '../utils/api';
import type { TranslationCode } from '../utils/api';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
  type: 'journal' | 'sermon' | 'saved';
  /** Set when this entry was created from a scripture note */
  verseRef?: string;
  highlightedText?: string;
}

/* ── localStorage helpers ── */
function getEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem('dw_journal') || '[]');
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem('dw_journal', JSON.stringify(entries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Video Recorder Modal ── */
function VideoRecorderModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'preview' | 'recording' | 'playback'>('preview');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera preview
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(err => {
        if (!active) return;
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera & mic permissions and try again.');
        } else {
          setError('Could not access camera: ' + err.message);
        }
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setPhase('playback');
      // Show recorded video in preview element
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = url;
          previewRef.current.load();
        }
      }, 100);
    };
    mr.start(250);
    setElapsed(0);
    setPhase('recording');
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const retake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setPhase('preview');
    // Restart camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {});
  };

  const shareVideo = async () => {
    if (!recordedBlob || !recordedUrl) return;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([recordedBlob], `my-reflection.${ext}`, { type: recordedBlob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Reflection', text: 'Shared from Futures Daily Word' });
      } catch { /* cancelled */ }
    } else {
      // Fallback: trigger download
      const a = document.createElement('a');
      a.href = recordedUrl;
      a.download = `my-reflection.${ext}`;
      a.click();
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(0,0,0,0.7)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 0,
        zIndex: 601,
        display: 'flex', flexDirection: 'column',
        background: '#0a0a0a',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          paddingTop: 'calc(16px + var(--safe-top, 0px))',
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {phase === 'recording' ? `Recording ${fmtTime(elapsed)}` : phase === 'playback' ? 'Preview' : 'Record Yourself'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 999, padding: 8, color: '#fff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
              <p style={{ color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 1.6 }}>{error}</p>
              <button
                onClick={onClose}
                style={{ marginTop: 20, background: 'var(--dw-accent)', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Live preview (shown during preview + recording) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: phase === 'playback' ? 'none' : 'block',
                  transform: 'scaleX(-1)', // mirror front camera
                }}
              />
              {/* Playback video */}
              <video
                ref={previewRef}
                controls
                playsInline
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  display: phase === 'playback' ? 'block' : 'none',
                  background: '#000',
                }}
              />
              {/* Recording indicator */}
              {phase === 'recording' && (
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: '4px 12px',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30', animation: 'recBlink 1s ease infinite' }} />
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{fmtTime(elapsed)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div style={{
            padding: '24px 20px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}>
            {phase === 'preview' && (
              <button
                onClick={startRecording}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#ff3b30',
                  border: '4px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 0 0 6px rgba(255,59,48,0.2)',
                }}
              >
                <Circle size={28} fill="#fff" color="#fff" />
              </button>
            )}
            {phase === 'recording' && (
              <button
                onClick={stopRecording}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#ff3b30',
                  border: '4px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 0 0 6px rgba(255,59,48,0.2)',
                  animation: 'recPulse 1.5s ease infinite',
                }}
              >
                <Square size={24} fill="#fff" color="#fff" />
              </button>
            )}
            {phase === 'playback' && (
              <>
                <button
                  onClick={retake}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 999,
                    padding: '12px 20px', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600,
                  }}
                >
                  <RotateCcw size={18} /> Retake
                </button>
                <button
                  onClick={shareVideo}
                  style={{
                    background: 'var(--dw-accent)', border: 'none', borderRadius: 999,
                    padding: '12px 28px', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(154,123,46,0.4)',
                  }}
                >
                  <Share2 size={18} /> Share
                </button>
              </>
            )}
          </div>
        )}

        <style>{`
          @keyframes recBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
          @keyframes recPulse {
            0%, 100% { box-shadow: 0 0 0 6px rgba(255,59,48,0.2); }
            50% { box-shadow: 0 0 0 12px rgba(255,59,48,0.1); }
          }
        `}</style>
      </div>
    </>
  );
}

// ── Daily reflection prompts (30, rotate by day of year) ────────
const JOURNAL_PROMPTS = [
  'What is one thing God is saying to you through today\'s passage?',
  'Where do you need God\'s peace the most right now?',
  'What promise from today\'s reading can you hold onto this week?',
  'Is there someone you need to forgive? Write it out honestly.',
  'What does today\'s scripture reveal about God\'s character?',
  'Where have you seen God at work in your life this week?',
  'What is one thing you are deeply grateful for today?',
  'What fear or worry can you give to God right now?',
  'How does today\'s passage speak to something you\'re currently facing?',
  'Write a short prayer in your own words for someone who needs it.',
  'What is one way you can act on what you read today?',
  'Where do you feel far from God right now? Be honest.',
  'What does "loving your neighbour" look like for you this week?',
  'Is there an area of your life you\'ve been holding back from God?',
  'What would change if you truly believed today\'s verse?',
  'Write about a time you experienced God\'s faithfulness.',
  'What habit or pattern do you feel God is inviting you to break?',
  'Who has God placed in your life right now who needs encouragement?',
  'What does rest look like for you — and are you taking it?',
  'Write one thing you want to remember from this week\'s reading.',
  'How would you describe your faith right now — honest, not polished?',
  'What question do you want to ask God today?',
  'What does surrender look like in the area you\'re struggling with?',
  'Write about a door God has opened (or closed) in your life recently.',
  'What does today\'s reading reveal about who you are in Christ?',
  'Is there something you need to confess? This is a safe place.',
  'What would you tell someone who just started following Jesus?',
  'Where is God asking you to trust Him without seeing the outcome?',
  'Write a sentence about what hope means to you today.',
  'What is one thing you want to carry with you from today\'s Word?',
];

function getDailyJournalPrompt() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
}

/* ── Today's Study Panel ─────────────────────────────────────── */
interface Devotional { title: string; author: string; body: string; }

interface TodayPassage {
  ref: string;
  planTitle: string | null;
  dayNum: number | null;
  devotional?: Devotional;
  isBookChapter?: boolean;
}

/** Strip :verse suffix so we always fetch the full chapter for context */
function expandToChapter(ref: string): string {
  // "2 Timothy 1:7" → "2 Timothy 1"   |   "John 3:16-21" → "John 3"
  return ref.replace(/:\d+(-\d+)?$/, '').trim();
}

function getTodaysPassages(): TodayPassage[] {
  try {
    const plan: Array<{ passage: string; planTitle: string; dayNum: number; devotional?: Devotional }> =
      JSON.parse(localStorage.getItem('dw_todays_plan_passages') || '[]');
    const slots: Array<{ book: string; currentChapter: number }> =
      JSON.parse(localStorage.getItem('dw_reading_slots') || '[]');
    const out: TodayPassage[] = [
      ...plan.map(p => ({ ref: p.passage, planTitle: p.planTitle, dayNum: p.dayNum, devotional: p.devotional })),
      ...slots.map(s => ({ ref: `${s.book} ${s.currentChapter}`, planTitle: null, dayNum: null })),
    ];

    // Also include any active book reading plans
    const bookPlans: Record<string, { title: string; author: string; currentChapter: number; totalChapters: number }> =
      JSON.parse(localStorage.getItem('dw_book_plans') || '{}');
    for (const [bookId, bp] of Object.entries(bookPlans)) {
      try {
        const today = JSON.parse(localStorage.getItem(`dw_book_today_${bookId}`) || 'null');
        if (!today) continue;
        out.push({
          ref: `book:${bookId}`,
          planTitle: bp.title,
          dayNum: bp.currentChapter + 1,
          isBookChapter: true,
          devotional: {
            title: today.title,
            author: bp.author,
            body: (today.paragraphs as string[]).join('\n\n'),
          },
        });
      } catch {}
    }

    return out.filter((p, i, arr) => arr.findIndex(x => x.ref === p.ref) === i);
  } catch { return []; }
}

/* ── In-modal text selection toolbar ── */
function ModalSelectionBar({
  containerRef,
  onNoteSelected,
  onAskAI,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onNoteSelected: (text: string) => void;
  onAskAI: (text: string) => void;
}) {
  const [selectedText, setSelectedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelectedText('');
        return;
      }
      // Only show toolbar if selection is inside our modal container
      const range = sel.getRangeAt(0);
      if (containerRef.current && containerRef.current.contains(range.commonAncestorContainer)) {
        setSelectedText(sel.toString().trim());
      } else {
        setSelectedText('');
      }
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [containerRef]);

  if (!selectedText) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = selectedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: selectedText }).catch(() => {});
    } else {
      window.open('mailto:?body=' + encodeURIComponent(selectedText));
    }
  };

  const handleListen = () => {
    if (!('speechSynthesis' in window)) return;
    if (listening) { window.speechSynthesis.cancel(); setListening(false); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(selectedText.slice(0, 5000));
    utter.lang = 'en-US'; utter.rate = 0.92;
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
        window.speechSynthesis.speak(utter);
      };
    } else { window.speechSynthesis.speak(utter); }
  };

  const dismiss = () => { window.getSelection()?.removeAllRanges(); setSelectedText(''); window.speechSynthesis?.cancel(); setListening(false); };

  const tbBtn = (onClick: () => void, icon: React.ReactNode, label: string, active = false) => (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, padding: '7px 13px',
      background: active ? 'var(--dw-accent)' : 'transparent',
      color: active ? '#fff' : 'var(--dw-text)',
      border: 'none', cursor: 'pointer', minWidth: 48,
      borderRight: '1px solid var(--dw-border)',
      transition: 'background 0.15s',
    }}>
      {icon}
      <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 0, right: 0, zIndex: 210,
      display: 'flex', justifyContent: 'center', padding: '0 12px',
      animation: 'slideInBar 0.2s ease',
    }}>
      <div style={{
        background: 'var(--dw-surface)', borderRadius: 10,
        boxShadow: '0 4px 28px rgba(0,0,0,0.28)', border: '1px solid var(--dw-border)',
        display: 'flex', overflow: 'hidden', maxWidth: '100%',
      }}>
        {tbBtn(handleCopy, copied ? <Check size={15} color="#4A6340" /> : <Copy size={15} />, copied ? 'Copied!' : 'Copy')}
        {tbBtn(handleListen, <Volume2 size={15} />, listening ? 'Stop' : 'Listen', listening)}
        {tbBtn(handleShare, <Share2 size={15} />, 'Share')}
        {tbBtn(() => { onNoteSelected(selectedText); dismiss(); }, <BookOpen size={15} />, 'Note')}

        {/* Ask AI — burnished gold */}
        <button
          onClick={() => { onAskAI(selectedText); dismiss(); }}
          style={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '0 14px', alignSelf: 'stretch',
            background: 'linear-gradient(110deg, #7A5200 0%, #B8820A 30%, #D4A017 60%, #F5C842 80%, #B8820A 100%)',
            backgroundSize: '220% 100%', animation: 'aiAurora 4s ease infinite',
            color: '#fff', border: 'none', borderLeft: '1px solid rgba(212,160,23,0.4)',
            cursor: 'pointer', minWidth: 66, borderRadius: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 0, bottom: 0, width: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'aiBeam 3.8s ease-in-out infinite', pointerEvents: 'none',
          }} />
          <Sparkles size={13} strokeWidth={2} style={{ position: 'relative', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', position: 'relative' }}>Ask AI</span>
        </button>

        <button onClick={dismiss} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 10px', background: 'transparent', color: 'var(--dw-text-muted)', border: 'none', cursor: 'pointer',
        }}>
          <X size={13} />
        </button>
      </div>
      <style>{`
        @keyframes slideInBar { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aiAurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes aiBeam { 0% { left: -40%; opacity: 0; } 5% { opacity: 1; } 25% { left: 140%; opacity: 0; } 100% { left: 140%; opacity: 0; } }
      `}</style>
    </div>
  );
}

/* ── Reflection questions ── */
function getReflectionQuestions(title: string, isBookChapter?: boolean): string[] {
  // Derive a topic-anchored opening question from the title
  const topic = title.replace(/^(Day \d+:|Chapter \d+:)\s*/i, '').replace(/["'"]/g, '').trim();
  const short = topic.length > 60 ? topic.slice(0, 57) + '…' : topic;

  const q1 = isBookChapter
    ? `Which sentence from "${short}" are you still thinking about — and what does it stir in you?`
    : `What one line from today's devotional about "${short}" hit you hardest, and why?`;

  const q2 = `Where in your life right now does this truth most need to land? Be specific — what situation, relationship, or season are you bringing this into?`;

  const q3 = `What's one concrete thing you'll do differently this week because of what you just read? Not a feeling — an action.`;

  return [q1, q2, q3];
}

/* ── Scripture Study Modal ── */
function ScriptureModal({
  passage,
  planTitle,
  dayNum,
  devotional,
  isBookChapter,
  existingNote,
  onSave,
  onClose,
}: {
  passage: string;
  planTitle: string | null;
  dayNum: number | null;
  devotional?: Devotional;
  isBookChapter?: boolean;
  existingNote: JournalEntry | undefined;
  onSave: (entry: JournalEntry) => void;
  onClose: () => void;
}) {
  const translation: TranslationCode =
    (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const { setSelection } = useScriptureSelection();

  // Expand single-verse refs to whole chapter for study context
  const chapterRef = expandToChapter(passage);

  const [scriptureText, setScriptureText] = useState('');
  const [loadingText, setLoadingText] = useState(true);
  const [draftNote, setDraftNote] = useState(existingNote?.body || '');
  const [noteSaved, setNoteSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBookChapter) { setLoadingText(false); return; }
    setLoadingText(true);
    fetchPassage(chapterRef, translation)
      .then(text => setScriptureText(text))
      .catch(() => setScriptureText(''))
      .finally(() => setLoadingText(false));
  }, [chapterRef, translation, isBookChapter]);

  function handleSave() {
    if (!draftNote.trim()) return;
    const entry: JournalEntry = existingNote
      ? { ...existingNote, body: draftNote }
      : {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          date: today,
          title: devotional?.title || passage,
          body: draftNote,
          tags: ['study'],
          type: 'journal',
          verseRef: passage,
        };
    onSave(entry);
    setNoteSaved(true);
    setTimeout(() => { setNoteSaved(false); onClose(); }, 1200);
  }

  function handleAskAI(text?: string) {
    const context = text
      ? text
      : devotional
        ? `${devotional.title} — ${passage}\n\n${devotional.body.slice(0, 300)}…`
        : `${passage}: ${scriptureText.slice(0, 300)}`;
    setSelection({ text: context, verseRefs: [passage], source: 'range' });
    onClose();
  }

  function handleNoteSelected(text: string) {
    // Append selected text as a quote into the notes area
    const quote = `"${text}"\n\n`;
    setDraftNote(prev => prev ? prev + '\n\n' + quote : quote);
    // Scroll to + focus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTo({ top: scrollBodyRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  }

  const authorColor = (author: string) =>
    author === 'Ashley' ? '#9A6A08' : author === 'Jane' ? '#4A5568' : '#6B5C3E';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />

      {/* Modal panel — full study sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '94vh',
        background: 'var(--dw-canvas, #FAFAF8)',
        borderRadius: '22px 22px 0 0',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 -8px 48px rgba(0,0,0,0.28)',
      }}>

        {/* ── Drag handle + header ── */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--dw-border)' }} />
          </div>
          <div style={{
            padding: '8px 18px 14px',
            borderBottom: '1px solid var(--dw-border)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              {planTitle && (
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', marginBottom: 3,
                }}>
                  {planTitle}{dayNum ? ` · Chapter ${dayNum}` : ''}
                </p>
              )}
              <p style={{
                fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-serif)',
                color: 'var(--dw-text-primary)', margin: 0, letterSpacing: '-0.01em',
              }}>
                {isBookChapter ? (devotional?.title || planTitle || 'Reading') : (chapterRef !== passage ? `${chapterRef}` : passage)}
              </p>
              {!isBookChapter && chapterRef !== passage && (
                <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 1 }}>
                  Key verse: {passage} · showing full chapter · {translation}
                </p>
              )}
              {!isBookChapter && chapterRef === passage && (
                <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 1 }}>
                  {translation}
                </p>
              )}
            </div>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 4px 8px', color: 'var(--dw-text-muted)', marginTop: 2 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── In-modal selection toolbar ── */}
        <ModalSelectionBar
          containerRef={scrollBodyRef}
          onNoteSelected={handleNoteSelected}
          onAskAI={handleAskAI}
        />

        {/* ── Scrollable study content ── */}
        <div ref={scrollBodyRef} style={{ flex: 1, overflowY: 'auto' }}>

          {/* SECTION 1: Devotional (if present) */}
          {devotional && (
            <div style={{
              margin: '20px 18px 0',
              borderRadius: 16,
              background: 'var(--dw-card)',
              border: '1px solid var(--dw-border)',
              borderLeft: '4px solid',
              borderLeftColor: authorColor(devotional.author),
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0,
                  }}>
                    {isBookChapter ? 'Reading' : "Today's Devotional"}
                  </p>
                  <button
                    onClick={() => {
                      if (!scrollBodyRef.current) return;
                      const range = document.createRange();
                      range.selectNodeContents(scrollBodyRef.current);
                      const sel = window.getSelection();
                      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
                    }}
                    style={{
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, color: 'var(--dw-accent)',
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.03em',
                    }}
                  >
                    Select All
                  </button>
                </div>
                <p style={{
                  fontSize: 19, fontWeight: 500, fontFamily: 'var(--font-serif)',
                  color: 'var(--dw-text-primary)', lineHeight: 1.3, marginBottom: 10,
                }}>
                  {devotional.title}
                </p>
                <span style={{
                  display: 'inline-block',
                  background: authorColor(devotional.author) + '18',
                  color: authorColor(devotional.author),
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '3px 10px', borderRadius: 999,
                  fontFamily: 'var(--font-sans)',
                  marginBottom: 14,
                }}>
                  {devotional.author}
                </span>
              </div>
              <div style={{ padding: '0 18px 18px' }}>
                {devotional.body.split('\n\n').map((para, i) => (
                  <p key={i} style={{
                    fontSize: 15, lineHeight: 1.82, fontFamily: 'var(--font-serif)',
                    color: 'var(--dw-text-secondary)', marginBottom: i < devotional.body.split('\n\n').length - 1 ? 14 : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 1b: Reflection questions — shown whenever there's devotional content */}
          {devotional && (() => {
            const questions = getReflectionQuestions(devotional.title, isBookChapter);
            return (
              <div style={{ margin: '14px 18px 0' }}>
                <div style={{
                  borderRadius: 16,
                  background: 'var(--dw-card)',
                  border: '1px solid var(--dw-border)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--dw-border)' }}>
                    <p style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0,
                    }}>
                      Reflect &amp; Respond
                    </p>
                  </div>
                  <div style={{ padding: '4px 0 8px' }}>
                    {questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleNoteSelected(`Q${i + 1}: ${q}`)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          width: '100%', textAlign: 'left',
                          padding: '13px 18px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          borderBottom: i < questions.length - 1 ? '1px solid var(--dw-border)' : 'none',
                          transition: 'background 0.13s',
                        }}
                        onPointerDown={e => (e.currentTarget.style.background = 'var(--dw-surface)')}
                        onPointerUp={e => (e.currentTarget.style.background = 'transparent')}
                        onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Number badge */}
                        <span style={{
                          flexShrink: 0,
                          width: 24, height: 24, borderRadius: '50%',
                          background: authorColor(devotional.author) + '20',
                          color: authorColor(devotional.author),
                          fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-sans)',
                          marginTop: 1,
                        }}>
                          {i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: 14, lineHeight: 1.6,
                            fontFamily: 'var(--font-serif)',
                            color: 'var(--dw-text-primary)',
                            margin: '0 0 5px', fontWeight: 400,
                          }}>
                            {q}
                          </p>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                            color: authorColor(devotional.author),
                            fontFamily: 'var(--font-sans)',
                            textTransform: 'uppercase',
                          }}>
                            Tap to answer in notes →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION 2: Scripture passage — hidden for book chapters */}
          {!isBookChapter && <div style={{ margin: '20px 18px 0' }}>
            <div style={{
              borderRadius: 16,
              background: 'var(--dw-card)',
              border: '1px solid var(--dw-border)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 18px 10px',
                borderBottom: '1px solid var(--dw-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0,
                }}>
                  Scripture · {chapterRef} · {translation}
                </p>
              </div>
              <div style={{ padding: '16px 18px 18px' }}>
                {loadingText ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                    <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                      Loading {chapterRef}…
                    </span>
                  </div>
                ) : scriptureText ? (
                  <p style={{
                    fontSize: 16, lineHeight: 1.9, fontFamily: 'var(--font-serif)',
                    color: 'var(--dw-text-primary)', margin: 0, whiteSpace: 'pre-wrap',
                  }}>
                    {scriptureText}
                  </p>
                ) : (
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
                    Could not load passage. Check your connection.
                  </p>
                )}
              </div>
            </div>
          </div>}

          {/* SECTION 3: My Notes */}
          <div style={{ margin: '20px 18px 32px' }}>
            <div style={{
              borderRadius: 16,
              background: 'var(--dw-card)',
              border: '1px solid var(--dw-border)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--dw-border)' }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0,
                }}>
                  My Notes
                </p>
              </div>
              <div style={{ padding: '12px 18px 16px' }}>
                <textarea
                  ref={textareaRef}
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  placeholder={devotional
                    ? `What is God saying to you through "${devotional.title}"?`
                    : `What is God saying to you through ${passage}?`}
                  style={{
                    width: '100%', minHeight: 140, resize: 'none',
                    border: 'none', outline: 'none',
                    background: 'transparent',
                    fontSize: 15, lineHeight: 1.7,
                    color: 'var(--dw-text)',
                    fontFamily: 'var(--font-serif)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom tool bar ── */}
        <div style={{
          padding: '10px 16px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--dw-border)',
          background: 'var(--dw-canvas)',
          flexShrink: 0,
          display: 'flex', gap: 10,
        }}>
          {/* Bible AI button */}
          <button
            onClick={() => handleAskAI()}
            style={{
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '0 18px', height: 48, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
              backgroundSize: '200% 200%', animation: 'aiAurora 4s ease infinite',
              border: '1px solid rgba(245,207,85,0.5)',
              boxShadow: '0 2px 14px rgba(155,105,8,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
              cursor: 'pointer',
            }}
          >
            <span style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
              borderRadius: '12px 12px 0 0', pointerEvents: 'none',
            }} />
            <Sparkles size={14} color="#fff" strokeWidth={2} style={{ position: 'relative', flexShrink: 0 }} />
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-sans)', letterSpacing: '0.1em',
              textTransform: 'uppercase', position: 'relative',
              textShadow: '0 1px 3px rgba(60,30,0,0.5)',
            }}>Bible AI</span>
          </button>

          {/* Save note button */}
          <button
            onClick={handleSave}
            disabled={!draftNote.trim() || noteSaved}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              background: noteSaved ? '#4A8C40' : draftNote.trim() ? 'var(--dw-accent)' : 'var(--dw-surface)',
              border: `1px solid ${noteSaved ? '#4A8C40' : draftNote.trim() ? 'transparent' : 'var(--dw-border)'}`,
              color: draftNote.trim() || noteSaved ? '#fff' : 'var(--dw-text-muted)',
              fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
              cursor: draftNote.trim() && !noteSaved ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.2s, border 0.2s',
            }}
          >
            {noteSaved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={15} /> Save Note</>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes aiAurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
    </>
  );
}

function TodayPanel({ allEntries, onSave }: {
  allEntries: JournalEntry[];
  onSave: (entry: JournalEntry) => void;
}) {
  const passages = getTodaysPassages();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const [modalPassage, setModalPassage] = useState<TodayPassage | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  function getExistingNote(ref: string): JournalEntry | undefined {
    return allEntries.find(e => e.verseRef === ref && e.date === today);
  }

  function handleSaveFromModal(entry: JournalEntry) {
    onSave(entry);
    setSaved(prev => new Set([...prev, entry.verseRef || entry.title]));
    setTimeout(() => setSaved(prev => { const s = new Set(prev); s.delete(entry.verseRef || entry.title); return s; }), 3000);
  }

  if (passages.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px 16px' }}>
        <BookOpen size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
          No passages scheduled for today
        </p>
        <p style={{ color: 'var(--dw-text-faint)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
          Add a reading plan in Plans &amp; More
        </p>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {passages.map(({ ref, planTitle, dayNum, devotional, isBookChapter }) => {
          const existingNote = getExistingNote(ref);
          const wasSaved = saved.has(ref);
          const authorColor = devotional?.author === 'Ashley' ? '#9A6A08' : devotional?.author === 'Jane' ? '#4A5568' : '#6B5C3E';

          return (
            <div
              key={ref}
              onClick={() => setModalPassage({ ref, planTitle, dayNum, devotional, isBookChapter })}
              style={{
                background: 'var(--dw-card)',
                border: '1px solid var(--dw-border)',
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                borderLeft: devotional ? `4px solid ${authorColor}` : '1px solid var(--dw-border)',
              }}
            >
              <div style={{ padding: '14px 16px 12px' }}>
                {planTitle && (
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4,
                  }}>
                    {planTitle}{dayNum ? ` · Day ${dayNum}` : ''}
                  </p>
                )}
                {/* Devotional title preview */}
                {devotional ? (
                  <>
                    <p style={{
                      fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-serif)',
                      color: 'var(--dw-text-primary)', marginBottom: 4, lineHeight: 1.3,
                    }}>
                      {devotional.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: existingNote ? 8 : 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        color: authorColor, fontFamily: 'var(--font-sans)',
                        background: authorColor + '15', borderRadius: 999, padding: '2px 8px',
                      }}>
                        {devotional.author}
                      </span>
                      {!isBookChapter && (
                        <span style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                          {ref}
                        </span>
                      )}
                      {isBookChapter && dayNum && (
                        <span style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                          Chapter {dayNum}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p style={{
                    fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-serif)',
                    color: 'var(--dw-text-primary)', marginBottom: existingNote ? 8 : 0,
                  }}>
                    {ref}
                  </p>
                )}
                {existingNote && (
                  <p style={{
                    fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                    lineHeight: 1.5, fontStyle: 'italic',
                    display: '-webkit-box', overflow: 'hidden',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {existingNote.body}
                  </p>
                )}
              </div>

              <div style={{
                borderTop: '1px solid var(--dw-border)', padding: '8px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: wasSaved ? '#4A8C40' : 'var(--dw-accent)',
                  fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {wasSaved ? (
                    <><CheckCircle2 size={13} /> Saved</>
                  ) : (
                    <><PenLine size={13} />{existingNote ? 'Edit note' : isBookChapter ? 'Read chapter & notes' : devotional ? 'Read devotional & notes' : 'Read & add note'}</>
                  )}
                </span>
                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  Tap to study →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scripture study modal */}
      {modalPassage && (
        <ScriptureModal
          passage={modalPassage.ref}
          planTitle={modalPassage.planTitle}
          dayNum={modalPassage.dayNum}
          devotional={modalPassage.devotional}
          isBookChapter={modalPassage.isBookChapter}
          existingNote={getExistingNote(modalPassage.ref)}
          onSave={handleSaveFromModal}
          onClose={() => setModalPassage(null)}
        />
      )}
    </>
  );
}

export function JournalScreen() {
  const { userProfile, requireEmail } = useUser();
  const [activeTab, setActiveTab] = useState<'today' | 'journal' | 'sermon' | 'saved'>('today');
  const [entries, setEntries] = useState<JournalEntry[]>(getEntries);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const dailyPrompt = getDailyJournalPrompt();

  // Re-read entries every time the screen mounts so scripture notes from HomeScreen appear
  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const tabs = [
    { id: 'today' as const, label: 'Today', icon: BookOpen },
    { id: 'journal' as const, label: 'Journal', icon: PenLine },
    { id: 'sermon' as const, label: 'Sermons', icon: PenLine },
    { id: 'saved' as const, label: 'Saved', icon: Bookmark },
  ];

  const filteredEntries = activeTab !== 'today' ? entries.filter(e => e.type === activeTab) : [];

  const handleTodaySave = useCallback((entry: JournalEntry) => {
    const all = getEntries();
    const idx = all.findIndex(e => e.id === entry.id);
    if (idx >= 0) { all[idx] = entry; } else { all.unshift(entry); }
    saveEntries(all);
    setEntries(all);
  }, []);

  const openNewEntry = useCallback(() => {
    if (!userProfile?.email) { requireEmail(); return; }
    setEditingEntry({
      id: generateId(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      title: '',
      body: '',
      tags: [],
      type: (activeTab === 'saved' || activeTab === 'today') ? 'journal' : activeTab,
    });
    setShowEditor(true);
  }, [activeTab, userProfile, requireEmail]);

  const openEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry({ ...entry });
    setShowEditor(true);
  }, []);

  const saveEntry = useCallback(() => {
    if (!editingEntry || !editingEntry.title.trim()) return;
    const all = getEntries();
    const idx = all.findIndex(e => e.id === editingEntry.id);
    if (idx >= 0) {
      all[idx] = editingEntry;
    } else {
      all.unshift(editingEntry);
    }
    saveEntries(all);
    setEntries(all);
    setShowEditor(false);
    setEditingEntry(null);
  }, [editingEntry]);

  const deleteEntry = useCallback((id: string) => {
    const all = getEntries().filter(e => e.id !== id);
    saveEntries(all);
    setEntries(all);
    setShowEditor(false);
    setEditingEntry(null);
  }, []);

  const addTag = useCallback((tag: string) => {
    if (!editingEntry || editingEntry.tags.includes(tag)) return;
    setEditingEntry({ ...editingEntry, tags: [...editingEntry.tags, tag] });
  }, [editingEntry]);

  const removeTag = useCallback((tag: string) => {
    if (!editingEntry) return;
    setEditingEntry({ ...editingEntry, tags: editingEntry.tags.filter(t => t !== tag) });
  }, [editingEntry]);

  // Full-screen editor overlay
  if (showEditor && editingEntry) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--dw-canvas)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Editor Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--dw-border)',
          paddingTop: 'calc(16px + var(--safe-top, 0px))',
        }}>
          <button
            onClick={() => { setShowEditor(false); setEditingEntry(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={22} />
          </button>
          <span style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
            {editingEntry.type === 'sermon' ? 'Sermon Notes' : 'Journal Entry'}
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => deleteEntry(editingEntry.id)}
              style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={saveEntry}
              disabled={!editingEntry.title.trim()}
              style={{
                background: 'var(--dw-accent)', border: 'none', borderRadius: 8,
                padding: '6px 14px', color: '#fff', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                opacity: !editingEntry.title.trim() ? 0.5 : 1,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
            {editingEntry.date}
          </p>

          {/* Scripture context — shown for scripture notes */}
          {editingEntry.highlightedText && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(154,123,46,0.1)',
              borderLeft: '3px solid var(--dw-accent)',
              borderRadius: '0 8px 8px 0',
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--dw-accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {editingEntry.verseRef}
              </p>
              <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                "{editingEntry.highlightedText}"
              </p>
            </div>
          )}

          <input
            type="text"
            placeholder="Title..."
            value={editingEntry.title}
            onChange={e => setEditingEntry({ ...editingEntry, title: e.target.value })}
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: 'var(--dw-text-primary)', fontSize: 22,
              fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 16,
            }}
          />
          {/* Daily reflection prompt — shown for journal entries without existing body */}
          {editingEntry.type === 'journal' && !editingEntry.body && !editingEntry.highlightedText && (
            <div
              onClick={() => setEditingEntry({ ...editingEntry, body: `${dailyPrompt}\n\n` })}
              style={{
                marginBottom: 16, padding: '12px 16px',
                background: 'rgba(154,123,46,0.08)',
                border: '1px dashed rgba(154,123,46,0.3)',
                borderRadius: 12, cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--dw-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
                Today's Prompt
              </p>
              <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-serif)', fontStyle: 'italic', margin: 0 }}>
                {dailyPrompt}
              </p>
              <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', marginTop: 8, fontFamily: 'var(--font-sans)' }}>
                Tap to start with this prompt ↓
              </p>
            </div>
          )}
          <textarea
            placeholder={editingEntry.type === 'sermon' ? 'Write your sermon notes...' : 'Write your thoughts...'}
            value={editingEntry.body}
            onChange={e => setEditingEntry({ ...editingEntry, body: e.target.value })}
            style={{
              width: '100%', minHeight: 300, background: 'none', border: 'none',
              outline: 'none', color: 'var(--dw-text-secondary)', fontSize: 15,
              lineHeight: 1.8, fontFamily: 'var(--font-sans)', resize: 'none',
            }}
          />

          {/* Tags */}
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
              Tags
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {editingEntry.tags.map(tag => (
                <span
                  key={tag}
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                    fontSize: 11, padding: '3px 10px', borderRadius: 999,
                    fontFamily: 'var(--font-sans)', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {tag} ×
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['reflection', 'prayer', 'gratitude', 'confession', 'sermon', 'study', 'psalms', 'gospel'].map(tag => (
                !editingEntry.tags.includes(tag) && (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    style={{
                      background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      borderRadius: 999, padding: '4px 10px', fontSize: 11,
                      color: 'var(--dw-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    + {tag}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26, fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Study Notes
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Record yourself button */}
            <button
              onClick={() => setShowRecorder(true)}
              title="Record a video reflection"
              style={{
                background: 'rgba(255,59,48,0.12)',
                border: '1px solid rgba(255,59,48,0.3)',
                borderRadius: 10,
                padding: '8px 14px',
                color: '#ff3b30',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Video size={15} /> Record
            </button>
            <button
              onClick={openNewEntry}
              style={{
                background: 'var(--dw-accent)', border: 'none', borderRadius: 10,
                padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                minHeight: 44, fontFamily: 'var(--font-sans)',
              }}
            >
              <Plus size={16} /> New Entry
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--dw-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                background: activeTab === id ? 'var(--dw-accent)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--dw-text-muted)',
                border: 'none', borderRadius: 8, padding: '10px 0',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                minHeight: 44, fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Today's passages — inline note-taking */}
        {activeTab === 'today' && (
          <TodayPanel allEntries={entries} onSave={handleTodaySave} />
        )}

        {/* Entries */}
        {activeTab !== 'today' && filteredEntries.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px 16px' }}>
            <PenLine size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
              {activeTab === 'journal' ? 'No journal entries yet' : activeTab === 'sermon' ? 'No sermon notes yet' : 'No saved items yet'}
            </p>
            <button className="dw-btn-primary" style={{ fontSize: 13 }} onClick={openNewEntry}>
              Create Your First Entry
            </button>
          </Card>
        ) : activeTab !== 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredEntries.map(entry => (
              <Card key={entry.id} onClick={() => openEntry(entry)}>
                <p style={{
                  color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {entry.date}
                </p>

                {/* Title row — scripture notes show verse ref with icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {entry.verseRef && (
                    <BookOpen size={13} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                  )}
                  <p className="text-card-title" style={{ margin: 0 }}>{entry.title}</p>
                </div>

                {/* Highlighted scripture quote */}
                {entry.highlightedText && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(154,123,46,0.1)',
                    borderLeft: '3px solid var(--dw-accent)',
                    borderRadius: '0 6px 6px 0',
                    marginBottom: 10,
                  }}>
                    <p style={{
                      fontSize: 13, color: 'var(--dw-text-secondary)', lineHeight: 1.5,
                      fontStyle: 'italic', fontFamily: 'var(--font-serif)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      "{entry.highlightedText}"
                    </p>
                  </div>
                )}

                <p style={{
                  color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.5,
                  fontFamily: 'var(--font-sans)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {entry.body}
                </p>
                {entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {entry.tags.map(tag => (
                      <span key={tag} style={{
                        background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                        fontSize: 11, padding: '3px 10px', borderRadius: 999,
                        fontFamily: 'var(--font-sans)', fontWeight: 500,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Video recorder modal */}
      {showRecorder && <VideoRecorderModal onClose={() => setShowRecorder(false)} />}
    </div>
  );
}
