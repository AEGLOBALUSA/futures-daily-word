import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { ChevronLeft, ChevronRight, Search, Loader2, MapPin, User, ChevronDown, Headphones, Pause, Play, BookOpen, Plus, X } from 'lucide-react';
import { getDailyPassages, getDateString, getDailyDevotionIndex, getDailyQuoteIndex } from '../utils/daily-passages';
import { fetchPassage, fetchAudio } from '../utils/api';
import type { TranslationCode } from '../utils/api';
import { DEVOTIONS } from '../data/devotions';
import { QUOTES } from '../data/quotes';
import { COMMENTARY } from '../data/commentary';
import { CAMPUSES } from '../data/tokens';
import { useUser } from '../contexts/UserContext';
import { HighlightToolbar } from '../components/HighlightToolbar';
import { VerseNoteDrawer } from '../components/VerseNoteDrawer';
import { GreekHebrewPopup } from '../components/GreekHebrewPopup';
import { BibleAI } from '../components/BibleAI';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { PLAN_CATALOGUE } from '../data/plans';
import { SetupPromptModal } from '../components/SetupPromptModal';

const TRANSLATIONS: TranslationCode[] = ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];

/** Calendar-based plan day — advances automatically each day regardless of completion */
function calcPlanDay(startedAt: string, totalDays: number): number {
  try {
    const start = new Date(startedAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return Math.max(1, Math.min(elapsed + 1, totalDays));
  } catch {
    return 1;
  }
}

const PERSONAS = [
  { id: 'new_returning', label: 'New to Faith / Returning to Faith', desc: 'Starting or reigniting your faith journey' },
  { id: 'pastor', label: 'Pastor / Leader', desc: 'Ministry and leadership' },
  { id: 'deeper', label: 'Going Deeper', desc: 'Deeper study and theology' },
  { id: 'difficult', label: 'Difficult Season', desc: 'Comfort and encouragement' },
];

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Bible Books and Chapters ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const BOOK_CHAPTERS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24, Judges: 21, Ruth: 4,
  '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31, Ecclesiastes: 12,
  'Song of Solomon': 8, Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48, Daniel: 12,
  Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3,
  Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21,
  Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6,
  '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
};

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Faith Pathway types ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
interface PathwayDay {
  day: number;
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  theme: string;
  themeEs?: string;
  themePt?: string;
  themeId?: string;
  passages?: string[];
  reflection?: string;
}

interface PathwayData {
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  days: PathwayDay[];
}

interface PathwayProgress {
  completedDays: number[];
  currentDay: number;
  enrolled: boolean;
}

interface ReadingSlot {
  id: string;
  book: string;
  currentChapter: number;
}

export function HomeScreen() {
  const { userProfile, setup, profilePic, saveProfile, saveSetup, requireEmail } = useUser();
  const [dayOffset, setDayOffset] = useState(0);
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  });
  const [passageTexts, setPassageTexts] = useState<Record<string, string>>({});
  const [loadingPassages, setLoadingPassages] = useState<Set<string>>(new Set());
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // Reading Slots state
  const [readingSlots, setReadingSlots] = useState<ReadingSlot[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_reading_slots') || '[]') as ReadingSlot[];
    } catch { return []; }
  });
  const [showReadingSetup, setShowReadingSetup] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [bookPickerSearch, setBookPickerSearch] = useState('');
  const [loadedFirstSlotPassage, setLoadedFirstSlotPassage] = useState(false);

  // Chapters per day (from Settings)
  const [chaptersPerDay, setChaptersPerDay] = useState<number>(() => {
    return parseInt(localStorage.getItem('dw_chapters_per_day') || '3', 10);
  });

  // Faith Pathway state
  const [pathwayData, setPathwayData] = useState<PathwayData | null>(null);
  const [pathwayProgress, setPathwayProgress] = useState<PathwayProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}') as PathwayProgress;
    } catch { return { completedDays: [], currentDay: 1, enrolled: false }; }
  });

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentPassage, setAudioCurrentPassage] = useState<string | null>(null);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [showBibleAI, setShowBibleAI] = useState(false);
  const [bibleAIContext, setBibleAIContext] = useState<string>('');
  const { selection, setSelection, greekHebrewMode } = useScriptureSelection();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlCache = useRef<Map<string, string>>(new Map());
  const audioUnlocked = useRef(false);
  const [audioError, setAudioError] = useState(false);
  const speechSynthRef = useRef(false); // true when Web Speech API is active

  const currentCampus = CAMPUSES.find(c => c.id === userProfile?.campus);
  const currentPersona = PERSONAS.find(p => p.id === setup?.persona);
  const displayName = userProfile?.firstName || 'Friend';
  const lang = localStorage.getItem('dw_lang') || 'en';

  // Load Faith Pathway for new_returning persona
  useEffect(() => {
    if (setup?.persona === 'new_returning') {
      if (!pathwayProgress.enrolled) {
        const updated = { ...pathwayProgress, enrolled: true, completedDays: pathwayProgress.completedDays || [], currentDay: pathwayProgress.currentDay || 1 };
        setPathwayProgress(updated);
        try { localStorage.setItem('dw_pathway_progress', JSON.stringify(updated)); } catch {}
      }
      if (!pathwayData) {
        fetch('/books/faith-pathway.json')
          .then(r => r.json())
          .then((data: PathwayData) => setPathwayData(data))
          .catch(() => {});
      }
    }
  }, [setup?.persona]);

  // Auto-load first reading slot's passage on mount
  useEffect(() => {
    if (readingSlots.length > 0 && !loadedFirstSlotPassage) {
      const firstSlot = readingSlots[0];
      const passage = `${firstSlot.book} ${firstSlot.currentChapter}`;
      loadPassage(passage);
      setLoadedFirstSlotPassage(true);
    }
  }, [readingSlots, loadedFirstSlotPassage]);

  const savePathwayProgress = (p: PathwayProgress) => {
    setPathwayProgress(p);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(p)); } catch {}
  };

  const saveReadingSlots = (slots: ReadingSlot[]) => {
    setReadingSlots(slots);
    try { localStorage.setItem('dw_reading_slots', JSON.stringify(slots)); } catch {}
  };

  const addReadingSlot = (book: string) => {
    const newSlot: ReadingSlot = {
      id: Math.random().toString(36).substr(2, 9),
      book,
      currentChapter: 1,
    };
    saveReadingSlots([...readingSlots, newSlot]);
    setShowBookPicker(false);
    setBookPickerSearch('');
  };

  const removeReadingSlot = (id: string) => {
    saveReadingSlots(readingSlots.filter(s => s.id !== id));
  };

  const advanceChapter = (id: string) => {
    const updated = readingSlots.map(s => {
      if (s.id === id) {
        const maxChapter = BOOK_CHAPTERS[s.book] || 1;
        return { ...s, currentChapter: Math.min(s.currentChapter + 1, maxChapter) };
      }
      return s;
    });
    saveReadingSlots(updated);
  };

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
    } else {
      requireEmail(() => {});
    }
    setShowCampusPicker(false);
  };

  const handlePersonaSelect = (personaId: string) => {
    saveSetup({ persona: personaId, source: setup?.source || '' });
    setShowPersonaPicker(false);
  };

  const passages = getDailyPassages(dayOffset);
  const dateStr = getDateString(dayOffset);
  const devIndex = getDailyDevotionIndex(dayOffset);
  const quoteIndex = getDailyQuoteIndex(dayOffset, QUOTES.length);
  const devotion = DEVOTIONS[devIndex];
  const quote = QUOTES[quoteIndex];

  // Find commentary for today's primary passage
  const primaryPassage = passages[0]?.passage || '';
  const commentarySources = COMMENTARY as Record<string, Record<string, string>>;
  let commentaryText = '';
  let commentarySource = '';
  for (const [source, entries] of Object.entries(commentarySources)) {
    if (entries[primaryPassage]) {
      commentaryText = entries[primaryPassage];
      commentarySource = source;
      break;
    }
  }

  // Fetch a single passage on demand (tap to read)
  const loadPassage = (passage: string) => {
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) return; // already loaded
    if (loadingPassages.has(passage)) return; // already loading

    setLoadingPassages(prev => new Set(prev).add(passage));
    fetchPassage(passage, translation)
      .then(text => {
        setPassageTexts(prev => ({ ...prev, [key]: text }));
      })
      .catch(() => {})
      .finally(() => {
        setLoadingPassages(prev => {
          const next = new Set(prev);
          next.delete(passage);
          return next;
        });
      });
  };

  // Pending audio — when user taps Listen before text is loaded
  const pendingAudioRef = useRef<string | null>(null);

  // Watch for text to arrive so we can auto-play audio
  useEffect(() => {
    if (!pendingAudioRef.current) return;
    const passage = pendingAudioRef.current;
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) {
      pendingAudioRef.current = null;
      handleAudio(passage);
    }
  }, [passageTexts]);

  // Read: expand + load. Listen: expand + load + play audio when ready.
  const handleRead = (passage: string) => {
    // If already open, close it (toggle)
    if (expandedPassages.has(passage)) {
      setExpandedPassages(new Set());
      return;
    }
    // Close everything else, stop any playing audio, open this one
    if (audioPlaying) stopAudio();
    setExpandedPassages(new Set([passage]));
    loadPassage(passage);
  };

  const handleListen = (passage: string) => {
    // Unlock iOS audio immediately on user gesture tap — must happen synchronously
    ensureAudioUnlocked();
    setAudioError(false);
    const key = `${passage}_${translation}`;
    // If already playing this passage, pause/stop (toggle)
    if (audioPlaying && audioCurrentPassage === passage) {
      stopAudio();
      return;
    }
    // Close all other expanded passages — only one open at a time
    // Stop anything already playing before switching
    if (audioPlaying) stopAudio();
    setShowSetupModal(false); // dismiss setup prompt if user taps listen
    setExpandedPassages(new Set([passage]));
    if (passageTexts[key]) {
      // Text already loaded, play immediately
      handleAudio(passage);
    } else {
      // Load text first, audio will auto-play via the useEffect above
      loadPassage(passage);
      pendingAudioRef.current = passage;
      setAudioLoading(true);
      setAudioCurrentPassage(passage);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // Setup prompt: show after 5s if user has no reading slots & no active plans
  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('dw_setup_dismissed');
    if (alreadyDismissed) return;
    const hasSlots = readingSlots.length > 0;
    const hasPlans = Object.keys(
      (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })()
    ).length > 0;
    if (hasSlots || hasPlans) return; // already set up, don't bother them
    const timer = setTimeout(() => setShowSetupModal(true), 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset expanded passages when day or translation changes
  useEffect(() => {
    setExpandedPassages(new Set());
    setPassageTexts({});
    stopAudio();
  }, [dayOffset, translation]);

  useEffect(() => {
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        const dn = calcPlanDay(prog.startedAt, plan.totalDays);
        const dp = plan.passages[dn - 1];
        if (!dp) continue;
        dp.split(', ').forEach(p => loadPassage(p.trim()));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  // Preload audio for plan passages in the background once text is available
  useEffect(() => {
    if (todaysPlanPassages.length === 0) return;
    todaysPlanPassages.forEach(({ passage }) => {
      const tKey = `${passage}_${translation}`;
      const text = passageTexts[tKey];
      if (!text) return;
      const cacheKey = tKey;
      if (audioUrlCache.current.has(cacheKey)) return; // already cached
      // Silently preload — don't auto-play, just warm the cache
      fetchAudio(text.slice(0, 5000), translation, passage).then(url => {
        if (url) audioUrlCache.current.set(cacheKey, url);
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageTexts, translation]);

  const handleTranslationChange = (t: TranslationCode) => {
    setTranslation(t);
    localStorage.setItem('dw_translation', t);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (speechSynthRef.current) {
      window.speechSynthesis?.cancel();
      speechSynthRef.current = false;
    }
    setAudioPlaying(false);
    setAudioUrl(null);
    setAudioCurrentPassage(null);
  };

  const setupMediaSession = (passage: string, audio: HTMLAudioElement) => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: passage,
      artist: 'Futures Daily Word',
      album: `${translation} Bible`,
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      audio.play();
      setAudioPlaying(true);
      navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause();
      setAudioPlaying(false);
      navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      stopAudio();
      navigator.mediaSession.playbackState = 'none';
    });
    navigator.mediaSession.playbackState = 'playing';
  };

  /** Unlock iOS audio context on first user gesture so deferred plays work */
  const ensureAudioUnlocked = async () => {
    if (audioUnlocked.current) return;
    try {
      const silence = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAA' +
        'EAAQARAAAAIgAAABAAEAZGF0YQAAAAA=');
      await silence.play();
      silence.pause();
      audioUnlocked.current = true;
    } catch { /* ignore */ }
  };

  const handleAudio = async (passage: string) => {
    if (audioPlaying && audioCurrentPassage === passage) {
      stopAudio();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
      return;
    }
    if (audioPlaying) stopAudio();

    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    if (!text) return;

    setAudioError(false);
    setAudioLoading(true);
    setAudioCurrentPassage(passage);
    try {
      await ensureAudioUnlocked();
      const cacheKey = `${passage}_${translation}`;
      const cachedUrl = audioUrlCache.current.get(cacheKey);
      const url = cachedUrl || await fetchAudio(text.slice(0, 5000), translation, passage);
      if (url) {
        if (!cachedUrl) audioUrlCache.current.set(cacheKey, url);
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
          setAudioCurrentPassage(null);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        };
        audio.onerror = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
          setAudioCurrentPassage(null);
          setAudioError(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        };
        audio.onpause = () => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        };
        audio.onplay = () => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        };
        await audio.play();
        setAudioPlaying(true);
        setupMediaSession(passage, audio);
      } else {
        // fetchAudio returned null — fall back to Web Speech API (no key needed)
        if ('speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(text.slice(0, 5000));
          utter.lang = 'en-US';
          utter.rate = 0.92;
          utter.pitch = 1.0;
          // Prefer a natural-sounding voice if available
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(v =>
            /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en')
          ) || voices.find(v => v.lang.startsWith('en') && v.localService);
          if (preferred) utter.voice = preferred;
          utter.onstart = () => {
            setAudioPlaying(true);
            setAudioLoading(false);
            speechSynthRef.current = true;
          };
          utter.onend = () => {
            setAudioPlaying(false);
            setAudioCurrentPassage(null);
            speechSynthRef.current = false;
          };
          utter.onerror = () => {
            setAudioPlaying(false);
            setAudioCurrentPassage(null);
            setAudioError(true);
            speechSynthRef.current = false;
          };
          // Voices may not be loaded yet — wait if needed
          if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
              const v2 = window.speechSynthesis.getVoices();
              const pref2 = v2.find(v =>
                /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en')
              ) || v2.find(v => v.lang.startsWith('en') && v.localService);
              if (pref2) utter.voice = pref2;
              window.speechSynthesis.speak(utter);
            };
          } else {
            window.speechSynthesis.speak(utter);
          }
          return; // don't fall through to setAudioError
        }
        setAudioError(true);
        setAudioCurrentPassage(null);
      }
    } catch {
      setAudioError(true);
      setAudioCurrentPassage(null);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSetupComplete = (newChapters: number, planIds: string[]) => {
    // Save chapters per day
    setChaptersPerDay(newChapters);
    localStorage.setItem('dw_chapters_per_day', String(newChapters));
    // Start selected plans
    if (planIds.length > 0) {
      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
      const updated = { ...existing };
      for (const id of planIds) {
        if (!updated[id]) {
          updated[id] = { startedAt: new Date().toISOString().slice(0, 10), completedDays: [], lastDay: 0 };
        }
      }
      localStorage.setItem('dw_activeplans', JSON.stringify(updated));
    }
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
    // Force re-render of plan passages
    window.location.reload();
  };

  const handleSetupDismiss = () => {
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
  };

  const todaysPlanPassages = (() => {
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const out: Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; author: string; body: string } }> = [];
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        const dn = calcPlanDay(prog.startedAt, plan.totalDays);
        const dp = plan.passages[dn - 1];
        const dev = plan.devotionals?.[dn - 1];
        if (dp) dp.split(', ').forEach((p, i) => out.push({ planId: pid, planTitle: plan.title, passage: p.trim(), dayNum: dn, devotional: i === 0 ? dev : undefined }));
      }
      return out;
    } catch { return [] as Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; author: string; body: string } }>; }
  })()

  const filteredBooks = BIBLE_BOOKS.filter(book =>
    book.toLowerCase().includes(bookPickerSearch.toLowerCase())
  );

  /** Render scripture text with tappable words when Gk/Heb mode is active */
  const renderScripture = (text: string, passage: string) => {
    if (!greekHebrewMode) return text;
    // Split preserving whitespace tokens
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      if (/^\s+$/.test(token)) return token;
      const word = token.replace(/[^a-zA-Z']/g, '');
      if (!word) return token;
      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            // Open BibleAI with word study context
            setBibleAIContext(`Please explain the original Greek or Hebrew meaning of the word "${word}" as it appears in ${passage}. Include the Strongs number if known, the original language word, its transliteration, definition, and how it enriches understanding of this verse.`);
            setShowBibleAI(true);
          }}
          style={{
            cursor: 'pointer',
            borderBottom: '1px dotted #9A7B2E',
            paddingBottom: 1,
            borderRadius: 2,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(154,123,46,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <div className="screen-container">
      {showSetupModal && (
        <SetupPromptModal
          onComplete={handleSetupComplete}
          onDismiss={handleSetupDismiss}
        />
      )}
      <div style={{ padding: '0 24px 0' }}>
        {/* ── Hero viewport ── fills visible screen, hero centered */}
        <div style={{
          minHeight: 'calc(100svh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 20,
          paddingBottom: 28,
        }}>

        {/* Header — compact, sits above the centered hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Daily Word
            </h1>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 1 }}>
              Futures Church
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Hero Listen Button ── */}
        {(todaysPlanPassages.length > 0 || readingSlots.length > 0) && (() => {
          const firstPlan = todaysPlanPassages[0];
          const firstSlot = readingSlots[0];
          const heroPassage = firstPlan
            ? firstPlan.passage
            : firstSlot ? `${firstSlot.book} ${firstSlot.currentChapter}` : null;
          if (!heroPassage) return null;

          const allLabels = [
            ...todaysPlanPassages.map(p => p.passage),
            ...readingSlots
              .slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length))
              .map(s => `${s.book} ${s.currentChapter}`),
          ];
          const planLabel = firstPlan ? `${firstPlan.planTitle} — Day ${firstPlan.dayNum}` : null;
          const isPlayingHero = audioPlaying && audioCurrentPassage === heroPassage;
          const isLoadingHero = audioLoading && audioCurrentPassage === heroPassage;

          return (
            <div
              key="hero-listen"
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 20,
                boxShadow: '0 24px 64px rgba(168,50,59,0.22), 0 6px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.13)',
              }}
            >
              {/* ── Layer 1: animated wave gradient ── */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(150deg, #E04858 0%, #C03840 20%, #6B1A22 50%, #1C0508 75%, #8B2030 90%, #C03840 100%)',
                backgroundSize: '280% 280%',
                animation: 'heroColorWave 7s ease infinite',
              }} />

              {/* ── Layer 2: glass sheen ── */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.12) 100%)',
              }} />

              {/* ── Layer 3: rolling shimmer sweep ── */}
              <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 24,
              }}>
                <div style={{
                  position: 'absolute', top: '-50%', bottom: '-50%', width: '40%',
                  background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)',
                  animation: 'heroShimmerSweep 4s ease-in-out infinite',
                  animationDelay: '1.2s',
                }} />
              </div>

              {/* ── Content ── */}
              <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>

                {/* Top meta bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px 0',
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', opacity: 0.55,
                    fontFamily: 'var(--font-sans)', margin: 0,
                  }}>
                    {planLabel || "Today's Reading"}
                  </p>
                  <p style={{
                    fontSize: 10, fontWeight: 500, opacity: 0.45,
                    fontFamily: 'var(--font-sans)', margin: 0, letterSpacing: '0.04em',
                  }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Big play button — centered */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '22px 20px 20px',
                }}>
                  <button
                    onClick={() => handleListen(heroPassage)}
                    style={{
                      width: 78, height: 78, borderRadius: '50%',
                      background: isPlayingHero
                        ? 'rgba(255,255,255,0.22)'
                        : 'rgba(255,255,255,0.16)',
                      border: '2px solid rgba(255,255,255,0.35)',
                      boxShadow: isPlayingHero
                        ? '0 0 0 14px rgba(255,255,255,0.07), 0 0 0 28px rgba(255,255,255,0.03), 0 10px 32px rgba(0,0,0,0.4)'
                        : '0 10px 32px rgba(0,0,0,0.35)',
                      animation: isPlayingHero
                        ? 'heroRingPulse 2.2s ease-in-out infinite'
                        : 'heroIdlePulse 3.5s ease-in-out infinite',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                      transition: 'box-shadow 0.4s ease, background 0.2s ease',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      marginBottom: 16,
                      flexShrink: 0,
                    }}
                  >
                    {isLoadingHero
                      ? <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                      : isPlayingHero
                      ? <Pause size={32} />
                      : <Play size={32} style={{ marginLeft: 4 }} />
                    }
                  </button>

                  <p style={{
                    fontSize: 15, fontWeight: 700, margin: '0 0 6px',
                    fontFamily: 'var(--font-sans)', letterSpacing: '0.01em', textAlign: 'center',
                  }}>
                    {isLoadingHero ? 'Loading…' : isPlayingHero ? 'Now Playing' : 'Listen Now'}
                  </p>

                  <p style={{
                    fontSize: 13, opacity: 0.68, margin: 0,
                    fontFamily: 'var(--font-sans)', textAlign: 'center',
                    maxWidth: '88%', lineHeight: 1.4,
                  }}>
                    {allLabels.join(' · ')}
                  </p>
                </div>

                {/* Error message */}
                {audioError && audioCurrentPassage === heroPassage && (
                  <p style={{
                    fontSize: 11, color: 'rgba(255,180,180,0.9)', textAlign: 'center',
                    fontFamily: 'var(--font-sans)', margin: '0 20px 10px',
                  }}>
                    Audio unavailable — tap Read to follow along
                  </p>
                )}

                {/* Hairline divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />

                {/* Footer: Read + Translation picker */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '2px 8px 2px',
                }}>
                  {/* Read button */}
                  <button
                    onClick={() => handleRead(heroPassage)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px 8px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: expandedPassages.has(heroPassage) ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                      letterSpacing: '0.03em', transition: 'color 0.2s ease',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <BookOpen size={13} />
                    {expandedPassages.has(heroPassage) ? 'Close' : 'Read'}
                  </button>

                  {/* Translation picker — horizontal scrollable pills */}
                  <div style={{
                    flex: 2, display: 'flex', alignItems: 'center', gap: 5,
                    overflowX: 'auto', padding: '10px 12px',
                    scrollbarWidth: 'none',
                  }}>
                    {TRANSLATIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => handleTranslationChange(t)}
                        style={{
                          flexShrink: 0,
                          padding: '4px 9px',
                          borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: t === translation ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.2)',
                          background: t === translation ? 'rgba(255,255,255,0.22)' : 'transparent',
                          color: t === translation ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        </div>{/* end hero viewport */}

        {/* Persona Greeting */}
        <Card style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          {profilePic ? (
            <img
              src={profilePic}
              alt="Profile"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: '2px solid var(--dw-accent)',
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--dw-accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, border: '2px solid var(--dw-accent)',
            }}>
              <User size={20} style={{ color: 'var(--dw-accent)' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{
              color: 'var(--dw-text-primary)',
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
            }}>
              Welcome, {displayName}
            </p>
            <button
              onClick={() => setShowPersonaPicker(!showPersonaPicker)}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--dw-accent)', fontSize: 12,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
              }}
            >
              {currentPersona ? currentPersona.label : 'Set your journey type'}
              <ChevronDown size={12} />
            </button>
          </div>
        </Card>

        {/* Persona Picker Dropdown */}
        {showPersonaPicker && (
          <Card style={{ marginBottom: 16, padding: 12 }}>
            <p className="text-section-header" style={{ marginBottom: 10 }}>YOUR JOURNEY</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePersonaSelect(p.id)}
                  style={{
                    background: setup?.persona === p.id ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: setup?.persona === p.id ? '#fff' : 'var(--dw-text-primary)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    minHeight: 44,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FAITH PATHWAY CARD ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ for new_returning persona */}
        {pathwayProgress.enrolled && pathwayData && setup?.persona === 'new_returning' && (() => {
          const completed = pathwayProgress.completedDays?.length || 0;
          const currentDay = pathwayProgress.currentDay || 1;
          const today = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
          const totalDays = pathwayData.days?.length || 40;
          const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
            : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
            : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
            : pathwayData.title;

          if (completed >= totalDays) {
            return (
              <div style={{
                background: 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9, marginBottom: 6 }}>
                  Journey Complete
                </div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  You've completed {pathTitle}! Start again or explore other plans.
                </div>
              </div>
            );
          }

          const todayTitle = today
            ? (lang === 'es' ? (today.titleEs || today.title)
              : lang === 'pt' ? (today.titlePt || today.title)
              : lang === 'id' ? (today.titleId || today.title)
              : today.title)
            : '';
          const todayTheme = today
            ? (lang === 'es' ? (today.themeEs || today.theme)
              : lang === 'pt' ? (today.themePt || today.theme)
              : lang === 'id' ? (today.themeId || today.theme)
              : today.theme)
            : '';

          return (
            <div
              onClick={() => {
                // Mark the current day as complete, advance to next
                if (today) {
                  const newCompleted = pathwayProgress.completedDays.includes(currentDay)
                    ? pathwayProgress.completedDays
                    : [...pathwayProgress.completedDays, currentDay];
                  const nextDay = Math.min(totalDays, Math.max(...newCompleted, currentDay) + 1);
                  savePathwayProgress({ ...pathwayProgress, completedDays: newCompleted, currentDay: nextDay });
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8 }}>
                  {pathTitle}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {completed} of {totalDays} completed
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
                Today's Lesson: {todayTitle}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                {todayTheme}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(completed / totalDays) * 100}%`,
                    height: '100%',
                    background: '#D4A574',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D4A574' }}>
                  Continue Journey &rarr;
                </div>
              </div>
            </div>
          );
        })()}

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '20px 0',
        }}>
          <button
            onClick={() => setDayOffset(d => d - 1)}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="text-section-header" style={{ marginBottom: 4 }}>TODAY'S READING</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {dateStr}
            </p>
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            disabled={dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: dayOffset >= 30 ? 'var(--dw-text-faint)' : 'var(--dw-text-muted)', cursor: dayOffset >= 30 ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 1. Daily Quote */}
        <Card style={{ marginBottom: 16, borderLeft: '3px solid var(--dw-accent)' }}>
          <p
            onClick={() => setSelection({ text: `"${quote.text}" — ${quote.author}`, verseRefs: [], source: 'tap' })}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              fontStyle: 'italic',
              color: 'var(--dw-text-secondary)',
              lineHeight: 1.6,
              cursor: 'pointer',
              WebkitUserSelect: 'text',
              userSelect: 'text',
            }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 8, fontFamily: 'var(--font-sans)' }}>
            — {quote.author}
          </p>
        </Card>

        {/* 2. Devotion of the Day */}
        <Card style={{ marginBottom: 16 }}>
          <p className="text-section-header" style={{ marginBottom: 8 }}>DEVOTION OF THE DAY</p>
          <p className="text-card-title" style={{ marginBottom: 6 }}>{devotion.title}</p>
          <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
            {devotion.verse}
          </p>
          <p
            className="text-devotion"
            onClick={() => setSelection({ text: devotion.body, verseRefs: [devotion.verse || ''], source: 'tap' })}
            style={{ cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' }}
          >{devotion.body}</p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 10, fontFamily: 'var(--font-sans)' }}>
            — {devotion.author}
          </p>
        </Card>

        {/* Scripture Search Ã¢ÂÂ prominent, before daily chapters */}
        <Card style={{ marginBottom: 16, border: '2px solid var(--dw-accent)', background: 'var(--dw-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={22} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search scripture or topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--dw-text-primary)',
                fontSize: 17,
                fontFamily: 'var(--font-sans)',
                padding: '4px 0',
              }}
            />
          </div>
        </Card>

        {/* Translation Selector — always visible */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          {TRANSLATIONS.map(t => (
            <button
              key={t}
              onClick={() => handleTranslationChange(t)}
              style={{
                background: t === translation ? 'var(--dw-accent)' : 'transparent',
                color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                border: t === translation ? 'none' : '1px solid var(--dw-border-subtle)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                minHeight: 32,
                transition: 'all var(--transition-fast)',
              }}
            >
              {t}
            </button>
          ))}
        </div>


        {/* 3. TODAY'S CHAPTERS */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="text-section-header">TODAY'S CHAPTERS</p>
              <button onClick={() => {
                // All visible passages = plan passages + reading slot passages
                const slotPassages = readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length));
                const allPassageIds = [
                  ...todaysPlanPassages.map(p => p.passage),
                  ...slotPassages.map(s => `${s.book} ${s.currentChapter}`),
                ];
                // Trigger loading + expand all so texts become available
                allPassageIds.forEach(p => loadPassage(p));
                setExpandedPassages(new Set(allPassageIds));
                // Select whatever is already loaded right now
                const loadedPairs = allPassageIds
                  .map(p => ({ p, t: passageTexts[`${p}_${translation}`] || '' }))
                  .filter(x => x.t);
                if (loadedPairs.length > 0) {
                  setSelection({
                    text: loadedPairs.map(x => x.t).join('\n\n'),
                    verseRefs: loadedPairs.map(x => x.p),
                    source: 'select-all',
                  });
                }
              }} style={{ background:'rgba(154,123,46,0.12)', border:'1px solid rgba(154,123,46,0.3)', borderRadius:16, padding:'4px 12px', fontSize:12, color:'#9A7B2E', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600 }}>Select All</button>
            <button
              onClick={() => setShowReadingSetup(!showReadingSetup)}
              style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-accent)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'var(--dw-accent)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 32,
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {readingSlots.length === 0 && todaysPlanPassages.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                No reading slots yet. Add a book or start a reading plan to get started.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todaysPlanPassages.map(({ planId, planTitle, passage, dayNum, devotional }) => {
        const tKey = passage + '_' + translation;
        const txt = passageTexts[tKey];
        return (
          <div key={planId + '_' + passage} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-accent)', opacity: 0.8 }}>
                {planTitle} — Day {dayNum}
              </span>
            </div>
            <div style={{
              background: 'var(--dw-surface)',
              borderRadius: 14,
              border: '1px solid var(--dw-border-subtle)',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              {/* ── Listen button — TOP, full width ── */}
              {(() => {
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingThis = audioLoading && audioCurrentPassage === passage;
                return (
                  <button
                    onClick={() => handleListen(passage)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                      border: 'none',
                      borderRadius: 0,
                      padding: '13px 18px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#fff',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.02em',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {isLoadingThis ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading audio…</>
                    ) : isPlayingThis ? (
                      <><Pause size={16} /> Pause</>
                    ) : (
                      <><Headphones size={16} /> Listen</>
                    )}
                  </button>
                );
              })()}
              {/* ── Scripture content ── */}
              <div style={{ padding: '14px 18px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {passage}
                </div>
                {txt ? (
                  <>
                    <div
                      onClick={() => !greekHebrewMode && txt && setSelection({ text: txt, verseRefs: [passage], source: 'tap' })}
                      style={{ cursor: greekHebrewMode ? 'default' : 'pointer', borderRadius: 4, transition: 'background 0.2s', background: selection?.verseRefs?.includes(passage) ? 'rgba(154,123,46,0.12)' : 'transparent' }}
                    >
                      {greekHebrewMode && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#9A7B2E', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                          Tap any word to explore its meaning
                        </p>
                      )}
                      <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--dw-text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif, Georgia, serif)', margin: 0 }}>
                        {renderScripture(txt, passage)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                  </div>
                )}
              </div>
              {/* ── Daily Devotional — shown after scripture when plan has one ── */}
              {devotional && (
                <div style={{
                  borderTop: '1px solid var(--dw-border-subtle)',
                  padding: '18px 18px 20px',
                }}>
                  {/* Devotional title */}
                  <p style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--dw-text-primary)',
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}>
                    {devotional.title}
                  </p>
                  {/* Devotional body */}
                  <div
                    onClick={() => setSelection({ text: devotional.body, verseRefs: [passage], source: 'tap' })}
                    style={{
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: 'var(--dw-text-secondary)',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      whiteSpace: 'pre-wrap',
                      cursor: 'pointer',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                    }}
                  >
                    {devotional.body}
                  </div>
                  {/* Author attribution */}
                  <p style={{
                    marginTop: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--dw-accent)',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '0.04em',
                  }}>
                    — {devotional.author}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })
              }{readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length)).map(slot => {
                const passage = `${slot.book} ${slot.currentChapter}`;
                const maxChapter = BOOK_CHAPTERS[slot.book] || 1;
                const textKey = `${passage}_${translation}`;
                const text = passageTexts[textKey];
                const isLoading = loadingPassages.has(passage);
                const isExpanded = expandedPassages.has(passage);
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingThis = audioLoading && audioCurrentPassage === passage;

                return (
                  <Card key={slot.id} style={{ marginBottom: 0 }}>
                    {/* Reading Slot Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <p style={{
                          color: 'var(--dw-text-primary)',
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                        }}>
                          {slot.book}
                        </p>
                        <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                          Chapter {slot.currentChapter} of {maxChapter}
                        </p>
                      </div>
                      <button
                        onClick={() => removeReadingSlot(slot.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--dw-text-muted)',
                          cursor: 'pointer',
                          padding: 4,
                          minHeight: 36,
                          minWidth: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Remove reading slot"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Read + Listen buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: isExpanded ? 14 : 0 }}>
                      <button
                        onClick={() => handleRead(passage)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: isExpanded ? 'var(--dw-surface-hover)' : 'var(--dw-accent-bg)',
                          color: isExpanded ? 'var(--dw-text-secondary)' : 'var(--dw-accent)',
                          border: isExpanded ? '1px solid var(--dw-border)' : '1px solid var(--dw-accent)',
                          borderRadius: 10,
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <BookOpen size={16} />
                        {isExpanded ? 'Reading' : 'Read'}
                      </button>
                      <button
                        onClick={() => handleListen(passage)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none',
                          borderRadius: 10,
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#fff',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {isLoadingThis ? (
                          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                        ) : isPlayingThis ? (
                          <><Pause size={16} /> Pause</>
                        ) : (
                          <><Headphones size={16} /> Listen</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text — only shown when expanded */}
                    {isExpanded && (
                      <div style={{ marginBottom: 14 }}>
                        {isLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                            <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading {translation}...</span>
                          </div>
                        ) : text ? (
              <>
              <div onClick={() => !greekHebrewMode && text && setSelection({ text, verseRefs: [passage], source: 'tap' })} style={{ cursor: greekHebrewMode ? 'default' : 'pointer', padding:'2px 0' }}>
                {greekHebrewMode && (
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#9A7B2E', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                    Tap any word to explore its meaning
                  </p>
                )}
                <p className="text-scripture" style={{ fontSize:15, lineHeight:1.7, color:'var(--dw-text)', fontFamily:'var(--font-serif)', background: !greekHebrewMode && selection?.text===text ? 'rgba(154,123,46,0.18)' : 'transparent', borderRadius:4, transition:'background 0.2s' }}>
                  {renderScripture(text, passage)}
                </p>
              </div>
              </>
                        ) : (
                          <p style={{ color: 'var(--dw-text-faint)', fontSize: 13, padding: '8px 0', fontStyle: 'italic' }}>
                            Loading...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Advance chapter button */}
                    {slot.currentChapter < maxChapter && (
                      <button
                        onClick={() => advanceChapter(slot.id)}
                        style={{
                          width: '100%',
                          background: 'var(--dw-surface-hover)',
                          border: '1px solid var(--dw-border)',
                          borderRadius: 10,
                          padding: '10px 16px',
                          color: 'var(--dw-accent)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          minHeight: 42,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        Next Chapter ({slot.currentChapter + 1})
                      </button>
                    )}
                    {slot.currentChapter === maxChapter && (
                      <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>
                        You've finished {slot.book}!
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Book Picker Modal */}
          {showBookPicker && (
            <Card style={{ marginTop: 12, padding: '16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Search size={16} style={{ color: 'var(--dw-text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search books..."
                  value={bookPickerSearch}
                  onChange={e => setBookPickerSearch(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--dw-text-primary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {filteredBooks.map(book => (
                  <button
                    key={book}
                    onClick={() => addReadingSlot(book)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dw-surface-hover)',
                      border: '1px solid var(--dw-border)',
                      borderRadius: 8,
                      color: 'var(--dw-text-primary)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                      minHeight: 40,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {book}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowBookPicker(false);
                  setBookPickerSearch('');
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '8px 12px',
                  background: 'none',
                  border: '1px solid var(--dw-border-subtle)',
                  borderRadius: 8,
                  color: 'var(--dw-text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minHeight: 36,
                }}
              >
                Close
              </button>
            </Card>
          )}

          {showReadingSetup && !showBookPicker && (
            <Card style={{ marginTop: 12, textAlign: 'center', padding: '16px 12px' }}>
              <button
                onClick={() => setShowBookPicker(true)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--dw-accent)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Plus size={16} />
                Choose a Book
              </button>
            </Card>
          )}
        </div>



        {/* 5. Commentary (if available for today's passage) */}
        {commentaryText && (
          <Card style={{ marginBottom: 16 }}>
            <p className="text-section-header" style={{ marginBottom: 8 }}>COMMENTARY — {commentarySource.toUpperCase()}</p>
            <p
              onClick={() => setSelection({ text: commentaryText, verseRefs: [primaryPassage], source: 'tap' })}
              style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.65, fontFamily: 'var(--font-serif)', cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' }}
            >
              {commentaryText}
            </p>
          </Card>
        )}

        {/* 6. Campus Section */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showCampusPicker ? 14 : 0 }}>
            <MapPin size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p className="text-section-header" style={{ marginBottom: 2 }}>YOUR CAMPUS</p>
              <p style={{
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}>
                {currentCampus?.name || 'Select your campus'}
              </p>
              {currentCampus?.city && (
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 1 }}>
                  {currentCampus.city}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCampusPicker(!showCampusPicker)}
              style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-accent)',
                borderRadius: 8,
                padding: '8px 14px',
                color: 'var(--dw-accent)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                minHeight: 36,
              }}
            >
              {currentCampus ? 'Change' : 'Select'}
            </button>
          </div>

          {showCampusPicker && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
                const regionCampuses = CAMPUSES.filter(c => c.region === region);
                if (!regionCampuses.length) return null;
                return (
                  <div key={region}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4, fontFamily: 'var(--font-sans)' }}>
                      {region}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {regionCampuses.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleCampusSelect(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 14px',
                            background: userProfile?.campus === c.id ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                            color: userProfile?.campus === c.id ? '#fff' : 'var(--dw-text-primary)',
                            border: 'none',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            textAlign: 'left',
                            minHeight: 42,
                          }}
                        >
                          <MapPin size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>{c.city}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Developer credit */}
        <div style={{
          textAlign: 'center',
          padding: '24px 0 12px',
          marginTop: 24,
          borderTop: '1px solid var(--dw-border-subtle)',
          opacity: 0.45,
          fontSize: 11,
          letterSpacing: 0.5,
          color: 'var(--dw-text-muted)',
        }}>
          Created &amp; Developed by Ashley Evans for Futures Church
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Hero card: slow colour wave rolling through gradient stops */
        @keyframes heroColorWave {
          0%   { background-position: 0% 30%; }
          25%  { background-position: 60% 70%; }
          50%  { background-position: 100% 40%; }
          75%  { background-position: 40% 80%; }
          100% { background-position: 0% 30%; }
        }

        /* Shimmer light sweeping left→right across the card */
        @keyframes heroShimmerSweep {
          0%   { left: -45%; opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }

        /* Play button idle: subtle border + shadow pulse */
        @keyframes heroIdlePulse {
          0%, 100% {
            box-shadow: 0 10px 32px rgba(0,0,0,0.35), 0 0 0 0px rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.3);
          }
          50% {
            box-shadow: 0 10px 36px rgba(0,0,0,0.4), 0 0 0 8px rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.55);
          }
        }

        /* Play button active: bigger ring pulse */
        @keyframes heroRingPulse {
          0%, 100% { box-shadow: 0 0 0 10px rgba(255,255,255,0.07), 0 0 0 22px rgba(255,255,255,0.03), 0 10px 32px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 16px rgba(255,255,255,0.1), 0 0 0 30px rgba(255,255,255,0.04), 0 10px 32px rgba(0,0,0,0.4); }
        }
      `}</style>
      <VerseNoteDrawer open={showNoteDrawer} onClose={() => setShowNoteDrawer(false)} />
      {/* Global highlight toolbar — appears for ANY selected text (scripture, devotion, quote, commentary) */}
      <HighlightToolbar onOpenNotes={() => setShowNoteDrawer(true)} onGoDeeper={() => { setBibleAIContext(selection?.text || ''); setShowBibleAI(true); }} />
      <GreekHebrewPopup onGoDeeper={(word) => { setBibleAIContext(word); setShowBibleAI(true); }} />
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(false)}
        initialContext={bibleAIContext}
        selectedText={selection?.text}
      />
    </div>
  );
}
