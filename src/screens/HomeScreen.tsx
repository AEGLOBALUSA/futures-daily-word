import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { HeroPhotoCarousel } from '../components/HeroPhotoCarousel';
import { ChevronLeft, ChevronRight, Search, Loader2, MapPin, Headphones, Pause, Play, BookOpen, Plus, X, Share2, Square, RotateCcw, FileText } from 'lucide-react';
import { ScriptureSkeleton } from '../components/Skeleton';
import { getDailyPassages, getDateString, getDailyQuoteIndex, getDayNumber } from '../utils/daily-passages';
import { shareContent } from '../utils/share';
import { fetchPassage, getServedTranslation, fetchStrongsMap, fetchAICommentary } from '../utils/api';
import type { TranslationCode, StrongsMap } from '../utils/api';
import * as AP from '../utils/audioPlayer';
import { QUOTES } from '../data/quotes';
import { COMMENTARY } from '../data/commentary';
import { CAMPUSES } from '../data/tokens';
import { useUser } from '../contexts/UserContext';
import { HighlightToolbar } from '../components/HighlightToolbar';
import { AudioWave } from '../components/AudioWave';
import { VerseNoteDrawer } from '../components/VerseNoteDrawer';
import { GreekHebrewPopup } from '../components/GreekHebrewPopup';
import { ScripturePassage } from '../components/ScripturePassage';
import { BibleAI } from '../components/BibleAI';
import { BibleSearch } from '../components/BibleSearch';
import { useScriptureSelection } from '../contexts/ScriptureSelectionContext';
import { PLAN_CATALOGUE } from '../data/plans';
import { displayPassage } from '../data/translations';
import { SetupPromptModal } from '../components/SetupPromptModal';
import { PWAInstallBanner } from '../components/PWAInstall';
import { FeedbackPoll } from '../components/FeedbackPoll';
// audioManager replaced by audioPlayer (AP) imported above
import { trackBehavior, getBehaviorProfile, hasEnoughBehavior } from '../utils/behavior';
import { track } from '../utils/analytics';
import { personalize } from '../utils/personalization';
import { getPersonaConfig, getGreeting, isNewChristianPersona } from '../utils/persona-config';
import type { Persona } from '../utils/persona-config';
import { UpgradePromptCard } from '../components/UpgradePromptCard';
import { BibleAIPromptSection, ComfortVerseBannerSection } from '../sections';
import type { TabId } from '../components/TabBar';
import { schedulePush, syncMisc, flushNow } from '../utils/cloudSync';
import { getStreak, recordStreakToday } from '../utils/streak';
import { getDailyWord } from '../data/daily-words';
import { BIBLE_BOOKS, BOOK_CHAPTERS } from '../data/bible-books';
import { ComfortSection, localDayIndex } from '../components/ComfortSection';
import { EmailNudgeCard } from '../components/EmailNudgeCard';
import { PromoAds } from '../components/PromoAds';
import { COMFORT_CHAPTERS } from '../data/comfort';
import { PastorStudyOnboarding } from '../components/PastorStudyOnboarding';
import { NewBelieverLessonCard } from '../components/NewBelieverLessonCard';
import { DailyWordCard } from '../components/DailyWordCard';
import { API_BASE } from '../utils/api-base';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
import { PastoralReflectionSection } from '../components/PastoralReflectionSection';
import { InlineReflection } from '../components/InlineReflection';
import { ReadingActionBar } from '../components/ReadingActionBar';
import { HomeContextChips } from '../components/HomeContextChips';
import { parseVerses } from '../utils/parseVerses';
import { DoneCelebration } from '../components/DoneCelebration';
import { hapticTap } from '../utils/haptics';
import type { PathwayDay, PathwayData, PathwayProgress } from '../data/pathway-types';
import { t as tI18n, tField, getLang, dateLocale } from '../utils/i18n';

// NLT removed from the pickers: its Tyndale API needs NLT_API_KEY (not set in Netlify),
// so it 500s and falls back to other text. Re-add 'NLT' once the key is configured.
const TRANSLATIONS: TranslationCode[] = ['ESV', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];
const NEW_FAITH_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV'];
const CONGREGATION_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV', 'KJV', 'NKJV'];
const COMFORT_TRANSLATIONS: TranslationCode[] = ['ESV', 'NIV'];

// Language-specific translation lists — non-English languages have their own available translations
const LANG_TRANSLATIONS: Record<string, TranslationCode[]> = {
  es: ['RV1960', 'NVI'],
  pt: ['ARA'],
  id: ['TB'],
};

/** Return the appropriate translation list for the current language and persona */
function getTranslationsForPersona(persona: string, lang: string): TranslationCode[] {
  if (LANG_TRANSLATIONS[lang]) return LANG_TRANSLATIONS[lang];
  if (persona === 'new_to_faith') return NEW_FAITH_TRANSLATIONS;
  if (persona === 'congregation') return CONGREGATION_TRANSLATIONS;
  if (persona === 'comfort') return COMFORT_TRANSLATIONS;
  return TRANSLATIONS;
}


// Streak logic now lives in one shared module (src/utils/streak.ts) so Home and
// Plans can't diverge. getStreak / recordStreakToday are imported at the top.



// ── Variable reward — rotate what leads home screen (day % 3) ───────────────
// ── Weekly "Word in Review" — show on Sundays ────────────────────────────────
const WEEK_REVIEW_QUESTIONS = [
  'What stood out most in what you read this week?',
  'Was there a verse that stayed with you?',
  'What is one thing God is saying to you?',
  'How did your reading shape your week?',
];
function getWeekReviewData(): { weekLabel: string; daysRead: number; streak: number; question: string } | null {
  try {
    const today = new Date();
    if (today.getDay() !== 0) return null; // Sundays only
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}-${today.getMonth()}`;
    const dismissed = localStorage.getItem('dw_week_review_dismissed');
    if (dismissed === weekKey) return null;
    const streak = getStreak().count;
    if (streak < 3) return null;
    const daysRead = Math.min(streak, 7);
    const question = WEEK_REVIEW_QUESTIONS[Math.floor(today.getDate() / 7) % WEEK_REVIEW_QUESTIONS.length];
    const weekLabel = today.toLocaleDateString(dateLocale(), { month: 'long', day: 'numeric' });
    return { weekLabel, daysRead, streak, question };
  } catch { return null; }
}


/** Calendar-based plan day — advances automatically each day regardless of completion */
function calcPlanDay(startedAt: string, totalDays: number): number {
  try {
    // Date-only stamps ('2026-08-25') parse as UTC midnight = the PREVIOUS local
    // day for any timezone west of UTC, which skipped Day 1 entirely (plans showed
    // Day 2 on their first day). Production dw_activeplans entries with that shape
    // persist and union-merge across devices, so the defensive local-axis parse is
    // required even though writers now store full ISO timestamps.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startedAt);
    const start = dateOnly
      ? new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3])
      : new Date(startedAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return Math.max(1, Math.min(elapsed + 1, totalDays));
  } catch {
    return 1;
  }
}



/* -- Faith Pathway types now live in ../data/pathway-types (imported above) -- */

interface ReadingSlot {
  id: string;
  book: string;
  currentChapter: number;
}

export function HomeScreen({ onNavigate, onBack }: { onNavigate?: (tab: TabId) => void; onBack?: () => void }) {
  const { userProfile, setup, saveProfile, saveSetup, requireEmail } = useUser();

  // ── Persona-aware feature gating (memoized — avoids recalc on every render) ──
  const personaConfig = useMemo(() => getPersonaConfig(setup?.persona), [setup?.persona]);
  const pf = personaConfig.features; // shorthand
  const greetingText = useMemo(
    () => getGreeting(personaConfig.persona, userProfile?.firstName || '', getStreak().count, getLang()),
    [personaConfig.persona, userProfile?.firstName],
  );


  const [dayOffset, setDayOffset] = useState(0);
  const [planDayOffset, setPlanDayOffset] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('dw_plan_day_offset');
      if (!raw) return 0;
      const { offset, date } = JSON.parse(raw);
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
      return date === today ? (offset ?? 0) : 0;
    } catch { return 0; }
  });
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  });
  useEffect(() => {
    const sync = () => {
      const next = (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
      setTranslation(prev => prev === next ? prev : next);
    };
    window.addEventListener('dw-translation-changed', sync);
    return () => window.removeEventListener('dw-translation-changed', sync);
  }, []);
  // ── Font size control ──
  const FONT_MIN = 13;
  const FONT_MAX = 32;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scriptureFontSize, setScriptureFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('dw_font_size');
    return saved ? Math.min(FONT_MAX, Math.max(FONT_MIN, parseInt(saved, 10))) : 15;
  });
  // Settings writes dw_font_size without remounting Home (tabs stay mounted).
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem('dw_font_size');
      setScriptureFontSize(saved ? Math.min(FONT_MAX, Math.max(FONT_MIN, parseInt(saved, 10))) : 15);
    };
    window.addEventListener('dw-font-size-changed', sync);
    return () => window.removeEventListener('dw-font-size-changed', sync);
  }, []);

  const [compareMode, setCompareMode] = useState(false);
  const [compareTranslation, setCompareTranslation] = useState<TranslationCode>('KJV');
  const [compareTexts, setCompareTexts] = useState<Record<string, string>>({});
  const [passageTexts, setPassageTexts] = useState<Record<string, string>>({});
  const [loadingPassages, setLoadingPassages] = useState<Set<string>>(new Set());
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const appLanguage = (() => {
    try { return localStorage.getItem('dw_lang') || 'en'; } catch { return 'en'; }
  })();

  // ── i18n: UI translations ──
  const UI_STRINGS: Record<string, Record<string, string>> = {
    'todays_reading': { en: "TODAY'S READING", es: "LECTURA DE HOY", pt: "LEITURA DE HOJE", id: "BACAAN HARI INI" },
    'listen_now': { en: "Listen Now", es: "Escuchar ahora", pt: "Ouça agora", id: "Dengarkan" },
    'read': { en: "Read", es: "Leer", pt: "Ler", id: "Baca" },
    'mark_complete': { en: "Mark Complete \u2192", es: "Marcar completo \u2192", pt: "Marcar completo \u2192", id: "Tandai Selesai \u2192" },
    'share': { en: "Share", es: "Compartir", pt: "Compartilhar", id: "Bagikan" },
    'font_size': { en: "Font Size", es: "Tam. de fuente", pt: "Tam. da fonte", id: "Ukuran Font" },
    'select_campus': { en: "Select Campus", es: "Seleccionar sede", pt: "Selecionar campus", id: "Pilih Kampus" },
    'search': { en: "Search", es: "Buscar", pt: "Buscar", id: "Cari" },
    'daily_word': { en: "Daily Word", es: "Palabra del D\u00eda", pt: "Palavra do Dia", id: "Firman Harian" },
    'reading_plan': { en: "READING PLAN", es: "PLAN DE LECTURA", pt: "PLANO DE LEITURA", id: "RENCANA BACAAN" },
    'reading_plans': { en: "READING PLANS", es: "PLANES DE LECTURA", pt: "PLANOS DE LEITURA", id: "RENCANA BACAAN" },
    'start_plan': { en: "Start This Plan \u2192", es: "Comenzar este plan \u2192", pt: "Come\u00e7ar este plano \u2192", id: "Mulai Rencana Ini \u2192" },
    'todays_reflection': { en: "Today's reflection", es: "Reflexi\u00f3n de hoy", pt: "Reflex\u00e3o de hoje", id: "Refleksi hari ini" },
    'previous_day': { en: "Previous day", es: "D\u00eda anterior", pt: "Dia anterior", id: "Hari sebelumnya" },
    'next_day': { en: "Next day", es: "D\u00eda siguiente", pt: "Pr\u00f3ximo dia", id: "Hari berikutnya" },
    'bible_ai': { en: "Bible AI", es: "Biblia IA", pt: "B\u00edblia IA", id: "Alkitab AI" },
    'home': { en: "Home", es: "Inicio", pt: "In\u00edcio", id: "Beranda" },
    'notes': { en: "Notes", es: "Notas", pt: "Notas", id: "Catatan" },
    'campus': { en: "Campus", es: "Sede", pt: "Campus", id: "Kampus" },
    'plans': { en: "Plans", es: "Planes", pt: "Planos", id: "Rencana" },
    'settings': { en: "Settings", es: "Ajustes", pt: "Configura\u00e7\u00f5es", id: "Pengaturan" },
    'listen': { en: "Listen", es: "Escuchar", pt: "Ouvir", id: "Dengarkan" },
    'commentary': { en: "Commentary", es: "Comentario", pt: "Coment\u00e1rio", id: "Komentar" },
    'note': { en: "Note", es: "Nota", pt: "Nota", id: "Catatan" },
    'save_notes': { en: "Save to Notes", es: "Guardar en notas", pt: "Salvar nas notas", id: "Simpan ke Catatan" },
    'welcome_back': { en: "Welcome back.", es: "Bienvenido de nuevo.", pt: "Bem-vindo de volta.", id: "Selamat datang kembali." },
    'im_new': { en: "I'm New to This", es: "Soy nuevo en esto", pt: "Sou novo nisso", id: "Saya Baru" },
    'featured': { en: "Featured", es: "Destacados", pt: "Destaques", id: "Unggulan" },
    'books': { en: "Books", es: "Libros", pt: "Livros", id: "Buku" },
    'sunday_service': { en: "Sunday Service \u2014 Open Sermon Notes", es: "Servicio dominical \u2014 Abrir notas del serm\u00f3n", pt: "Culto de domingo \u2014 Abrir notas do serm\u00e3o", id: "Ibadah Minggu \u2014 Buka Catatan Khotbah" },
    'tap_notes': { en: "Tap to take notes during today's message", es: "Toca para tomar notas durante el mensaje de hoy", pt: "Toque para fazer anota\u00e7\u00f5es durante a mensagem de hoje", id: "Ketuk untuk mencatat selama pesan hari ini" },
    'sermon_notes': { en: "Sermon Notes", es: "Notas del serm\u00f3n", pt: "Notas do serm\u00e3o", id: "Catatan Khotbah" },
    'esv_human': { en: "ESV \u00b7 Human Reader", es: "ESV \u00b7 Lector humano", pt: "ESV \u00b7 Leitor humano", id: "ESV \u00b7 Pembaca" },
    'day_label': { en: "DAY", es: "DÍA", pt: "DIA", id: "HARI" },
    'of_label': { en: "OF", es: "DE", pt: "DE", id: "DARI" },
    'now_playing': { en: 'Now Playing', es: 'Reproduciendo', pt: 'Reproduzindo', id: 'Sedang Diputar' },
    'paused_label': { en: 'Paused', es: 'Pausado', pt: 'Pausado', id: 'Dijeda' },
    'loading_label': { en: 'Loading\u2026', es: 'Cargando\u2026', pt: 'Carregando\u2026', id: 'Memuat\u2026' },
    'stop_all': { en: 'Stop All', es: 'Detener Todo', pt: 'Parar Tudo', id: 'Hentikan Semua' },
    'select_all_passages': { en: 'Select All', es: 'Seleccionar Todo', pt: 'Selecionar Tudo', id: 'Pilih Semua' },
    'passages_word': { en: 'Passages', es: 'Pasajes', pt: 'Passagens', id: 'Bagian' },
    'close_label': { en: 'Close', es: 'Cerrar', pt: 'Fechar', id: 'Tutup' },
    'esv_human_reader': { en: 'ESV \u00b7 Human Reader', es: 'ESV \u00b7 Lector Humano', pt: 'ESV \u00b7 Leitor Humano', id: 'ESV \u00b7 Pembaca Manusia' },
    'audio_unavailable': { en: 'Audio unavailable \u2014 tap Read to follow along', es: 'Audio no disponible \u2014 toca Leer para seguir', pt: '\u00c1udio indispon\u00edvel \u2014 toque Ler para acompanhar', id: 'Audio tidak tersedia \u2014 ketuk Baca untuk mengikuti' },
    'reaction_heart': { en: 'Touched my heart', es: 'Toc\u00f3 mi coraz\u00f3n', pt: 'Tocou meu cora\u00e7\u00e3o', id: 'Menyentuh hatiku' },
    'reaction_thinking': { en: 'Made me think', es: 'Me hizo pensar', pt: 'Me fez pensar', id: 'Membuatku berpikir' },
    'reaction_prayer': { en: 'I needed this', es: 'Necesitaba esto', pt: 'Eu precisava disso', id: 'Aku membutuhkan ini' },
    'days_this_week': { en: 'days this week', es: 'd\u00edas esta semana', pt: 'dias esta semana', id: 'hari minggu ini' },
    'day_streak': { en: 'day streak', es: 'd\u00edas seguidos', pt: 'dias seguidos', id: 'hari beruntun' },
    'setup_personal_time': { en: 'Personal time in the Word', es: 'Tiempo personal en la Palabra', pt: 'Tempo pessoal na Palavra', id: 'Waktu pribadi dalam Firman' },
    'setup_personal_desc': { en: 'Not for a sermon \u2014 just me and God', es: 'No para un serm\u00f3n \u2014 solo yo y Dios', pt: 'N\u00e3o para um serm\u00e3o \u2014 s\u00f3 eu e Deus', id: 'Bukan untuk khotbah \u2014 hanya aku dan Tuhan' },
    'setup_deep_study': { en: 'Deep study with full tools', es: 'Estudio profundo con todas las herramientas', pt: 'Estudo profundo com todas as ferramentas', id: 'Studi mendalam dengan semua alat' },
    'setup_deep_desc': { en: 'Commentary, Greek/Hebrew, cross-references', es: 'Comentario, griego/hebreo, referencias cruzadas', pt: 'Coment\u00e1rio, grego/hebraico, refer\u00eancias cruzadas', id: 'Komentar, Yunani/Ibrani, referensi silang' },
    'setup_rhythm': { en: 'A reading rhythm I can stick to', es: 'Un ritmo de lectura que puedo mantener', pt: 'Um ritmo de leitura que posso manter', id: 'Ritme membaca yang bisa kupertahankan' },
    'setup_rhythm_desc': { en: 'Consistent daily plan, right pace for my schedule', es: 'Plan diario constante, ritmo adecuado para mi horario', pt: 'Plano di\u00e1rio consistente, ritmo certo para minha agenda', id: 'Rencana harian konsisten, kecepatan tepat untuk jadwalku' },
    'setup_read_ahead': { en: "Read ahead of what I'm preaching", es: 'Leer antes de lo que voy a predicar', pt: 'Ler adiante do que vou pregar', id: 'Membaca lebih dulu dari yang akan kukhotbahkan' },
    'setup_read_ahead_desc': { en: 'Gospels, Acts, Letters \u2014 stay in the text', es: 'Evangelios, Hechos, Cartas \u2014 mantente en el texto', pt: 'Evangelhos, Atos, Cartas \u2014 fique no texto', id: 'Injil, Kisah, Surat \u2014 tetap dalam teks' },
    'chapters_1': { en: '1 chapter a day', es: '1 cap\u00edtulo al d\u00eda', pt: '1 cap\u00edtulo por dia', id: '1 pasal per hari' },
    'chapters_1_desc': { en: 'A gentle pace', es: 'Un ritmo suave', pt: 'Um ritmo suave', id: 'Kecepatan lembut' },
    'chapters_2': { en: '2 chapters a day', es: '2 cap\u00edtulos al d\u00eda', pt: '2 cap\u00edtulos por dia', id: '2 pasal per hari' },
    'chapters_2_desc': { en: 'A steady rhythm', es: 'Un ritmo constante', pt: 'Um ritmo constante', id: 'Ritme yang stabil' },
    'chapters_3': { en: '3 chapters a day', es: '3 cap\u00edtulos al d\u00eda', pt: '3 cap\u00edtulos por dia', id: '3 pasal per hari' },
    'chapters_3_desc': { en: 'Deeper immersion', es: 'Inmersi\u00f3n m\u00e1s profunda', pt: 'Imers\u00e3o mais profunda', id: 'Pendalaman lebih' },
    'your_notes_placeholder': { en: 'Your notes...', es: 'Tus notas...', pt: 'Suas notas...', id: 'Catatanmu...' },
    'search_books': { en: 'Search books...', es: 'Buscar libros...', pt: 'Buscar livros...', id: 'Cari buku...' },
    'ask_about_passage': { en: 'Ask about this passage\u2026', es: 'Pregunta sobre este pasaje\u2026', pt: 'Pergunte sobre esta passagem\u2026', id: 'Tanyakan tentang bagian ini\u2026' },
    'read_btn': { en: 'Read', es: 'Leer', pt: 'Ler', id: 'Baca' },
    'hide_reading': { en: 'Hide', es: 'Ocultar', pt: 'Ocultar', id: 'Sembunyikan' },
    'campus_stats_prompt': { en: 'Enter your campus pastor code to see live stats for your campus.', es: 'Ingresa tu código de pastor de sede para ver estadísticas en vivo de tu sede.', pt: 'Digite seu código de pastor de campus para ver estatísticas ao vivo do seu campus.', id: 'Masukkan kode pastor kampusmu untuk melihat statistik langsung kampusmu.' },
    'campus_stats_view': { en: 'View stats', es: 'Ver estadísticas', pt: 'Ver estatísticas', id: 'Lihat statistik' },
    'campus_stats_error': { en: 'Couldn’t load live stats — check your campus code.', es: 'No se pudieron cargar las estadísticas — verifica tu código de sede.', pt: 'Não foi possível carregar as estatísticas — verifique seu código de campus.', id: 'Statistik tidak dapat dimuat — periksa kode kampusmu.' },
  };
  const t = (key: string): string => UI_STRINGS[key]?.[appLanguage] || UI_STRINGS[key]?.['en'] || key;


  // Reading Slots state
  const [readingSlots, setReadingSlots] = useState<ReadingSlot[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_reading_slots') || '[]') as ReadingSlot[];
    } catch { return []; }
  });
  const [showReadingSetup, setShowReadingSetup] = useState(false);

  // Comfort reading state now lives in <ComfortSection> (src/components/ComfortSection.tsx).
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [bookPickerSearch, setBookPickerSearch] = useState('');
  const [loadedFirstSlotPassage, setLoadedFirstSlotPassage] = useState(false);

  // Chapters per day (from Settings)
  const [chaptersPerDay, setChaptersPerDay] = useState<number>(() => {
    // Default is ONE chapter a day — the old '3' made every default-config user's
    // "today" span three plan days (tripling audio/TTS too). Users who explicitly
    // chose a cadence keep their stored key.
    return parseInt(localStorage.getItem('dw_chapters_per_day') || '1', 10);
  });

  // Faith Pathway state
  const [pathwayData, setPathwayData] = useState<PathwayData | null>(null);
  const [pathwayProgress, setPathwayProgress] = useState<PathwayProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}') as PathwayProgress;
    } catch { return { completedDays: [], currentDay: 1, enrolled: false }; }
  });

  // Which pathway day the app SHOWS today. Once a day is completed the stored
  // currentDay points at tomorrow's lesson, but today's reading and lesson stay
  // on screen for the rest of the day — otherwise finishing the reading swapped
  // the chapter out from under the reader mid-page.
  const pathwayDisplayDay = (() => {
    const today = new Date().toLocaleDateString('en-CA');
    if (pathwayProgress.lastCompletedDate === today && pathwayProgress.lastCompletedDay) {
      return pathwayProgress.lastCompletedDay;
    }
    return pathwayProgress.currentDay || 1;
  })();

  // Audio state — powered by global AudioPlayer (single element, iOS-safe)
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentPassage, setAudioCurrentPassage] = useState<string | null>(null);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  // Sticky reading action bar: shown while the expanded chapter is on screen.
  // Callback ref (not useRef+effect) because the reading surface remounts per
  // chapter (key={readKey}) — the observer must follow the fresh node.
  const [readingBarVisible, setReadingBarVisible] = useState(false);
  const barNoteSelectionRef = useRef(false); // Note-from-bar selected the chapter; clear it when the drawer closes
  const readingObserverRef = useRef<IntersectionObserver | null>(null);
  const readingSurfaceRef = useCallback((node: HTMLDivElement | null) => {
    if (readingObserverRef.current) {
      readingObserverRef.current.disconnect();
      readingObserverRef.current = null;
    }
    if (!node) { setReadingBarVisible(false); return; }
    // Reading mode just opened — show the bar immediately; the observer only
    // refines this (hides it once the chapter is scrolled well out of view).
    // Some webviews suppress IO callbacks entirely, so never *depend* on one.
    setReadingBarVisible(true);
    const obs = new IntersectionObserver(
      ([entry]) => setReadingBarVisible(entry.isIntersecting),
      { rootMargin: '200px 0px 200px 0px' }
    );
    obs.observe(node);
    readingObserverRef.current = obs;
  }, []);

  // While reading, hide BOTH floating AI launchers (this screen's + the App-level one)
  // via a body class — the reading bar already offers "Ask AI". A body class reaches
  // both instances without prop-drilling; cleanup also covers a tab-switch mid-read.
  useEffect(() => {
    const apply = () => {
      const onHome = document.body.dataset.activeTab !== 'journal'
        && document.body.dataset.activeTab !== 'messages'
        && document.body.dataset.activeTab !== 'plans'
        && document.body.dataset.activeTab !== 'more'
        && document.body.dataset.activeTab !== 'sermon-notes';
      document.body.classList.toggle('dw-reading-active', readingBarVisible && onHome);
    };
    apply();
    window.addEventListener('dw-tab-changed', apply);
    return () => {
      window.removeEventListener('dw-tab-changed', apply);
      document.body.classList.remove('dw-reading-active');
    };
  }, [readingBarVisible]);

  // The I'm-New home carries nothing unrelated to the 40-day journey — that
  // includes the floating gold AI launcher (all mounted instances, hence a body
  // class like dw-reading-active above). CSS scopes it to the home tab, so the
  // launcher still shows for this persona on Journal etc. Layout effect, not
  // effect: the class must land before first paint or the launcher flashes for
  // a frame on cold boot.
  useLayoutEffect(() => {
    document.body.classList.toggle('dw-new-home', isNewChristianPersona(personaConfig.persona));
    return () => { document.body.classList.remove('dw-new-home'); };
  }, [personaConfig.persona]);

  // If the user leaves Home (e.g. taps a tab) while a bar-initiated chapter selection
  // is still set, clear it so returning doesn't show a gold-washed passage.
  useEffect(() => () => { if (barNoteSelectionRef.current) setSelection(null); }, []);
  const [showBibleAI, setShowBibleAI] = useState(false);
  const [bibleAIContext, setBibleAIContext] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const { selection, setSelection, greekHebrewMode, setGreekHebrewMode, setActivePopupWord, highlights, toggleHighlight } = useScriptureSelection();
  const audioSrcCache = useRef<Map<string, string>>(new Map());
  const [audioError, setAudioError] = useState(false);

  // Subscribe to global AudioPlayer state changes
  useEffect(() => {
    return AP.onStateChange((st, passage) => {
      setAudioPlaying(st === 'playing');
      setAudioLoading(st === 'loading');
      setAudioCurrentPassage(passage ?? null);
    });
  }, []);

  useEffect(() => {
    const stopHero = () => {
      heroQueueRef.current = [];
      heroQueueActiveRef.current = false;
    };
    window.addEventListener('dw-stop-hero-audio', stopHero);
    return () => window.removeEventListener('dw-stop-hero-audio', stopHero);
  }, []);

  // Other screens (e.g. the Plans hub's "Search the Bible" row) open the
  // Home-mounted BibleSearch through this event — matches the app's CustomEvent bus.
  useEffect(() => {
    const openSearch = () => setShowSearch(true);
    window.addEventListener('dw-open-search', openSearch);
    return () => window.removeEventListener('dw-open-search', openSearch);
  }, []);
  const [streakCount, setStreakCount] = useState(() => getStreak().count);
  // A brand-new user (fresh streak state per src/utils/streak.ts: lastDate '')
  // gets count=1 from the mount-effect below — that's not a streak yet, so on the
  // first-visit DAY (dw_first_open missing or today) the header chip shows nothing
  // instead of "1 day / Welcome back.". Real streaks (2+) always show.
  const isFirstVisitDay = (() => {
    try {
      const firstOpen = localStorage.getItem('dw_first_open');
      return !firstOpen || firstOpen === new Date().toLocaleDateString('en-CA');
    } catch { return false; }
  })();
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  // Deliberate "done" state for today's reading + the calm celebration card it triggers.
  const [readDoneToday, setReadDoneToday] = useState(() => {
    try { return localStorage.getItem('dw_reading_done') === new Date().toLocaleDateString('en-CA'); } catch { return false; }
  });
  const [doneCelebration, setDoneCelebration] = useState<number | null>(null);
  const [planFinish, setPlanFinish] = useState<{ title: string; days: number } | null>(null);
  const dailyWord = getDailyWord();
  // Emoji reaction
  // Weekly review
  const [weekReview] = useState(() => getWeekReviewData());
  const [weekReviewDismissed, setWeekReviewDismissed] = useState(false);
  const [selectedCommentaryIdx, setSelectedCommentaryIdx] = useState(0);
  const [commentaryExpanded, setCommentaryExpanded] = useState(pf.commentary === 'expanded');
  // AI fallback for days outside the curated commentary set — only fetched for
  // personas whose commentary arrives expanded (deeper_study, pastor_leader),
  // labelled honestly as AI Insight. fetchAICommentary caches 30 days locally.
  const [aiCommentary, setAiCommentary] = useState<{ passage: string; text: string } | null>(null);
  const currentCampus = CAMPUSES.find(c => c.id === userProfile?.campus);
  const lang = localStorage.getItem('dw_lang') || 'en';

  // Load Faith Pathway — persona-gated via config
  useEffect(() => {
    if (pf.faithPathway) {
      if (!pathwayProgress.enrolled) {
        const updated = { ...pathwayProgress, enrolled: true, completedDays: pathwayProgress.completedDays || [], currentDay: pathwayProgress.currentDay || 1 };
        setPathwayProgress(updated);
        try { localStorage.setItem('dw_pathway_progress', JSON.stringify(updated)); } catch {}
        try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
      }
      if (!pathwayData) {
        const _lang = getLang();
        const _pathwayUrl = _lang !== 'en' ? `/books/faith-pathway_${_lang}.json` : '/books/faith-pathway.json';
        // Mirror the length into dw_pathway_progress so the Read tab can show
        // "Day N of M" without fetching this 373KB file itself.
        const _apply = (data: PathwayData) => {
          setPathwayData(data);
          const total = data.days?.length || 40;
          const title = _lang === 'es' ? (data.titleEs || data.title)
            : _lang === 'pt' ? (data.titlePt || data.title)
            : _lang === 'id' ? (data.titleId || data.title)
            : data.title;
          // ‼️ Merge into whatever is CURRENTLY STORED — never rebuild this record
          // from React state. applyCloudData restores dw_pathway_progress straight
          // to localStorage without telling React, so a `{...prev}` write here
          // would stamp mount-time state over a just-restored cloud copy and the
          // next push would send that loss back to every device.
          try {
            const stored = JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}');
            if (stored.totalDays !== total || stored.title !== title) {
              localStorage.setItem('dw_pathway_progress', JSON.stringify({ ...stored, totalDays: total, title }));
            }
          } catch { /* quota / bad JSON */ }
          setPathwayProgress(prev => (
            (prev.totalDays === total && prev.title === title) ? prev : { ...prev, totalDays: total, title }
          ));
        };
        fetch(_pathwayUrl)
          .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
          .then(_apply)
          .catch(() => {
            // Fallback to English if translated file doesn't exist
            if (_lang !== 'en') {
              fetch('/books/faith-pathway.json')
                .then(r => r.json())
                .then(_apply)
                .catch(() => {});
            }
          });
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

  // Plan/setup sheet is DEFERRED — it no longer auto-pops on first run. Plan
  // selection now lives on the Home "Choose your reading plan" hero + the Plans tab.

  const savePathwayProgress = (p: PathwayProgress) => {
    // A newly completed pathway day is real engagement — count the streak
    // (recordStreakToday is idempotent per day, repo convention).
    if ((p.completedDays?.length || 0) > (pathwayProgress.completedDays?.length || 0)) {
      const r = recordStreakToday();
      if (r.isNew) setStreakCount(r.count);
    }
    setPathwayProgress(p);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(p)); } catch {}
    try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
  };

  // ── One day, one completion (new believers) ──────────────────────────────
  // The reading and the lesson are ONE daily unit, so finishing either finishes
  // the day. Before this, "Mark as read" on the hero and "Mark Complete" on the
  // lesson wrote to different stores: a new believer could read the whole day
  // and still be told "Just getting started" on a Day 1 that never advanced.
  const completeTodaysPathwayDay = (passage?: string) => {
    if (!pf.faithPathway || !pathwayProgress.enrolled || !pathwayData) return;
    const today = new Date().toLocaleDateString('en-CA');
    if (pathwayProgress.lastCompletedDate === today) return;
    const total = pathwayData.days?.length || 40;
    const day = pathwayProgress.currentDay || 1;
    if (pathwayProgress.completedDays?.includes(day)) return;
    // Only the pathway's OWN reading closes the pathway day. If this reader also
    // has an active plan the hero serves the plan's chapter instead, and crediting
    // the lesson for a chapter the lesson never taught would advance the journey
    // past content they were never shown. They complete it from the lesson card.
    const dayReading = pathwayData.days?.find((d: PathwayDay) => d.day === day)?.reading;
    if (passage && dayReading && passage !== `${dayReading.book} ${dayReading.chapter}`) return;
    savePathwayProgress({
      ...pathwayProgress,
      completedDays: [...(pathwayProgress.completedDays || []), day],
      currentDay: Math.min(total, day + 1),
      lastCompletedDay: day,
      lastCompletedDate: today,
      totalDays: total,
    });
  };

  // The other direction: completing the lesson also closes out today's reading,
  // so the hero flips to "Read today" and the streak/backup prompts see a real
  // read. No second celebration — the lesson card shows its own "day complete".
  const savePathwayProgressFromLesson = (p: PathwayProgress) => {
    savePathwayProgress(p);
    const today = new Date().toLocaleDateString('en-CA');
    if (localStorage.getItem('dw_reading_done') === today) return;
    // Finishing the lesson closes out the whole day — including an active plan's
    // day. The dw_reading_done stamp below is handleMarkRead's early-return guard,
    // so without crediting the plan here it could never be credited at all today.
    const heroPassage = heroChapterRefs[0];
    if (heroPassage) {
      const planResult = markPlanDayComplete(heroPassage);
      if (planResult?.planFinished) setPlanFinish({ title: planResult.planTitle, days: planResult.planDays });
    }
    try { localStorage.setItem('dw_reading_done', today); } catch { /* quota */ }
    setReadDoneToday(true);
    try { window.dispatchEvent(new Event('dw-reading-completed')); } catch { /* SSR/tests */ }
  };

  const saveReadingSlots = (slots: ReadingSlot[]) => {
    setReadingSlots(slots);
    syncMisc('dw_reading_slots', JSON.stringify(slots));
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
      track('campus_switched', campusId);
    } else {
      requireEmail(() => {});
    }
    setShowCampusPicker(false);
  };

  const passages = getDailyPassages(dayOffset);
  const dateStr = getDateString(dayOffset);
  const quoteIndex = getDailyQuoteIndex(dayOffset, QUOTES.length);
  const quote = QUOTES[quoteIndex];

  // Fetch a single passage on demand (tap to read)
  const loadPassage = useCallback((passage: string) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

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

  /** Mark the current plan day as completed for a given passage */
  // Marks the plan day complete and reports whether this completion FINISHED the whole
  // plan (all days done) — once, via a finishedCelebrated guard — so the finish-line
  // celebration fires exactly once.
  const markPlanDayComplete = (passage: string): { planFinished: boolean; planTitle: string; planDays: number } | null => {
    try {
      const planEntry = todaysPlanPassages.find(p => p.passage === passage);
      if (!planEntry) return null;
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number; finishedCelebrated?: boolean }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const prog = ap[planEntry.planId];
      if (!prog) return null;
      if (!Array.isArray(prog.completedDays)) prog.completedDays = [];
      if (!prog.completedDays.includes(planEntry.dayNum)) {
        prog.completedDays.push(planEntry.dayNum);
        prog.lastDay = Math.max(prog.lastDay || 0, planEntry.dayNum);
        localStorage.setItem('dw_activeplans', JSON.stringify(ap));
        try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
      }
      const planDef = PLAN_CATALOGUE.find(p => p.id === planEntry.planId);
      const total = planDef?.totalDays || 0;
      if (total > 0 && prog.completedDays.length >= total && !prog.finishedCelebrated) {
        prog.finishedCelebrated = true;
        localStorage.setItem('dw_activeplans', JSON.stringify(ap));
        return { planFinished: true, planTitle: planDef?.title || 'your plan', planDays: total };
      }
      return { planFinished: false, planTitle: planDef?.title || '', planDays: total };
    } catch { return null; }
  };

  // Read: expand + load + mark plan day complete. Listen: expand + load + play audio when ready.
  // Deliberate completion: the user taps "Mark as read" → mark the plan day done, count
  // the streak (idempotent — app-open already recorded today), and show a calm "done"
  // celebration. Replaces auto-marking on open (focus-group: completion needs intent).
  const handleMarkRead = (passage: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    if (localStorage.getItem('dw_reading_done') === today) { setReadDoneToday(true); return; }
    try { localStorage.setItem('dw_reading_done', today); } catch { /* quota */ }
    const result = markPlanDayComplete(passage);
    completeTodaysPathwayDay(passage);
    recordStreakToday();
    setReadDoneToday(true);
    hapticTap(18);
    if (result?.planFinished) {
      setPlanFinish({ title: result.planTitle, days: result.planDays });
    } else {
      setDoneCelebration(getStreak().count);
    }
  };

  const handleRead = (passage: string) => {
    // Chapter vs verse-range are the same reading (hero uses "John 3", plan
    // cards may pass "John 3:16-21"). Collapse if either form is already open.
    const chapter = passage.replace(/:\d+(-\d+)?$/, '').trim();
    const isOpen = [...expandedPassages].some((e) => {
      const eCh = e.replace(/:\d+(-\d+)?$/, '').trim();
      return e === passage || e === chapter || eCh === chapter;
    });
    if (isOpen) {
      setExpandedPassages(new Set());
      return;
    }
    // Open this passage — audio keeps playing so user can listen + read together
    setExpandedPassages(new Set([chapter]));
    loadPassage(chapter);
    if (passage !== chapter) loadPassage(passage);
    trackBehavior('passage_read', passage);
    track('daily_reading', passage);
    // Mark this plan day as completed — and if that completion FINISHED the whole
    // plan, show the finish celebration (the one-shot finishedCelebrated flag was
    // previously consumed here silently, so finishing a plan ended with nothing).
    const done = markPlanDayComplete(passage);
    if (done?.planFinished) setPlanFinish({ title: done.planTitle, days: done.planDays });
  };

  const handleListen = (passage: string) => {
    // Unlock iOS audio synchronously on user gesture tap
    AP.unlock();
    setAudioError(false);
    const key = `${passage}_${translation}`;
    // Toggle off
    if (AP.isPlaying(passage)) {
      AP.stop();
      return;
    }
    if (audioPlaying) AP.stop();
    setShowSetupModal(false);
    setExpandedPassages(new Set([passage]));
    if (passageTexts[key]) {
      handleAudio(passage);
    } else {
      loadPassage(passage);
      pendingAudioRef.current = passage;
    }
  };

  // Clean up audio on unmount — also kill hero chain to prevent orphan playback
  useEffect(() => {
    return () => { heroQueueActiveRef.current = false; AP.stop(); };
  }, []);


  // Record today as a reading day + handle streak freeze + milestone
  useEffect(() => {
    const result = recordStreakToday();
    if (result.isNew) {
      setStreakCount(result.count);
      if (result.isMilestone) {
        setTimeout(() => setShowMilestone(result.count), 600);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track first-open date (read by pathway-upgrades). The day-2 plan-modal nudge is
  // deferred too — the Home hero + Plans tab are the plan entry points now.
  useEffect(() => {
    if (!localStorage.getItem('dw_first_open')) {
      // LOCAL calendar day (repo invariant) — not the UTC toISOString slice.
      localStorage.setItem('dw_first_open', new Date().toLocaleDateString('en-CA'));
    }
  }, []);

  // Reset expanded passages when the day or translation changes so the next
  // reading starts hidden (Read reveals it). Does NOT stop audio: with a plan
  // active the strip below drives planDayOffset (its own effect handles the day
  // change), so a dayOffset tick here is a no-op for the plan reading and killing
  // commute audio for it was pure loss.
  useEffect(() => {
    setExpandedPassages(new Set());
    setPassageTexts({});
    setCompareTexts({});
  }, [dayOffset, translation, planDayOffset]);

  // Persist planDayOffset (date-keyed so it resets on a new calendar day)
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    try { localStorage.setItem('dw_plan_day_offset', JSON.stringify({ offset: planDayOffset, date: today })); } catch {}
    if (planDayOffset !== 0) track('plan_day_manual_nav', String(planDayOffset));
    stopAudio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDayOffset]);

  // (Calendar-day roll-over is handled by the resume/focus effect near stopAudio,
  // which actually clicks the plan over to the new day — not just telemetry.)

  useEffect(() => {
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        if (plan.bookId) continue; // book plans aren't scripture — skip the verse prefetch
        const rawDay = calcPlanDay(prog.startedAt, plan.totalDays);
        const dn = Math.max(1, Math.min(rawDay + planDayOffset, plan.totalDays));
        const dp = plan.passages[dn - 1];
        if (!dp) continue;
        dp.split(', ').forEach(p => loadPassage(p.trim()));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation, planDayOffset]);

  // Auto-load faith pathway scripture reading for new_to_faith persona
  useEffect(() => {
    if (!pf.faithPathway || !pathwayData || !pathwayProgress.enrolled) return;
    if (personaConfig.sectionOrder.includes('devotion')) return; // only for plan-based personas
    const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === pathwayDisplayDay);
    if (!dayData) return;
    const reading = dayData.reading;
    if (!reading) return;
    // Use full chapter as the reading (e.g., "Ephesians 2" instead of "Ephesians 2:8-9")
    const fullChapter = `${reading.book} ${reading.chapter}`;
    loadPassage(fullChapter);
  // pathwayDisplayDay is a dep: at the midnight rollover the display day
  // advances while pathwayProgress is unchanged, and a user with reading
  // slots never hits the heroChapterRefs fallback fetch — without this dep
  // the Day N surface spun on "Loading scripture" until a full reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathwayData, pathwayProgress, translation, pathwayDisplayDay]);


  const todaysPlanPassages = (() => {
    try {
      // New Christians read the 40-day pathway, not catalog plans (Ashley).
      if (personaConfig.persona === 'new_to_faith') {
        try { localStorage.setItem('dw_todays_plan_passages', '[]'); } catch {}
        return [] as Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; titleId?: string; author: string; body: string; bodyId?: string } }>;
      }
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const out: Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; titleId?: string; author: string; body: string; bodyId?: string } }> = [];
      for (const [pid, prog] of Object.entries(ap)) {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) continue;
        // Book plans read their own content in the book reader / Study Notes; their
        // "passages" are devotional day-titles (e.g. "Day 1: ..."), NOT scripture refs,
        // so they must NOT drive the hero's scripture button (would feed the verse API
        // a non-reference and render garbage). Scripture plans only.
        if (plan.bookId) continue;
        const rawDay = calcPlanDay(prog.startedAt, plan.totalDays);
        const dn = Math.max(1, Math.min(rawDay + planDayOffset, plan.totalDays));

        // Respect chaptersPerDay: pull N consecutive passages starting from today's day
        const numPassages = Math.max(1, chaptersPerDay);
        for (let offset = 0; offset < numPassages; offset++) {
          const dayIdx = dn - 1 + offset;
          if (dayIdx >= plan.totalDays) break; // don't exceed plan length
          const dp = plan.passages[dayIdx];
          const dev = plan.devotionals?.[dayIdx];
          const dayNum = dn + offset;
          if (dp) dp.split(', ').forEach((p, i) => out.push({ planId: pid, planTitle: tField(plan, 'title', lang), passage: p.trim(), dayNum, devotional: i === 0 ? dev : undefined }));
        }
      }
      // Show all explicitly activated plans regardless of persona
      const filtered = out;
      // Persist today's plan passages so Study Notes tab can read them
      try { localStorage.setItem('dw_todays_plan_passages', JSON.stringify(filtered)); } catch {}
      return filtered;
    } catch { return [] as Array<{ planId: string; planTitle: string; passage: string; dayNum: number; devotional?: { title: string; titleId?: string; author: string; body: string; bodyId?: string } }>; }
  })();

  // Commentary covers EVERY passage of the day (not just the first) — each entry
  // keeps its passage so the card can label which chapter it belongs to.
  const commentarySources = COMMENTARY as Record<string, Record<string, string>>;
  const allCommentaries: { source: string; text: string; passage: string }[] = [];
  {
    const seenCommentaryRefs = new Set<string>();
    for (const { passage } of todaysPlanPassages) {
      if (seenCommentaryRefs.has(passage)) continue;
      seenCommentaryRefs.add(passage);
      for (const [source, entries] of Object.entries(commentarySources)) {
        if (entries[passage]) {
          allCommentaries.push({ source, text: entries[passage], passage });
        }
      }
    }
  }
  // Outside the curated set, expanded-commentary personas still land with
  // commentary: the AI fallback slots in as the sole entry, honestly labelled.
  if (allCommentaries.length === 0 && aiCommentary && pf.commentary === 'expanded') {
    allCommentaries.push({ source: 'AI Insight', text: aiCommentary.text, passage: aiCommentary.passage });
  }
  const commentaryPassageCount = new Set(allCommentaries.map(c => c.passage)).size;

  // If the user has an active Ashley-Jane plan, sync the devotion to that plan's day
  // instead of using the calendar-based rotation (which doesn't match the hero reading)
  const planDevotion = todaysPlanPassages.find(p => p.devotional)?.devotional;
  const planVerse = todaysPlanPassages[0]?.passage || '';
  const todaysDevotion = planDevotion
    ? { title: planDevotion.title, titleId: (planDevotion as Record<string, string>).titleId || '', body: planDevotion.body, bodyId: (planDevotion as Record<string, string>).bodyId || '', verse: planVerse, author: planDevotion.author, source: 'ashley-jane' as const }
    : null;

  // Auto-load devotion-connected scripture for congregation persona
  useEffect(() => {
    if (!personaConfig.sectionOrder.includes('devotion_scripture')) return;
    const devVerse = todaysDevotion?.verse || ''; // e.g. "2 Timothy 1"
    if (!devVerse) return;
    loadPassage(devVerse);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysDevotion?.verse, translation]);

  // Preload audio for plan passages in the background once text is available
  useEffect(() => {
    if (todaysPlanPassages.length === 0) return;
    todaysPlanPassages.forEach(({ passage }) => {
      const tKey = `${passage}_${translation}`;
      const text = passageTexts[tKey];
      if (!text) return;
      const cacheKey = tKey;
      if (audioSrcCache.current.has(cacheKey)) return; // already cached
      // Silently preload — don't auto-play, just warm the cache. MUST pass the
      // same slice as playback (handleAudio, 20000): a shorter preload slice was
      // cached under the same key and cut TTS audio off ~1/3 into long chapters.
      AP.fetchAudioSrc(text.slice(0, 20000), translation, passage).then(src => {
        if (src) audioSrcCache.current.set(cacheKey, src);
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageTexts, translation]);

  // (Compare-text fetch effect lives below, after heroChapterRefs is defined —
  // it needs the plan-passages ∪ reading-slots union to cover slot cards.)

  // ── Hero full-passage state (always ESV for real human audio) ──────────────
  // heroFullText removed — audio now fetches per-chapter on demand
  const [heroLoading, setHeroLoading] = useState(false);
  const [planTick, setPlanTick] = useState(0); // increment to force plan list re-render

  // A fresh Church Member lands on today's Daily Word reading (Ashley & Jane) —
  // auto-start the plan ONCE when they arrive with nothing to read. Once-only
  // (dw_aj_autostarted) so a later quit is respected: this is a fill, never a
  // re-enrol. The PR #59 auto-start was lost in the cold-start rework (0c083a50).
  useEffect(() => {
    if (personaConfig.persona !== 'congregation') return;
    try {
      if (localStorage.getItem('dw_aj_autostarted')) return;
      const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      if (Object.keys(ap).length > 0 || readingSlots.length > 0) {
        localStorage.setItem('dw_aj_autostarted', '1');
        return;
      }
      ap['ashley-jane-daily-word'] = { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 };
      localStorage.setItem('dw_activeplans', JSON.stringify(ap));
      localStorage.setItem('dw_aj_autostarted', '1');
      const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}');
      if (_sp.email) schedulePush(_sp.email);
      setPlanTick(t => t + 1);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaConfig.persona]);
  const HERO_KEY = '__hero__';

  // ── Hero day-navigation boundary checks ──────────────────────────────────
  const hasActivePlans = todaysPlanPassages.length > 0;

  const heroCanGoBack = useMemo(() => {
    try {
      const ap: Record<string, { startedAt: string }> = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      return Object.entries(ap).some(([pid, prog]) => {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan || plan.bookId) return false;
        return calcPlanDay(prog.startedAt, plan.totalDays) + planDayOffset > 1;
      });
    } catch { return false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDayOffset, planTick]);

  const heroCanGoForward = useMemo(() => {
    try {
      const ap: Record<string, { startedAt: string }> = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      return Object.entries(ap).some(([pid, prog]) => {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan || plan.bookId) return false;
        return calcPlanDay(prog.startedAt, plan.totalDays) + planDayOffset < plan.totalDays;
      });
    } catch { return false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDayOffset, planTick]);

  const handleTranslationChange = (t: TranslationCode) => {
    setTranslation(t);
    localStorage.setItem('dw_translation', t);
    track('translation_switch', t);
  };

  const stopAudio = () => {
    AP.stop();
  };

  // ── Daily plan roll-over ───────────────────────────────────────────────────
  // calcPlanDay is calendar-based, but it's only read at render time. If the app
  // is left open or resumed from the background across midnight, nothing re-renders
  // it — so the plan would stay on yesterday's reading until a hard reload. This
  // detects a new calendar day on resume/focus and clicks the plan over to today.
  const rolloverDayRef = useRef<string>(new Date().toLocaleDateString('en-CA'));
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    rolloverDayRef.current = today;
    const prevSeen = localStorage.getItem('dw_last_open_date');
    if (prevSeen && prevSeen !== today) track('plan_day_calendar_rollover', today);
    try { localStorage.setItem('dw_last_open_date', today); } catch { /* quota */ }

    const rollIfNewDay = () => {
      if (document.visibilityState === 'hidden') return;
      const now = new Date().toLocaleDateString('en-CA');
      if (now === rolloverDayRef.current) return; // still the same calendar day
      rolloverDayRef.current = now;
      try { localStorage.setItem('dw_last_open_date', now); } catch { /* quota */ }
      track('plan_day_calendar_rollover', now);
      // Click the daily plan over to the new day's reading.
      stopAudio();
      setPlanDayOffset(0);
      setDayOffset(0);
      // readDoneToday recomputed against the same LOCAL date axis as the rollover.
      setReadDoneToday(localStorage.getItem('dw_reading_done') === now);
      // Don't wipe passageTexts/expanded here — the day/translation-keyed load
      // effects refresh the new day's reading; clearing could blank the panel when
      // heroKey is unchanged (clamped-finished plan, or no active plan).
      setPlanTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', rollIfNewDay);
    window.addEventListener('focus', rollIfNewDay);
    // Backstop for a tab/kiosk that stays open, visible AND focused across
    // midnight — neither visibilitychange nor focus fires then, and in-page taps
    // don't refire focus. rollIfNewDay is idempotent (rolloverDayRef compare),
    // so a minute tick is cheap and only acts once per calendar day.
    const rollInterval = window.setInterval(rollIfNewDay, 60000);
    return () => {
      document.removeEventListener('visibilitychange', rollIfNewDay);
      window.removeEventListener('focus', rollIfNewDay);
      window.clearInterval(rollInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Campus Overview — REAL analytics (pastor_leader only) ──────────────────
  // The old grid fabricated "reading today" / "active this week" / "prayer
  // requests" from a deterministic seed on the campus id — pastors were quoting
  // invented engagement numbers. It now shows ONLY what /api/analytics-dashboard
  // returns for the pastor's own campus code (campus-scoped, no PII); without a
  // working code it shows the code prompt, never fake numbers.
  const [campusStats, setCampusStats] = useState<{ campus: string; readingToday: number; activeThisWeek: number; prayerCount: number } | null>(null);
  const [campusStatsError, setCampusStatsError] = useState(false);
  const [campusStatsLoading, setCampusStatsLoading] = useState(false);
  const [pastorCodeInput, setPastorCodeInput] = useState('');
  const [campusStatsRetry, setCampusStatsRetry] = useState(0);
  const [pastorCode, setPastorCode] = useState<string>(() => {
    try { return localStorage.getItem('dw_pastor_code') || ''; } catch { return ''; }
  });

  useEffect(() => {
    if (personaConfig.persona !== 'pastor_leader' || !pastorCode) return;
    let cancelled = false;
    setCampusStatsLoading(true);
    setCampusStatsError(false);
    fetch(`${API_BASE}/api/analytics-dashboard`, { headers: { 'X-Pastor-Code': pastorCode } })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(json => {
        if (cancelled) return;
        // A campus code gets the campus-scoped shape; the admin/master codes get
        // the global shape (full dashboard lives in More) — only render numbers
        // the API actually sent for THIS campus.
        if (json && json.scope === 'campus') {
          setCampusStats({
            campus: String(json.campus || ''),
            readingToday: Number(json.readingToday) || 0,
            activeThisWeek: Number(json.activeThisWeek) || 0,
            prayerCount: Number(json.prayerCount) || 0,
          });
        } else {
          setCampusStats(null);
          setCampusStatsError(true);
        }
      })
      .catch(() => { if (!cancelled) { setCampusStats(null); setCampusStatsError(true); } })
      .finally(() => { if (!cancelled) setCampusStatsLoading(false); });
    return () => { cancelled = true; };
  }, [personaConfig.persona, pastorCode, campusStatsRetry]);

  const submitPastorCode = () => {
    const code = pastorCodeInput.trim().toUpperCase();
    if (!code) return;
    try { localStorage.setItem('dw_pastor_code', code); } catch { /* quota */ }
    setCampusStatsError(false);
    setPastorCode(code);
    setCampusStatsRetry(n => n + 1); // refetch even when the code is unchanged
  };

  /** Play audio for a passage using the global AudioPlayer */
  const handleAudio = async (passage: string) => {
    // iOS FIX: unlock audio session synchronously within the tap gesture
    AP.unlock();

    // Toggle off if already playing this passage
    if (AP.isPlaying(passage)) {
      AP.stop();
      return;
    }
    if (audioPlaying) AP.stop();

    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    const isInvalidText = !text || text.length < 20
      || text.includes('tidak tersedia')
      || text === 'World English Bible text — loading...';
    if (isInvalidText) { setAudioError(true); return; }

    setAudioError(false);
    trackBehavior('audio_played', passage);
    track('audio_play', passage, { translation });

    try {
      const cacheKey = `${passage}_${translation}`;
      let src = audioSrcCache.current.get(cacheKey);
      if (!src) {
        src = await AP.fetchAudioSrc(text.slice(0, 20000), translation, passage) ?? undefined;
        if (src) audioSrcCache.current.set(cacheKey, src);
      }
      if (src) {
        await AP.playUrl(passage, src);
      } else {
        setAudioError(true);
      }
    } catch {
      setAudioError(true);
    }
  };

  const handleSetupComplete = (newChapters: number, planIds: string[]) => {
    // Save chapters per day
    setChaptersPerDay(newChapters);
    syncMisc('dw_chapters_per_day', String(newChapters));
    // Start selected plans
    if (planIds.length > 0) {
      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
      const updated = { ...existing };
      for (const id of planIds) {
        if (!updated[id]) {
          // Full ISO timestamp like startPlanFromHome/PlansScreen.startPlan — a
          // date-only UTC slice made calcPlanDay skip Day 1 west of UTC.
          updated[id] = { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 };
        }
      }
      localStorage.setItem('dw_activeplans', JSON.stringify(updated));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
    }
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
    // Re-render plan passages reactively — no full-page reload / white-flash
    setPlanTick(t => t + 1);
  };

  const handleSetupDismiss = () => {
    localStorage.setItem('dw_setup_dismissed', '1');
    setShowSetupModal(false);
  };


  const filteredBooks = BIBLE_BOOKS.filter(book =>
    book.toLowerCase().includes(bookPickerSearch.toLowerCase())
  );

  // (A&J devotional now handled by getTodaysDevotion() — single source for entire site)

  // All active plans with progress — used for home page plan strip
  // planTick dependency ensures this recomputes after start/remove
  const homeActivePlans = (() => {
    void planTick;
    try {
      const ap: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      const bookPlans: Record<string, { currentChapter: number; totalChapters: number }> =
        (() => { try { return JSON.parse(localStorage.getItem('dw_book_plans') || '{}'); } catch { return {}; } })();
      return Object.entries(ap).map(([pid, prog]) => {
        const plan = PLAN_CATALOGUE.find(p => p.id === pid);
        if (!plan) return null;
        // Book plans are CHAPTER-driven, not calendar-driven: 19 elapsed days
        // with zero chapters read is not "✓ Complete". Mirror PlansScreen and
        // read dw_book_plans.currentChapter (0 progress when the entry is
        // missing). This only READS book-plan progress — book plans stay
        // excluded from the hero scripture pipeline.
        if (plan.bookId) {
          const bp = bookPlans[plan.bookId];
          return { plan, dayNum: bp ? bp.currentChapter + 1 : 0 };
        }
        // Use calendar-based day to match hero display (not completion count)
        const dayNum = calcPlanDay(prog.startedAt, plan.totalDays);
        return { plan, dayNum };
      }).filter(Boolean) as { plan: typeof PLAN_CATALOGUE[0]; dayNum: number }[];
    } catch { return []; }
  })();

  // Start a plan directly from home screen
  const startPlanFromHome = (planId: string) => {
    try {
      const existing: Record<string, { startedAt: string; completedDays: number[]; lastDay: number }> =
        JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      if (existing[planId]) return; // already active
      existing[planId] = { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 };
      localStorage.setItem('dw_activeplans', JSON.stringify(existing));
      try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}

      // If this is a book plan, also initialize dw_book_plans so progress tracking works
      const planDef = PLAN_CATALOGUE.find(p => p.id === planId);
      if (planDef?.bookId && planDef.bookJsonFile) {
        const bookPlans: Record<string, { jsonFile: string; title: string; author: string; currentChapter: number; totalChapters: number; startedAt: string }> =
          (() => { try { return JSON.parse(localStorage.getItem('dw_book_plans') || '{}'); } catch { return {}; } })();
        if (!bookPlans[planDef.bookId]) {
          // Store the BASE path only. fetchBookJson (PlansScreen) localizes at
          // fetch time and falls back to English; storing a localized path here
          // double-suffixed it ('..._id_id.json'), which the SPA fallback then
          // answered with 200 HTML — breaking book plans for non-English users.
          bookPlans[planDef.bookId] = {
            jsonFile: planDef.bookJsonFile,
            title: planDef.title,
            author: 'Pastor Ashley Evans',
            currentChapter: 0,
            totalChapters: planDef.totalDays,
            startedAt: new Date().toISOString(),
          };
          localStorage.setItem('dw_book_plans', JSON.stringify(bookPlans));
          try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
        }
      }

      setPlanTick(t => t + 1); // trigger re-render
    } catch {}
  };


  // ── Hero chapter refs — all today's passages expanded to full chapter level (memoized) ──
  const expandChapterRef = useCallback((ref: string) => ref.replace(/:\d+(-\d+)?$/, '').trim(), []);
  const heroChapterRefs = useMemo(() => {
    const refs = [
      ...todaysPlanPassages.map(p => expandChapterRef(p.passage)),
      ...readingSlots
        .slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length))
        .map(s => `${s.book} ${s.currentChapter}`),
    ];
    // Persona fallback — comfort and new-believer users have auto-served content,
    // so an empty plan/slot state lands them on that reading instead of the
    // "Choose your reading plan" funnel. Scripture refs only: book plans stay
    // excluded from the hero pipeline.
    if (refs.length === 0) {
      if (personaConfig.persona === 'comfort') {
        const comfortRef = COMFORT_CHAPTERS[localDayIndex() % COMFORT_CHAPTERS.length];
        if (comfortRef) refs.push(comfortRef);
      } else if (personaConfig.persona === 'new_to_faith' && pathwayProgress.enrolled && pathwayData) {
        const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === pathwayDisplayDay);
        if (dayData?.reading) refs.push(`${dayData.reading.book} ${dayData.reading.chapter}`);
      }
    }
    return refs.filter((r, i, arr) => Boolean(r) && arr.indexOf(r) === i);
  }, [todaysPlanPassages, readingSlots, chaptersPerDay, passages, expandChapterRef, personaConfig.persona, pathwayProgress, pathwayDisplayDay, pathwayData]);
  const heroKey = heroChapterRefs.join('|');
  const isReadingOpen = useCallback((ref: string) => {
    if (!ref || expandedPassages.size === 0) return false;
    if (expandedPassages.has(ref)) return true;
    const ch = expandChapterRef(ref);
    if (expandedPassages.has(ch)) return true;
    for (const e of expandedPassages) {
      if (expandChapterRef(e) === ch) return true;
    }
    return false;
  }, [expandedPassages, expandChapterRef]);

  // Fetch compare text when compare mode or translation changes. Covers BOTH the
  // raw plan passages (plan cards key compareTexts by the un-expanded ref) AND
  // heroChapterRefs, which unions plan chapters with visible reading slots —
  // slot cards' compare panels previously spun "Loading…" forever because
  // nothing ever fetched their keys.
  useEffect(() => {
    if (!compareMode) return;
    const refs = [
      ...todaysPlanPassages.map(p => p.passage),
      ...heroChapterRefs,
    ].filter((r, i, arr) => Boolean(r) && arr.indexOf(r) === i);
    refs.forEach(passage => {
      const cKey = `${passage}_${compareTranslation}`;
      if (compareTexts[cKey]) return; // already loaded
      fetchPassage(passage, compareTranslation)
        .then(text => {
          setCompareTexts(prev => ({ ...prev, [cKey]: text }));
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareMode, compareTranslation, todaysPlanPassages, heroKey]);

  // Pre-load today's chapter texts in background (for read view)
  // Does NOT set heroLoading — that's only for audio loading feedback
  // Pre-load ALL chapter texts immediately so Read shows content instantly
  useEffect(() => {
    if (!heroKey) return;
    heroChapterRefs.forEach(ref => {
      const key = `${ref}_${translation}`;
      if (passageTexts[key]) return; // already loaded
      fetchPassage(ref, translation)
        .then(text => {
          if (text) setPassageTexts(prev => ({ ...prev, [key]: text }));
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroKey, translation]);

  // ── Hero multi-chapter sequential playback with chapter tracking ──
  const heroQueueRef = useRef<string[]>([]);
  const heroQueueActiveRef = useRef(false);
  const heroChainVersionRef = useRef(0); // version counter to kill stale chains
  // One-shot within-chapter resume time ({key, idx, t} rides in dw_hero_chapter_idx,
  // throttle-saved during playback) — consumed on the day's first hero play.
  const heroResumeRef = useRef<{ idx: number; t: number } | null>(null);
  const [heroChapterIndex, setHeroChapterIndex] = useState(() => {
    try {
      // Persisted as {key, idx} and honoured ONLY when the stored key matches the
      // current heroKey. A bare index survived across days, so a fresh morning
      // launch auto-opened (and played from) yesterday's LAST chapter — the
      // reset-on-change effect below never fires on a fresh mount. Legacy plain
      // numbers and parse failures fall back to 0.
      const saved = JSON.parse(localStorage.getItem('dw_hero_chapter_idx') || 'null');
      if (saved && saved.key === heroKey && Number.isInteger(saved.idx) && saved.idx >= 0) {
        if (typeof saved.t === 'number' && saved.t > 10) heroResumeRef.current = { idx: saved.idx, t: saved.t };
        return saved.idx;
      }
      return 0;
    } catch { return 0; }
  });
  const [audioPaused, setAudioPaused] = useState(false);
  const heroChapterIndexRef = useRef(heroChapterIndex);

  useEffect(() => {
    heroChapterIndexRef.current = heroChapterIndex;
    try { localStorage.setItem('dw_hero_chapter_idx', JSON.stringify({ key: heroKey, idx: heroChapterIndex })); } catch { /* quota */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroChapterIndex]);

  // Throttle-save the within-chapter position while the hero chain is playing so
  // an app kill mid-chapter can resume ({key, idx, t} — the same shape the state
  // initializer above reads back). Chapter advances rewrite {key, idx} without t,
  // which is correct: a new chapter starts from the top.
  useEffect(() => {
    if (!audioPlaying || audioCurrentPassage !== HERO_KEY) return;
    const id = window.setInterval(() => {
      try {
        localStorage.setItem('dw_hero_chapter_idx',
          JSON.stringify({ key: heroKey, idx: heroChapterIndexRef.current, t: AP.getCurrentTime() }));
      } catch { /* quota */ }
    }, 5000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlaying, audioCurrentPassage, heroKey]);

  // Reset chapter index when day or plan changes (heroKey reflects current passages)
  const prevHeroKeyRef = useRef(heroKey);
  useEffect(() => {
    if (prevHeroKeyRef.current !== heroKey) {
      prevHeroKeyRef.current = heroKey;
      setHeroChapterIndex(0);
      heroQueueActiveRef.current = false;
    }
  }, [heroKey]);

  // Auto-follow: when audio advances to next chapter, update the Read text panel
  // too — but only if the reader already tapped Read (do not dump scripture
  // just because the chapter pill moved).
  useEffect(() => {
    if (expandedPassages.size > 0 && heroChapterRefs[heroChapterIndex]) {
      const newRef = heroChapterRefs[heroChapterIndex];
      if (!expandedPassages.has(newRef)) {
        setExpandedPassages(new Set([newRef]));
        loadPassage(newRef);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroChapterIndex]);

  // Arrival IS the reading, already open (Ashley's persona-flow spec, 1 Sep):
  // for the four returning personas, seed today's chapter open on load. The
  // seed must NOT go through handleRead — that credits the plan day, fires
  // analytics, and can trigger the plan-finish celebration; it only expands
  // and fetches. Declared AFTER the reset effect and sharing its triggers so
  // it re-seeds right after every clear, while a manual Hide (same day, same
  // translation) sticks. I'm New is exempt — its journey opens full-screen
  // from the journey hero, and completion stays deliberate everywhere.
  useEffect(() => {
    if (isNewChristianPersona(personaConfig.persona)) return;
    const ref = heroChapterRefs[heroChapterIndex] || heroChapterRefs[0];
    if (!ref) return;
    setExpandedPassages(new Set([expandChapterRef(ref)]));
    loadPassage(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroKey, dayOffset, translation, planDayOffset]);

  // Commentary must actually be there when it "arrives expanded": the curated
  // set covers ~20 chapters, so on other days deeper_study / pastor_leader get
  // the drawer's AI commentary (30-day cached) for today's chapter instead.
  useEffect(() => {
    if (pf.commentary !== 'expanded') return;
    if (allCommentaries.length > 0 && allCommentaries[0].source !== 'AI Insight') return;
    const ref = heroChapterRefs[heroChapterIndex] || heroChapterRefs[0];
    if (!ref) { setAiCommentary(null); return; }
    let alive = true;
    fetchAICommentary(expandChapterRef(ref), lang)
      .then(text => { if (alive && text) setAiCommentary({ passage: expandChapterRef(ref), text }); })
      .catch(() => { /* commentary is best-effort */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroKey, lang, pf.commentary]);

  useEffect(() => {
    return AP.onStateChange((st) => {
      setAudioPaused(st === 'paused');
    });
  }, []);

  // Resolves true when playback started for this (or a later) chapter — or when
  // the chain was superseded/stopped, which is not the caller's failure to show.
  // Resolves false ONLY when the chain exhausted every remaining chapter without
  // any audio: the caller surfaces that as audioError (previously the chain
  // resolved silently and offline taps did visibly nothing, forever).
  const playChapterAtIndex = async (index: number, chainVersion?: number): Promise<boolean> => {
    const myVersion = chainVersion ?? heroChainVersionRef.current;

    if (index < 0 || index >= heroChapterRefs.length) {
      heroQueueActiveRef.current = false;
      return false; // nothing (left) to play
    }
    if (myVersion !== heroChainVersionRef.current) return true; // superseded

    setHeroChapterIndex(index);
    const ref = heroChapterRefs[index];
    const cacheKey = ref + '_' + translation;

    try {
      // ── Fetch audio source (from cache or network) ──
      let src = audioSrcCache.current.get(cacheKey);
      if (!src) {
        const text = await fetchPassage(ref, translation).catch(() => '');
        if (myVersion !== heroChainVersionRef.current) return true;
        if (text) {
          src = await AP.fetchAudioSrc(text, translation, ref) ?? undefined;
          if (src) audioSrcCache.current.set(cacheKey, src);
        }
      }
      if (myVersion !== heroChainVersionRef.current) return true;

      if (!src) {
        // No audio available — skip to next chapter
        if (heroQueueActiveRef.current && myVersion === heroChainVersionRef.current) {
          return await playChapterAtIndex(index + 1, myVersion);
        }
        return true; // stopped mid-chain — not an exhaustion
      }

      // ── Pre-fetch next chapter in background ──
      if (index + 1 < heroChapterRefs.length) {
        const nextRef = heroChapterRefs[index + 1];
        const nextKey = nextRef + '_' + translation;
        if (!audioSrcCache.current.has(nextKey)) {
          fetchPassage(nextRef, translation)
            .then(text => text ? AP.fetchAudioSrc(text, translation, nextRef) : null)
            .then(url => { if (url) audioSrcCache.current.set(nextKey, url); })
            .catch(() => {});
        }
      }

      // ── Play this chapter ──
      AP.resetForChain();
      await AP.playUrl(HERO_KEY, src);

      // After playUrl returns, audio is either playing or failed
      if (AP.getState() !== 'playing') {
        // playUrl failed — skip to next
        if (heroQueueActiveRef.current && myVersion === heroChainVersionRef.current) {
          return await playChapterAtIndex(index + 1, myVersion);
        }
        return true;
      }

      // Within-chapter resume (one-shot): the day's first play of the saved
      // chapter picks up where a killed session left off. Near-start times skip.
      if (heroResumeRef.current) {
        const resume = heroResumeRef.current;
        heroResumeRef.current = null;
        if (resume.idx === index && resume.t > 10) {
          try { AP.seekTo(resume.t); } catch { /* ignore */ }
        }
      }

      // ── Wait for audio to finish (uses ended event + state listener) ──
      const result = await AP.waitForEnd();

      // Completion integrity: credit the plan day ONLY when playback actually
      // reached the end — Stop after five seconds (or a media error) is not a
      // completed reading.
      if (result === 'ended') {
        const today = new Date().toLocaleDateString('en-CA');
        if (index === heroChapterRefs.length - 1 && localStorage.getItem('dw_reading_done') !== today) {
          // Listening through the END of the whole reading completes the day:
          // handleMarkRead credits the plan day, stamps dw_reading_done (en-CA),
          // records the streak and picks the finish-vs-done celebration itself.
          // Deferred a tick so the chain's state churn settles first.
          setTimeout(() => handleMarkRead(ref), 0);
        } else {
          const done = markPlanDayComplete(ref);
          if (done?.planFinished) {
            // The one-shot finishedCelebrated flag was previously consumed here
            // silently — surface the plan-finish celebration instead.
            const finish = { title: done.planTitle, days: done.planDays };
            setTimeout(() => setPlanFinish(finish), 0);
          }
        }
      }

      // If user stopped, don't advance
      if (result === 'stopped' && AP.wasStopRequested()) {
        heroQueueActiveRef.current = false;
        return true;
      }

      // Advance to next chapter
      if (heroQueueActiveRef.current && myVersion === heroChainVersionRef.current) {
        await playChapterAtIndex(index + 1, myVersion);
      }
      return true; // this chapter played — a later exhaustion isn't a failure
    } catch {
      // On error, try next chapter
      if (heroQueueActiveRef.current && myVersion === heroChainVersionRef.current) {
        return await playChapterAtIndex(index + 1, myVersion);
      }
      return true;
    }
  };

  /** Fire the hero chain at startIdx and keep the play button honest.
   *  onStateChange replays the CURRENT state synchronously on subscribe — 'idle'
   *  at this point — so 'idle' is only terminal AFTER the chain has been seen
   *  active ('loading'/'playing'); the old instant-settle cancelled the spinner
   *  in the same tick and disarmed the double-tap guard. If the whole chain
   *  exhausts without producing any audio (offline, all providers down), set
   *  audioError and satisfy the hero error line's gate so the failure is VISIBLE. */
  const startHeroChain = (startIdx: number, version: number) => {
    let unsub: (() => void) | null = null;
    let settled = false;
    let sawActive = false;
    const settle = () => {
      settled = true;
      setHeroLoading(false);
      if (unsub) { unsub(); unsub = null; }
    };
    unsub = AP.onStateChange((st) => {
      if (st === 'loading' || st === 'playing') sawActive = true;
      if (st === 'playing' || (sawActive && st === 'idle' && !AP.isLoading())) settle();
    });
    // onStateChange can fire synchronously (before `unsub` is assigned) — clean up now.
    if (settled && unsub) { (unsub as () => void)(); unsub = null; }

    playChapterAtIndex(startIdx, version)
      .then(anyPlayed => {
        if (!anyPlayed && version === heroChainVersionRef.current) {
          setAudioError(true);
          setAudioCurrentPassage(HERO_KEY); // error line is gated on the hero key
        }
        if (!settled) settle(); // exhausted without a state change — stop the spinner
      })
      .catch(() => {
        if (version === heroChainVersionRef.current) {
          setAudioError(true);
          setAudioCurrentPassage(HERO_KEY);
        }
        if (!settled) settle();
      });
  };

  const handleHeroListen = () => {
    AP.unlock(); // must be synchronous in tap handler

    // Ignore taps while audio is loading — prevents duplicate requests
    if (AP.isLoading() || heroLoading) return;

    setAudioError(false);

    // If paused, resume — optimistic UI update for instant response
    if (AP.isPaused(HERO_KEY)) {
      setAudioPaused(false);
      setAudioPlaying(true);
      AP.resume();
      return;
    }

    // Toggle pause if playing — optimistic UI update
    if (AP.isPlaying(HERO_KEY)) {
      setAudioPaused(true);
      setAudioPlaying(false);
      AP.pause();
      return;
    }

    if (audioPlaying) AP.stop();
    if (heroChapterRefs.length === 0) return;

    // Show loading IMMEDIATELY so user sees feedback on tap
    setHeroLoading(true);

    // Bump version to kill any stale chains
    const newVersion = ++heroChainVersionRef.current;

    // Start from saved chapter index (or 0 if out of range)
    const startIdx = heroChapterIndexRef.current < heroChapterRefs.length
      ? heroChapterIndexRef.current : 0;
    heroQueueActiveRef.current = true;

    // Fire and forget — the chain runs autonomously through all chapters
    startHeroChain(startIdx, newVersion);
  };

  // Select a chapter without starting audio (tapped on chapter pill or slider when idle)
  const handleHeroSelect = (index: number) => {
    setHeroChapterIndex(index);
  };

  // Skip to a specific chapter AND play it (only used when audio is already active)
  const handleHeroSkipTo = (index: number) => {
    AP.unlock();
    setAudioError(false);
    if (audioPlaying || audioPaused) AP.stop();
    // Bump version to kill any stale chains
    const newVersion = ++heroChainVersionRef.current;
    heroQueueActiveRef.current = true;
    setHeroLoading(true);
    startHeroChain(index, newVersion);
  };

  // Spacebar toggles play/pause on hero audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Space on a focused control must activate it, not hijack hero audio.
      if (el?.closest?.('button, [role="button"], a, [contenteditable="true"]')) return;
      // Ditto while any modal/gate is open on top of the mounted Home screen.
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      handleHeroListen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHeroListen]);

  // Instant Gk/Heb: per-passage word→Strong's maps from bolls' KJV tags,
  // prefetched while the mode is on so a tap resolves locally (no AI round-trip).
  const strongsMapsRef = useRef<Record<string, StrongsMap | null>>({});
  useEffect(() => {
    if (!greekHebrewMode) return;
    for (const passage of expandedPassages) {
      if (passage in strongsMapsRef.current) continue;
      strongsMapsRef.current[passage] = null; // in flight
      fetchStrongsMap(passage).then((m) => { strongsMapsRef.current[passage] = m; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greekHebrewMode, expandedPassages]);

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
            trackBehavior('greek_hebrew', `${word} in ${passage}`);
            // Instant path first: resolve the word against the passage's KJV
            // Strong's map and open the lexicon popup (its "Study this word"
            // button remains the deliberate AI deep-dive). ESV↔KJV wording
            // differs, so unmatched words fall back to the old AI flow.
            const smap = strongsMapsRef.current[passage];
            const nums = smap?.byWord[word.toLowerCase()];
            if (smap && nums && nums.length) {
              setActivePopupWord({ word, strongsNum: nums[0], testament: smap.testament });
              return;
            }
            setBibleAIContext(`Please explain the original Greek or Hebrew meaning of the word "${word}" as it appears in ${passage}. Include the Strongs number if known, the original language word, its transliteration, definition, and how it enriches understanding of this verse.`);
            setShowBibleAI(true);
          }}
          style={{
            cursor: 'pointer',
            borderBottom: '1px dotted var(--dw-gold)',
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

  const isNewPath = isNewChristianPersona(personaConfig.persona);

  // Sermon notes — one tap from Home, kept slim. Its position depends on the
  // path: above the hero ONLY for I'm-New in the Sunday window (the QR guest
  // flow lands people as new_to_faith and they need it up top on a Sunday);
  // for the four returning personas it renders BELOW the reading — nothing
  // sits above today's reading (persona-flow spec, 1 Sep).
  const sermonNotesRow = (
    <button
      onClick={() => onNavigate?.('sermon-notes')}
      aria-label={tI18n('sermon_notes_title', lang)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        margin: '0 0 16px', padding: '14px 16px',
        background: '#1C1410',
        border: 'none',
        borderRadius: 14, cursor: 'pointer', textAlign: 'left', minHeight: 52,
      }}
    >
      <FileText size={20} style={{ color: 'var(--dw-info, #4C7E97)', flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--dw-info, #4C7E97)',
          fontFamily: 'var(--font-sans)', marginBottom: 2,
        }}>
          This week
        </span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#F5EFE6', fontFamily: 'var(--font-sans)' }}>
          {tI18n('sermon_notes_title', lang)}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'rgba(245,239,230,0.58)', fontFamily: 'var(--font-sans)', marginTop: 1 }}>
          {tI18n('sermon_notes_home_sub', lang)}
        </span>
      </span>
      <span style={{ color: 'rgba(245,239,230,0.45)', fontSize: 16, flexShrink: 0 }}>→</span>
    </button>
  );

  // Full-screen Day N journey surface (new_to_faith) — opened from the journey
  // hero; the browser back gesture closes it via the card's useSubView.
  const [showJourneyDay, setShowJourneyDay] = useState(false);
  // One-tap "What this means" question queued for Bible AI (I'm-New study sheet).
  const [bibleAIQuestion, setBibleAIQuestion] = useState('');

  return (
    <div className="screen-container">
      {doneCelebration !== null && (
        <DoneCelebration streakCount={doneCelebration} onClose={() => {
          setDoneCelebration(null);
          // Announce the finished reading only once this moment is closed, so the
          // push ask (which waits on it) can never land on top of the celebration
          // — the two post-reading prompts must not stack.
          try { window.dispatchEvent(new Event('dw-reading-completed')); } catch { /* SSR/tests */ }
        }} />
      )}
      {planFinish !== null && (
        <DoneCelebration streakCount={0} planFinish={planFinish} onClose={() => {
          setPlanFinish(null);
          try { window.dispatchEvent(new Event('dw-reading-completed')); } catch { /* SSR/tests */ }
        }} />
      )}
      {showSetupModal && (
        <SetupPromptModal
          onComplete={handleSetupComplete}
          onDismiss={handleSetupDismiss}
        />
      )}
      <div style={{ padding: '0 24px 0' }}>
        {/* ── Hero viewport ── fills visible screen */}
        <div style={{
          minHeight: 'calc(100svh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 20,
          paddingBottom: 64,
          position: 'relative',
        }}>

        {/* Header — compact, sits above the centered hero.
            On a 375px screen this row can hold Back + the Bible AI pill + the title
            column + the streak. Without minWidth:0 the title column was being crushed
            to ~55px, so "Daily Word" wrapped to two lines and the glyphs overflowed
            their box and overprinted the streak text. Let the title column shrink
            properly and keep the title on one line instead. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 auto' }}>
            {/* Back button — only shown when there's navigation history. Unified with ScreenHeader pattern. */}
            {onBack && (
              <button
                aria-label={tI18n('back', lang)}
                onClick={onBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 8px 6px 2px', display: 'flex', alignItems: 'center', gap: 4,
                  color: 'var(--dw-accent)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  borderRadius: 8,
                }}
              >
                <ChevronLeft size={20} /> {tI18n('back', lang)}
              </button>
            )}
            {/* {t('bible_ai')} button — burnished gold + glass. Not on the I'm-New
                home: nothing there may compete with the sage journey button; Bible AI
                stays reachable from the reading action bar while a chapter is open. */}
            {!isNewPath && <button
              onClick={() => { setBibleAIContext(''); setShowBibleAI(true); }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                height: 44,
                borderRadius: 11,
                background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
                backgroundSize: '200% 200%',
                animation: 'aiAurora 4s ease infinite',
                border: '1px solid rgba(245,207,85,0.55)',
                boxShadow: '0 3px 18px rgba(160,110,8,0.65), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.22)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {/* Glass top-catch highlight */}
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '46%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)',
                borderRadius: '11px 11px 0 0',
                pointerEvents: 'none',
              }} />
              {/* Burnished shimmer sweep */}
              <span style={{
                position: 'absolute', top: 0, bottom: 0, width: '55%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%)',
                animation: 'aiBeam 3s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: '#fff',
                fontFamily: "'SF Pro Display', 'system-ui', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                position: 'relative',
                textShadow: '0 1px 3px rgba(80,40,0,0.6)',
              }}>{t('bible_ai')}</span>
            </button>}
            {/* minWidth keeps "Daily Word" legible at 320px: rather than let the row
                crush this column to ~43px (which truncated the title to "Da…"), the
                header wraps the streak block onto a second line instead. */}
            <div style={{ minWidth: 96 }}>
              {/* Localized full-date eyebrow above the Daily Word title — sits in the top-left header column,
                  formatted via Intl.DateTimeFormat for the user's chosen language. */}
              <span style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: isNewPath ? 'var(--dw-new)' : 'var(--dw-accent)',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.04em',
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {(() => {
                  try { return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date()); }
                  catch { return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
                })()}
              </span>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                // Shrink to fit a narrow header instead of wrapping and overflowing.
                // Sized to leave slack at 320px and while the serif webfont is still
                // loading — at 5.6vw it fit with 0px to spare and ellipsised on FOUT.
                fontSize: 'clamp(17px, 5vw, 24px)',
                fontWeight: 400,
                color: 'var(--dw-text-primary)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                Daily Word
              </h1>
              {/* Compact context chips — tap to change persona or campus in place.
                  Hidden on the I'm-New path: the chip was one accidental tap off the
                  40-day journey, and its labels aren't about the journey. Persona and
                  campus remain changeable in Settings (two-step Save & Apply). */}
              {!isNewPath && <HomeContextChips
                persona={personaConfig.persona}
                campusId={userProfile?.campus || ''}
                onPersonaChange={(id: Persona) => {
                  // Deliberate choice on the chip itself — stamp + sync (not a silent default).
                  saveSetup({ persona: id, source: 'settings' });
                  flushNow();
                  track('persona_change', id);
                }}
                onCampusChange={(id) => {
                  saveProfile({
                    email: userProfile?.email || '',
                    firstName: userProfile?.firstName || '',
                    lastName: userProfile?.lastName || '',
                    phone: userProfile?.phone || '',
                    church: userProfile?.church || '',
                    city: userProfile?.city || '',
                    campus: id,
                  });
                  track('campus_switched', id);
                }}
              />}
            </div>
          </div>
          {/* Streak display — clean counter (hidden for new_to_faith + comfort to avoid pressure) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {personaConfig.persona !== 'new_to_faith' && personaConfig.persona !== 'comfort' && streakCount > 0 && !(streakCount <= 1 && isFirstVisitDay) && (() => {
              const encouragement: [number, string][] = [1, 2, 3, 5, 7, 10, 14, 21, 30, 40, 60, 90, 100, 180, 365]
                .map(n => [n, tI18n(`streak_enc_${n}`, lang)] as [number, string]);
              const label = [...encouragement].reverse().find(([n]) => streakCount >= n)?.[1] ?? null;
              const isMilestone = streakCount >= 7;
              return (
                <div
                  onClick={() => isMilestone && setShowMilestone(streakCount)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    cursor: isMilestone ? 'pointer' : 'default',
                    gap: 1,
                  }}
                  onPointerDown={e => isMilestone && (e.currentTarget.style.opacity = '0.7')}
                  onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{
                    fontSize: 17, fontWeight: 800, lineHeight: 1,
                    color: 'var(--dw-text)',
                    fontFamily: 'var(--font-sans)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.03em',
                  }}>
                    {streakCount} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--dw-text-muted)', letterSpacing: 0 }}>{streakCount === 1 ? tI18n('day_word', lang) : tI18n('days_word', lang)}</span>
                  </span>
                  {label && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, lineHeight: 1,
                      color: 'var(--dw-text-muted)',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.01em',
                      animation: 'fadeIn 0.5s ease',
                      whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  )}
                </div>
              );
            })()}
            <ThemeToggle />
          </div>
        </div>

        {/* ── Persona Greeting with Search Button ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            color: 'var(--dw-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.5,
            letterSpacing: '0.01em',
            flex: 1,
          }}>
            {greetingText}
          </p>
          {pf.searchEnabled && (
            <button
              aria-label={t('search')}
              onClick={() => setShowSearch(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--dw-text-muted)',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dw-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dw-text-muted)')}
            >
              <Search size={20} />
              {/* Text label — the app's most differentiated feature shouldn't hide
                  behind one unlabeled icon. */}
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{t('search')}</span>
            </button>
          )}
        </div>

        {/* Sermon notes — just below the greeting, always visible */}
        {sermonNotesRow}

        {/* What this actually is — one line, for the persona that has never used
            a Bible app. Only while they are early in the pathway. */}
        {pf.faithPathway && pathwayProgress.enrolled && (pathwayProgress.completedDays?.length || 0) < 3 && (
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5,
            color: 'var(--dw-text-muted)', textAlign: 'center',
            margin: '-4px 0 16px', padding: '0 8px',
          }}>
            {tI18n('pathway_how_it_works', lang)}
          </p>
        )}

        {(() => {
          const firstPlan = todaysPlanPassages[0];
          const firstSlot = readingSlots[0];
          const hasAnyPassage = heroChapterRefs.length > 0 || firstPlan || firstSlot;

          // New believers have a reading — it just arrives with the pathway JSON.
          // Until then the hero must NOT flash the "Choose your reading plan"
          // funnel OR the shared audio hero (a slot-holding new believer has
          // hasAnyPassage true, but their home is still the journey): this is
          // the one persona deliberately exempt, and it is the first thing they
          // ever see.
          if ((!hasAnyPassage || isNewPath) && pf.faithPathway && pathwayProgress.enrolled && !pathwayData) return (
            <div key="hero-pathway-loading" style={{
              position: 'relative', borderRadius: 24, overflow: 'hidden',
              marginBottom: 20,
              boxShadow: '0 18px 40px rgba(40,28,16,0.18), 0 4px 14px rgba(40,28,16,0.10)',
              border: '1px solid rgba(40,28,16,0.06)',
            }}>
              <HeroPhotoCarousel />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(176deg, rgba(30,20,12,0.40) 0%, rgba(30,20,12,0.10) 30%, rgba(30,20,12,0.18) 58%, rgba(30,20,12,0.62) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1, color: '#fff', padding: '28px 24px 24px', textAlign: 'center', textShadow: '0 1px 10px rgba(20,12,6,0.55), 0 1px 2px rgba(20,12,6,0.35)', pointerEvents: 'none' }}>
                <div style={{ height: 16 }} />
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-serif)', margin: '0 0 8px', lineHeight: 1.3 }}>
                  {tI18n('pathway_hero_loading', lang)}
                </p>
                <div style={{ height: 40 }} />
              </div>
            </div>
          );

          // The I'm-New home IS the 40-day journey (Ashley, 1 Sep): one sage
          // object — the photo plate, Day N, title, progress, and a single tap
          // that opens the full-screen Day N reading. No audio / translation /
          // chevron chrome on this persona's home; the shared hero below stays
          // exactly as it was for every other persona.
          if (isNewPath && pf.faithPathway && pathwayProgress.enrolled && pathwayData) {
            const jDay = pathwayData.days?.find((d: PathwayDay) => d.day === pathwayDisplayDay);
            if (jDay) {
              const jTitle = lang === 'es' ? (jDay.titleEs || jDay.title)
                : lang === 'pt' ? (jDay.titlePt || jDay.title)
                : lang === 'id' ? (jDay.titleId || jDay.title)
                : jDay.title;
              const jSeries = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
                : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
                : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
                : pathwayData.title;
              const jCompleted = pathwayProgress.completedDays?.length || 0;
              const jTotal = pathwayData.days?.length || 40;
              return (
                <div key="hero-journey" style={{
                  position: 'relative', borderRadius: 24, overflow: 'hidden',
                  marginBottom: 20,
                  boxShadow: '0 18px 40px rgba(40,28,16,0.18), 0 4px 14px rgba(40,28,16,0.10)',
                  border: '1px solid rgba(40,28,16,0.06)',
                }}>
                  <HeroPhotoCarousel />
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(176deg, rgba(30,20,12,0.40) 0%, rgba(30,20,12,0.10) 30%, rgba(30,20,12,0.18) 58%, rgba(30,20,12,0.62) 100%)' }} />
                  <div style={{ position: 'relative', zIndex: 1, color: '#fff', padding: '24px 24px 24px', textAlign: 'center', textShadow: '0 1px 10px rgba(20,12,6,0.55), 0 1px 2px rgba(20,12,6,0.35)', pointerEvents: 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'var(--font-sans)', margin: '0 0 6px', opacity: 0.9 }}>
                      {t('day_label')} {pathwayDisplayDay} {t('of_label')} {jTotal} · {jSeries}
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif)', margin: '0 0 14px', lineHeight: 1.25 }}>
                      {jTitle}
                    </p>
                    <div style={{ height: 4, maxWidth: 220, margin: '0 auto 18px', background: 'rgba(255,255,255,0.28)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(jCompleted / jTotal) * 100}%`, height: '100%', background: 'var(--dw-new)', borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <button
                      onClick={() => setShowJourneyDay(true)}
                      aria-label={`${t('read_btn')} ${t('day_label')} ${pathwayDisplayDay}`}
                      style={{
                        padding: '14px 34px', borderRadius: 14, border: 'none',
                        background: 'var(--dw-new)', color: 'var(--dw-new-on-fill)',
                        cursor: 'pointer', fontSize: 15, fontWeight: 700,
                        fontFamily: 'var(--font-sans)', letterSpacing: '0.02em',
                        pointerEvents: 'auto', textShadow: 'none',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
                      }}
                    >
                      {readDoneToday ? tI18n('read_today', lang) : t('read_btn')}
                    </button>
                  </div>
                </div>
              );
            }
          }

          // No active plan or slot — show a "Start a Plan" prompt in the hero card
          if (!hasAnyPassage) return (
            <div key="hero-no-plan" style={{
              position: 'relative', borderRadius: 24, overflow: 'hidden',
              marginBottom: 20,
              boxShadow: '0 18px 40px rgba(40,28,16,0.18), 0 4px 14px rgba(40,28,16,0.10)',
              border: '1px solid rgba(40,28,16,0.06)',
            }}>
              <HeroPhotoCarousel />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(176deg, rgba(30,20,12,0.40) 0%, rgba(30,20,12,0.10) 30%, rgba(30,20,12,0.18) 58%, rgba(30,20,12,0.62) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1, color: '#fff', padding: '28px 24px 24px', textAlign: 'center', textShadow: '0 1px 10px rgba(20,12,6,0.55), 0 1px 2px rgba(20,12,6,0.35)', pointerEvents: 'none' }}>
                <div style={{ height: 16 }} />
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-serif)', margin: '0 0 8px', lineHeight: 1.3 }}>
                  {tI18n('choose_reading_plan', lang)}
                </p>
                <p style={{ fontSize: 14, opacity: 0.72, fontFamily: 'var(--font-sans)', margin: '0 0 22px', lineHeight: 1.5 }}>
                  {tI18n('pick_plan_syncs', lang)}
                </p>
                <button
                  className="dw-hero-light-btn"
                  onClick={() => onNavigate?.('plans')}
                  style={{
                    padding: '14px 28px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.4)',
                    background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer',
                    fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)',
                    letterSpacing: '0.02em', pointerEvents: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  {tI18n('browse_plans', lang)}
                </button>
              </div>
            </div>
          );

          const allLabels = heroChapterRefs.length > 0
            ? heroChapterRefs
            : [firstPlan ? expandChapterRef(firstPlan.passage) : `${firstSlot!.book} ${firstSlot!.currentChapter}`];
          const planLabel = firstPlan ? `${firstPlan.planTitle} — ${tI18n('p_day_of', lang)} ${firstPlan.dayNum}` : null;
          const isPlayingHero = audioPlaying && audioCurrentPassage === HERO_KEY;
          const isPausedHero = audioPaused && audioCurrentPassage === HERO_KEY;
          const isLoadingHero = (audioLoading && audioCurrentPassage === HERO_KEY) || heroLoading;

          return (
            <div
              key="hero-listen"
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 20,
                boxShadow: '0 18px 40px rgba(40,28,16,0.18), 0 4px 14px rgba(40,28,16,0.10)',
                border: '1px solid rgba(40,28,16,0.06)',
              }}
            >
              {/* ── Photo plate: a graded Futures community frame (Paradise), bounded
                   so it reads as an editorial image — not a wallpaper behind the UI. ── */}
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '16 / 10',
                overflow: 'hidden', background: '#2A2218',
              }}>
                <HeroPhotoCarousel />
                {/* veil — a whisper at the top for the tag, clear through the faces,
                   warmer at the base for the caption */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(26,17,9,0.34) 0%, rgba(26,17,9,0.04) 20%, rgba(26,17,9,0) 46%, rgba(26,17,9,0.12) 62%, rgba(26,17,9,0.68) 100%)',
                  pointerEvents: 'none',
                }} />
                {/* top tag — section + date */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 16px', color: '#fff',
                  textShadow: '0 1px 8px rgba(20,12,6,0.6)', pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.92, fontFamily: 'var(--font-sans)' }}>
                    {planLabel || t('todays_reading')}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.82, fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                    {(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + planDayOffset);
                      return d.toLocaleDateString(dateLocale(lang), { weekday: 'short', month: 'short', day: 'numeric' });
                    })()}
                  </span>
                </div>
                {/* bottom caption — passage title, magazine-style */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  padding: '0 18px 15px', color: '#fff',
                  textShadow: '0 1px 12px rgba(20,12,6,0.6)', pointerEvents: 'none',
                }}>
                  <p style={{ fontSize: 27, fontWeight: 400, fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: 0, lineHeight: 1.08 }}>
                    {allLabels[0]}
                  </p>
                  {/* Caption used to hardcode "ESV · Human Reader" no matter what the
                      reader was actually set to (or fell back to). Show the real one;
                      the human-recorded reading only exists for ESV. */}
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.78, fontFamily: 'var(--font-sans)', margin: '6px 0 0' }}>
                    {(() => {
                      const heroRef = heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '';
                      const served = heroRef ? getServedTranslation(heroRef, translation) : translation;
                      return served === 'ESV' ? t('esv_human_reader') : served;
                    })()}
                  </p>
                </div>

                {/* ── The whole carousel is one big play button. This full-plate tap is a
                     convenience for touch; the centered button below is the labelled control
                     (so screen readers hear one play control, not two). ── */}
                <button
                  onClick={() => handleHeroListen()}
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
                  pointerEvents: 'none',
                }}>
                  {hasActivePlans && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlanDayOffset(d => d - 1); }}
                      disabled={!heroCanGoBack}
                      aria-label={t('previous_day')}
                      style={{
                        pointerEvents: heroCanGoBack ? 'auto' : 'none', width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: heroCanGoBack ? 'rgba(20,14,8,0.34)' : 'rgba(20,14,8,0.5)', border: '1px solid rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: heroCanGoBack ? '#fff' : 'rgba(255,255,255,0.5)',
                        cursor: heroCanGoBack ? 'pointer' : 'default', padding: 0,
                        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                      }}
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}
                  <button
                    className="hero-play-btn"
                    onClick={() => handleHeroListen()}
                    aria-label={
                      isLoadingHero ? tI18n('loading_audio', lang)
                        : isPlayingHero && !isPausedHero ? `${tI18n('pause', lang)} — ${allLabels[heroChapterIndex] || ''}`
                        : isPausedHero ? `${tI18n('resume_label', lang)} — ${allLabels[heroChapterIndex] || ''}`
                        : `${t('listen_now')} — ${allLabels.join(', ')}`
                    }
                    style={{
                      pointerEvents: 'auto', width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                      background: isLoadingHero
                        ? (isNewPath ? 'var(--dw-new)' : 'rgba(168,85,47,0.55)')
                        : 'rgba(20,14,8,0.42)',
                      border: '2px solid rgba(255,255,255,0.92)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isNewPath && isLoadingHero ? 'var(--dw-new-on-fill)' : '#fff', cursor: 'pointer', padding: 0,
                      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {isLoadingHero
                      ? <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                      : isPlayingHero && !isPausedHero
                      ? <Pause size={26} />
                      : <Play size={28} style={{ marginLeft: 3 }} />
                    }
                  </button>
                  {hasActivePlans && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlanDayOffset(d => d + 1); }}
                      disabled={!heroCanGoForward}
                      aria-label={t('next_day')}
                      style={{
                        pointerEvents: heroCanGoForward ? 'auto' : 'none', width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: heroCanGoForward ? 'rgba(20,14,8,0.34)' : 'rgba(20,14,8,0.5)', border: '1px solid rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: heroCanGoForward ? '#fff' : 'rgba(255,255,255,0.5)',
                        cursor: heroCanGoForward ? 'pointer' : 'default', padding: 0,
                        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Control deck — on cream, ink-on-light (editorial) ── */}
              <div style={{ position: 'relative', zIndex: 1, background: 'var(--dw-card)', color: 'var(--dw-text-primary)' }}>

                {/* Audio now lives on the photo plate above (the whole carousel is
                   the play button); the deck below holds reading + translations. */}
                <div style={{ height: 10 }} />

                {/* ── Chapter navigator — large slider + tappable chapter pills ── */}
                {allLabels.length > 1 && (
                  <div style={{ padding: '0 16px 12px' }}>
                    {/* Range slider — thick, touch-friendly, draggable */}
                    <div style={{ padding: '0 4px', margin: '0 0 6px' }}>
                      <input
                        className="hero-range-slider"
                        type="range"
                        aria-label={tI18n('chapter_navigator', lang)}
                        aria-valuetext={`${allLabels[heroChapterIndex] || ''} — ${tI18n('p_chapter_of', lang)} ${heroChapterIndex + 1} ${tI18n('p_of', lang)} ${allLabels.length}`}
                        min={0}
                        max={allLabels.length - 1}
                        value={heroChapterIndex}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          if (idx !== heroChapterIndex) { (audioPlaying || audioPaused) ? handleHeroSkipTo(idx) : handleHeroSelect(idx); }
                        }}
                        style={{
                          background: isNewPath
                            ? `linear-gradient(to right, var(--dw-new) 0%, var(--dw-new) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, var(--dw-new-soft) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, var(--dw-new-soft) 100%)`
                            : `linear-gradient(to right, rgba(168,85,47,0.9) 0%, rgba(168,85,47,0.9) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(150,130,105,0.42) ${allLabels.length > 1 ? (heroChapterIndex / (allLabels.length - 1)) * 100 : 0}%, rgba(150,130,105,0.42) 100%)`,
                        }}
                      />
                    </div>
                    {/* Chapter counter */}
                    <p style={{
                      fontSize: 10, fontWeight: 600, textAlign: 'center',
                      // AA token instead of opacity 0.5 (≈3.2:1 on the cream card)
                      color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 8px',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {`${tI18n('p_chapter_of', lang)} ${heroChapterIndex + 1} ${tI18n('p_of', lang)} ${allLabels.length}`}
                    </p>
                    {/* Chapter pills — large, tappable */}
                    <div style={{
                      display: 'flex', gap: 6, overflowX: 'auto',
                      scrollbarWidth: 'none', padding: '0 2px',
                      WebkitOverflowScrolling: 'touch',
                    }}>
                      {allLabels.map((label, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); (audioPlaying || audioPaused) ? handleHeroSkipTo(i) : handleHeroSelect(i); }}
                          style={{
                            flexShrink: 0, padding: '10px 16px',
                            minHeight: 44,
                            borderRadius: 16, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            letterSpacing: '0.02em',
                            border: i === heroChapterIndex
                              ? `2px solid ${isNewPath ? 'var(--dw-new)' : 'var(--dw-accent)'}`
                              : '1.5px solid var(--dw-border)',
                            background: i === heroChapterIndex
                              ? (isNewPath ? 'var(--dw-new-soft)' : 'rgba(168,85,47,0.15)')
                              : 'transparent',
                            color: i === heroChapterIndex
                              ? (isNewPath ? 'var(--dw-new)' : 'var(--dw-accent)')
                              : 'var(--dw-text-muted)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {audioError && audioCurrentPassage === HERO_KEY && (
                  <p style={{
                    fontSize: 11, color: '#B23A2E', textAlign: 'center',
                    fontFamily: 'var(--font-sans)', margin: '0 20px 10px',
                  }}>
                    {t('audio_unavailable')}
                  </p>
                )}

                {/* Hairline divider */}
                <div style={{ height: 1, background: 'var(--dw-border)', margin: '0 20px' }} />

                {/* Footer: Stop/Read + Restart + Translation picker */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '2px 8px 2px',
                }}>
                  {/* Stop or Read button — context-aware */}
                  {(isPlayingHero || isPausedHero) ? (
                    <button
                      aria-label={tI18n('stop_audio_label', lang)}
                      // Stop keeps your place: the keyed index is day-scoped, so no
                      // reset to 0 — Restart exists for starting over.
                      onClick={(e) => { e.stopPropagation(); AP.stop(); heroQueueActiveRef.current = false; }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 8px', minHeight: 44,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--dw-text-secondary)',
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                        letterSpacing: '0.03em',
                        borderRight: '1px solid var(--dw-border)',
                      }}
                    >
                      <Square size={12} fill="currentColor" />
                      {tI18n('stop', lang)}
                    </button>
                  ) : (
                    <button
                      aria-label={`${t('read_btn')} ${heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || ''}`}
                      onClick={() => handleRead(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 8px', minHeight: 44,
                        background: isNewPath
                          ? (isReadingOpen(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '') ? 'var(--dw-surface)' : 'var(--dw-new)')
                          : 'transparent',
                        border: isNewPath
                          ? (isReadingOpen(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '') ? '1px solid var(--dw-new)' : 'none')
                          : 'none',
                        borderRadius: isNewPath ? 10 : 0,
                        cursor: 'pointer',
                        color: isNewPath
                          ? (isReadingOpen(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '') ? 'var(--dw-new)' : 'var(--dw-new-on-fill)')
                          : isReadingOpen(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '') ? 'var(--dw-text-primary)' : 'var(--dw-text-muted)',
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                        letterSpacing: '0.03em', transition: 'color 0.2s ease, background 0.2s ease',
                        borderRight: isNewPath ? undefined : '1px solid var(--dw-border)',
                        margin: isNewPath ? '4px 6px' : 0,
                      }}
                    >
                      <BookOpen size={13} />
                      {isReadingOpen(heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '') ? t('hide_reading') : t('read_btn')}
                    </button>
                  )}
                  {/* Restart button — resets to chapter 1 and replays */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      AP.unlock();
                      setAudioError(false);
                      if (audioPlaying || audioPaused) AP.stop();
                      const rv = ++heroChainVersionRef.current;
                      setHeroChapterIndex(0);
                      setHeroLoading(true);
                      heroQueueActiveRef.current = true;
                      // startHeroChain clears heroLoading when audio STARTS. The old
                      // .finally held it true until the whole multi-chapter chain
                      // ENDED, so the button spun through playback and the pause
                      // gate (heroLoading) made pausing impossible.
                      startHeroChain(0, rv);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '12px 10px', minHeight: 44,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--dw-text-muted)',
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                      letterSpacing: '0.03em',
                      borderRight: '1px solid var(--dw-border)',
                    }}
                  >
                    <RotateCcw size={13} />
                    {tI18n('p_restart', lang)}
                  </button>

                  {/* Translation picker — horizontal scrollable pills */}
                  <div style={{
                    flex: 2, display: 'flex', alignItems: 'center', gap: 5,
                    overflowX: 'auto', padding: '10px 12px',
                    scrollbarWidth: 'none',
                  }}>
                    {getTranslationsForPersona(personaConfig.persona, appLanguage).map(t => (
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
                          border: t === translation ? `1.5px solid ${isNewPath ? 'var(--dw-new)' : 'var(--dw-accent)'}` : '1.5px solid var(--dw-border)',
                          background: t === translation ? (isNewPath ? 'var(--dw-new)' : 'rgba(168,85,47,0.15)') : 'transparent',
                          color: t === translation ? (isNewPath ? 'var(--dw-new-on-fill)' : 'var(--dw-accent)') : 'var(--dw-text-muted)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Compare button (only for deeper_study and pastor_leader) */}
                  {personaConfig.features.greekHebrew === 'full' && (
                    <button
                      onClick={() => setCompareMode(!compareMode)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: compareMode ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                        background: compareMode ? 'rgba(168,85,47,0.15)' : 'transparent',
                        color: compareMode ? 'var(--dw-accent)' : 'var(--dw-text-muted)',
                        marginLeft: 'auto',
                        marginRight: 8,
                      }}
                    >
                      {tI18n('compare_label', lang)}
                    </button>
                  )}
                </div>

                {/* ── Expanded scripture text — calm reading surface, visually distinct from hero ── */}
                {/* NOTE: Uses hardcoded colors (no CSS vars) because iOS Safari can fail to
                    apply inline var() styles, causing text to inherit the parent's color:#fff
                    and become invisible against the light background. */}
                {(() => {
                  const readRef = heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '';
                  const isReadExpanded = Boolean(readRef && isReadingOpen(readRef));
                  const readKey = `${readRef}_${translation}`;
                  const readText = passageTexts[readKey];
                  if (!isReadExpanded) return null;
                  // No maxHeight / internal scrollbar: the chapter expands to its full
                  // height and the page scrolls as one surface (Kindle-style). The
                  // key remounts the panel per chapter/translation for a gentle fade.
                  return (
                    <div key={readKey} ref={readingSurfaceRef} className="dw-reading-surface dw-reading-fade" style={{
                      position: 'relative',
                      background: '#FFFFFF',
                      textShadow: 'none',
                      borderTop: '1px solid rgba(150,112,72,0.15)',
                      borderBottomLeftRadius: 24,
                      borderBottomRightRadius: 24,
                    }}>
                      {/* Subtle top edge: thin warm accent line connecting to hero */}
                      <div style={{
                        position: 'absolute', top: 0, left: 24, right: 24, height: 2,
                        background: 'linear-gradient(90deg, transparent, rgba(168,120,60,0.25), transparent)',
                        borderRadius: 2,
                      }} />
                      <p style={{
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isNewPath ? 'var(--dw-new)' : '#A06A42',
                        fontFamily: 'var(--font-sans)', marginBottom: 20, marginTop: 4,
                      }}>
                        {readRef} <span style={{ fontWeight: 500, opacity: 0.6 }}>· {getServedTranslation(readRef, translation)}</span>
                        {getServedTranslation(readRef, translation) !== translation && (
                          <span style={{
                            fontWeight: 500, opacity: 0.7, textTransform: 'none',
                            letterSpacing: 0, display: 'block', marginTop: 4, fontSize: 11,
                          }}>
                            {translation} is unavailable right now — showing the offline text instead.
                          </span>
                        )}
                      </p>
                      {readText ? (
                        <>
                        <div style={{
                          // Force dark-mode colors so ScripturePassage is readable against #1C1A16 bg
                          // even when the app is in light mode
                          ['--dw-text-secondary' as any]: '#2A2218',
                          ['--dw-text-muted' as any]: '#A06A42',
                          ['--dw-border' as any]: 'rgba(150,112,72,0.2)',
                          ['--dw-surface-raised' as any]: 'rgba(255,255,255,0.06)',
                        }}>
                          <ScripturePassage
                            text={readText}
                            passageRef={readRef}
                            renderScripture={renderScripture}
                            greekHebrewMode={greekHebrewMode}
                            fontSize={scriptureFontSize}
                            newPath={isNewPath}
                          />
                        </div>
                        {/* Read → reflect, in place: a one-tap journal capture right under the passage.
                            key={readRef} remounts it per chapter so the panel (which stays mounted as
                            the chapter auto-advances) never shows a stale 'Saved' state for a prior chapter. */}
                        <InlineReflection
                          key={readRef}
                          tone="paper"
                          newPath={isNewPath}
                          label={tI18n('reflect_label', lang)}
                          prompt={tI18n('reflect_prompt_default', lang)}
                          verseRef={readRef}
                          onViewJournal={onNavigate ? () => onNavigate('journal') : undefined}
                        />
                        <button
                          onClick={() => handleMarkRead(readRef)}
                          disabled={readDoneToday}
                          style={{
                            width: '100%', marginTop: 14, padding: '12px', borderRadius: 12,
                            border: readDoneToday ? '1px solid rgba(150,112,72,0.3)' : 'none',
                            background: readDoneToday ? 'transparent' : (isNewPath ? 'var(--dw-new)' : 'var(--dw-success)'),
                            color: readDoneToday ? (isNewPath ? 'var(--dw-new)' : '#A06A42') : (isNewPath ? 'var(--dw-new-on-fill)' : '#fff'),
                            fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)',
                            cursor: readDoneToday ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          {readDoneToday ? tI18n('read_today', lang) : tI18n('mark_as_read', lang)}
                        </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0' }}>
                          <Loader2 size={20} style={{ color: '#A06A42', animation: 'spin 1s linear infinite' }} />
                          <span style={{ color: '#A06A42', fontSize: 15, fontFamily: 'var(--font-sans)' }}>{tI18n('loading_scripture', lang)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {compareMode && personaConfig.features.greekHebrew === 'full' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    overflowX: 'auto', padding: '6px 12px',
                    scrollbarWidth: 'none',
                    borderTop: '1px solid var(--dw-border)',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginRight: 4 }}>{tI18n('compare_label', lang)}:</span>
                    {getTranslationsForPersona(personaConfig.persona, appLanguage).map(t => (
                      <button
                        key={`compare-${t}`}
                        onClick={() => setCompareTranslation(t)}
                        style={{
                          flexShrink: 0,
                          padding: '4px 9px',
                          borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: t === compareTranslation ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                          background: t === compareTranslation ? 'rgba(168,85,47,0.14)' : 'transparent',
                          color: t === compareTranslation ? 'var(--dw-accent)' : 'var(--dw-text-muted)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Date Navigation — directly under hero so users connect the two ──
            Not on the I'm-New path: their reading is the pathway day, which these
            chevrons never move (they drive the legacy dayOffset axis), and the date
            already sits on the hero plate. */}
        {!isNewPath && <div className="dw-dark-surface" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '0 0 16px',
          background: 'var(--dw-charcoal-deep)',
          borderRadius: 14,
          padding: '14px 8px',
        }}>
          {/* With a plan active these chevrons move the SAME axis as the hero's
              (planDayOffset, same clamps) — two adjacent look-alike controls moving
              different axes made an idle tap here a silent audio-killer. The legacy
              dayOffset arrows only remain for the no-plan state. */}
          <button
            onClick={() => hasActivePlans ? setPlanDayOffset(d => d - 1) : setDayOffset(d => d - 1)}
            disabled={hasActivePlans && !heroCanGoBack}
            style={{ background: 'none', border: 'none', color: (hasActivePlans && !heroCanGoBack) ? 'var(--dw-text-faint)' : 'var(--dw-text-secondary)', cursor: (hasActivePlans && !heroCanGoBack) ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('previous_day')}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--dw-text-muted)', marginBottom: 4 }}>{t('todays_reading')}</p>
            <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {hasActivePlans ? getDateString(planDayOffset) : dateStr}
            </p>
            {todaysPlanPassages.length > 0 && (
              <p style={{ color: 'var(--dw-text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 4, lineHeight: 1.5 }}>
                {(() => {
                  const seen = new Set<string>();
                  const plans: { title: string; dayNum: number; passages: string[] }[] = [];
                  todaysPlanPassages.forEach(p => {
                    if (seen.has(p.planId)) {
                      plans[plans.length - 1].passages.push(p.passage);
                    } else {
                      seen.add(p.planId);
                      plans.push({ title: p.planTitle, dayNum: p.dayNum, passages: [p.passage] });
                    }
                  });
                  return plans.map(p =>
                    `${tI18n('p_day_of', lang)} ${p.dayNum} ${tI18n('p_of', lang)} ${p.title} · ${p.passages.join(', ')}`
                  ).join(' | ');
                })()}
              </p>
            )}
          </div>
          <button
            onClick={() => hasActivePlans ? setPlanDayOffset(d => d + 1) : setDayOffset(d => d + 1)}
            disabled={hasActivePlans ? !heroCanGoForward : dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: (hasActivePlans ? !heroCanGoForward : dayOffset >= 30) ? 'var(--dw-text-faint)' : 'var(--dw-text-secondary)', cursor: (hasActivePlans ? !heroCanGoForward : dayOffset >= 30) ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('next_day')}
          >
            <ChevronRight size={20} />
          </button>
        </div>}

        {/* The Day N lesson no longer mounts inline here: the journey hero above
            opens NewBelieverLessonCard as the FULL-SCREEN Day N reading (verses
            already open) — mounted with the other overlays at the end of this
            screen. The day stays one unit; it is just no longer hidden behind
            the hero's Read state. */}

        {/* ── Pastoral Reflection Prompt (pastor_leader) — directly under the
            reading, so the pastor's landing is reading + prompt as one unit. ── */}
        {personaConfig.sectionOrder.includes('pastoral_prompt') && (
          <PastoralReflectionSection
            personaConfig={personaConfig}
            dayOffset={dayOffset}
            getDayNumber={getDayNumber}
            onNavigate={onNavigate}
            setBibleAIContext={setBibleAIContext}
            setShowBibleAI={setShowBibleAI}
          />
        )}

        {/* Post-first-reading backup nudge — appears only after the push prompt
            is resolved, so the two post-reading moments never stack. */}
        <PWAInstallBanner />

        <EmailNudgeCard />

        {/* ── Choose Your Plan — only while nothing is set up yet. Mid-plan users
             already have entry points; pastor/study personas get the tailored
             wizard below (this button was bypassing it); comfort and new-believer
             users have auto-served content, so no setup funnel for them. ── */}
        {todaysPlanPassages.length === 0
          && !personaConfig.sectionOrder.includes('plan_scripture')
          && personaConfig.persona !== 'comfort'
          && personaConfig.persona !== 'new_to_faith' && (
        <button
          className="dw-btn-dark"
          onClick={() => onNavigate?.('plans')}
          style={{
            display: 'block', width: '100%', marginBottom: 16,
            background: 'var(--dw-accent)', border: 'none', borderRadius: 14,
            padding: '16px 20px', cursor: 'pointer',
            color: '#FFFFFF', fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-sans)', letterSpacing: '0.04em',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(168,50,59,0.25)',
          }}
        >
          Choose Your Plan
        </button>
        )}

        {/* ── Pastor/Study Onboarding wizard (extracted to <PastorStudyOnboarding>) ── */}
        {personaConfig.sectionOrder.includes('plan_scripture') && (
          <PastorStudyOnboarding
            isPastor={personaConfig.persona === 'pastor_leader'}
            t={t}
            lang={lang}
            startPlanFromHome={startPlanFromHome}
            onNavigate={onNavigate}
          />
        )}

        {/* Comfort Verse Banner — comfort persona only */}
        {personaConfig.sectionOrder.includes('comfort_verse_banner') && <ComfortVerseBannerSection persona={personaConfig.persona} />}

        {/* ── Comfort Scripture — auto-served (extracted to <ComfortSection>) ──
             Rendered directly after the verse banner (persona-config's intended
             order) — it used to sit ninth, below setup CTAs and book promos. */}
        {personaConfig.sectionOrder.includes('comfort_scripture') && (
          <ComfortSection
            translation={translation}
            translations={getTranslationsForPersona('comfort', appLanguage)}
            handleTranslationChange={handleTranslationChange}
            lang={lang}
            t={t}
            passageTexts={passageTexts}
            loadingPassages={loadingPassages}
            loadPassage={loadPassage}
            audioPlaying={audioPlaying}
            audioLoading={audioLoading}
            audioCurrentPassage={audioCurrentPassage}
            handleListen={handleListen}
            renderScripture={renderScripture}
            greekHebrewMode={greekHebrewMode}
            scriptureFontSize={scriptureFontSize}
          />
        )}

        {/* Poll banner — right under the hero audio card (persona-gated) */}
        {pf.pollBanner && <FeedbackPoll userCampus={userProfile?.campus} />}

        {/* AI Prompt Section — multi-persona */}

      {/* The blue "Your Faith Journey" banner was removed: it repeated the day
          number, plan title and progress bar that the lesson card now shows
          directly under the hero, and its only action was to scroll to that
          card. Two progress readouts on one screen read as two journeys. */}
        {personaConfig.sectionOrder.includes('ai_prompt') && <BibleAIPromptSection onOpenAI={() => setShowBibleAI(true)} persona={personaConfig.persona} />}

        {/* Book Cards — surfaces recommended books, tapping starts the reading plan */}
        {pf.bookCards.length > 0 && (
          <div style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 12, scrollbarWidth: 'none' }}>
            {pf.bookCards.map((bookId: string) => {
              const bookInfo: Record<string, { title: string; description: string; color: string; planId?: string }> = {
                'grace-and-truth': { title: 'Grace & Truth', description: 'Biblical foundations for living', color: '#2E2A25' },
                'no-more-fear': { title: 'No More Fear', description: 'Living boldly in faith', color: '#6B1A22', planId: 'book-no-more-fear' },
              };
              const info = bookInfo[bookId] || { title: bookId, description: '', color: '#6B1A22' };

              // Check if the plan is already active
              const activePlans: Record<string, unknown> = (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
              const isActive = info.planId ? !!activePlans[info.planId] : false;

              return (
                <div
                  key={bookId}
                  className="dw-dark-surface"
                  onClick={() => {
                    if (info.planId && !isActive) {
                      startPlanFromHome(info.planId); // bumps planTick internally → reactive re-render
                    } else {
                      // No specific plan — go to Plans tab to browse
                      onNavigate?.('plans');
                    }
                  }}
                  style={{
                    minWidth: 180,
                    background: info.color,
                    borderRadius: 14,
                    padding: '20px 18px',
                    color: '#fff',
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                    {isActive ? tI18n('reading_now', lang) : tI18n('recommended_label', lang)}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
                    {info.title}
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.8, fontFamily: 'var(--font-sans)' }}>
                    {isActive ? tI18n('tap_continue_reading', lang) : info.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Upgrade Prompt — congregation "Go Deeper?" / comfort "Feeling Stronger?"
             Never mount for new_to_faith: I'm New stays until they change path themselves. ── */}
        {personaConfig.persona !== 'new_to_faith' && (
        <UpgradePromptCard
          persona={setup?.persona || 'congregation'}
          onUpgrade={(newPersona) => {
            // Deliberate persona change → real-choice source so it stamps + syncs
            // (the prior source could be 'default', which saveSetup would skip).
            saveSetup({ persona: newPersona, source: 'upgrade' });
            flushNow(); // back up the choice immediately; saveSetup updates context reactively (no reload)
          }}
        />
        )}

        {/* Start Your Journey — removed; "Choose Your Plan" button at top handles this */}

        {/* Persona greeting + picker moved to Settings */}

        {/* -- FAITH PATHWAY CARD -- for new_returning persona */}
        {pf.faithPathway && personaConfig.sectionOrder.includes('devotion') && pathwayProgress.enrolled && pathwayData && (() => {
          /* Only show this compact pathway card for personas that ALSO have the devotion section.
             new_to_faith gets the full plan-based lesson card above instead. */
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
              <div
                className="dw-dark-surface"
                onClick={() => onNavigate?.('plans')}
                style={{
                  background: 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
                  color: 'white',
                  padding: 20,
                  borderRadius: 16,
                  marginBottom: 16,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9, marginBottom: 6 }}>
                  Journey Complete
                </div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  You've completed {pathTitle}! Tap to explore other plans.
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
              className="dw-dark-surface"
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
                  {tI18n('continue_journey', lang)} &rarr;
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sermon notes live on Home (one tap) + Sunday QR. Banner here retired. */}

        {/* Date Navigation moved to directly under hero card */}

        {/* Listen bar removed — hero card handles audio. Scripture search moved to Study tab. */}

        {/* Devotion of the Day removed from home page */}

        {/* Comfort Scripture section moved up — it renders directly after the
            comfort verse banner now (see above). */}

        {/* ── Today's Reading — shows plan chapters when active, else devotion scripture ── */}
        {personaConfig.sectionOrder.includes('devotion_scripture') && (todaysPlanPassages.length > 0 || todaysDevotion?.verse) && (() => {
          const hasPlanPassages = todaysPlanPassages.length > 0;
          const devPassage = hasPlanPassages ? todaysPlanPassages[0].passage : (todaysDevotion?.verse || ''); // e.g. "Genesis 37" or "2 Timothy 1"
          const isComfort = personaConfig.persona === 'comfort';
          const devScriptureTranslations: TranslationCode[] = getTranslationsForPersona(
            isComfort ? 'comfort' : personaConfig.persona, appLanguage
          );
          const tKey = `${devPassage}_${translation}`;
          const passageText = passageTexts[tKey];
          const isLoading = loadingPassages.has(devPassage);
          const isPlayingThis = audioPlaying && audioCurrentPassage === devPassage;
          const isLoadingAudio = audioLoading && audioCurrentPassage === devPassage;

          return (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>
                  {isComfort ? "TODAY'S SCRIPTURE" : t('todays_reading')}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {hasPlanPassages ? `${tI18n('p_day_of', lang)} ${todaysPlanPassages[0].dayNum} · ${todaysPlanPassages[0].planTitle}` : (isComfort ? tI18n('read_own_pace', lang) : tI18n('from_todays_devotion', lang))}
                </span>
              </div>

              {/* Translation picker */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {devScriptureTranslations.map(t => (
                  <button
                    key={t}
                    onClick={() => handleTranslationChange(t)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: t === translation ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                      background: t === translation ? 'var(--dw-accent)' : 'transparent',
                      color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Chapter heading + listen */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {devPassage}
                </p>
                <button
                  onClick={() => handleListen(devPassage)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                    border: 'none', borderRadius: 10, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: '#fff', fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isLoadingAudio ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {tI18n('j_loading', lang)}…</>
                  ) : isPlayingThis ? (
                    <><AudioWave height={14} color="#fff" /> <Pause size={14} /> {tI18n('pause', lang)}</>
                  ) : (
                    <><Headphones size={14} /> {tI18n('j_listen', lang)}</>
                  )}
                </button>
              </div>

              {/* Scripture text */}
              {isLoading ? (
                <ScriptureSkeleton fontSize={scriptureFontSize} label={translation} />
              ) : passageText ? (
                <ScripturePassage
                  text={passageText}
                  passageRef={devPassage}
                  renderScripture={renderScripture}
                  greekHebrewMode={greekHebrewMode}
                  fontSize={scriptureFontSize}
                />
              ) : (
                <button
                  onClick={() => loadPassage(devPassage)}
                  style={{
                    background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                    borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <BookOpen size={16} /> {t('read_btn')} {devPassage}
                </button>
              )}

              {/* Reflection prompt — now an inline one-tap journal capture */}
              <InlineReflection
                tone={isComfort ? 'comfort' : 'default'}
                newPath={isNewPath}
                label={isComfort ? tI18n('sit_with_this', lang) : tI18n('reflect_label', lang)}
                prompt={isComfort
                  ? tI18n('reflect_prompt_comfort', lang)
                  : tI18n('reflect_prompt_default', lang)}
                verseRef={devPassage}
              />
              {/* NOTE: the enclosing section gates on the never-set 'devotion_scripture'
                  key, so this is dead until that section is revived; the live reflection
                  lives in the hero reading panel below. */}
            </Card>
          );
        })()}

        {/* ── Plan-Driven Scripture (deeper_study / pastor_leader) — full depth tools ── */}
        {personaConfig.sectionOrder.includes('plan_scripture') && (() => {
          if (todaysPlanPassages.length === 0) {
            return null; // Onboarding is rendered above (after hero)
          }


          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>{tI18n('todays_study', lang)}</h2>
                {/* Greek/Hebrew mode toggle */}
                {pf.greekHebrew === 'full' && (
                  <button
                    onClick={() => setGreekHebrewMode(!greekHebrewMode)}
                    style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer',
                      border: greekHebrewMode ? '1.5px solid var(--dw-gold)' : '1.5px solid var(--dw-border)',
                      background: greekHebrewMode ? 'rgba(154,123,46,0.2)' : 'transparent',
                      color: greekHebrewMode ? 'var(--dw-gold)' : 'var(--dw-text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {greekHebrewMode ? 'Greek/Hebrew ON' : 'Tap for Greek/Hebrew'}
                  </button>
                )}
              </div>

              {todaysPlanPassages.map(({ planId, planTitle, passage, dayNum }) => {
                const tKey = `${passage}_${translation}`;
                const txt = passageTexts[tKey];
                const isLoading = loadingPassages.has(passage);
                const isPlayingThis = audioPlaying && audioCurrentPassage === passage;
                const isLoadingAudio = audioLoading && audioCurrentPassage === passage;
                const isExpanded = isReadingOpen(passage);

                return (
                  <Card key={planId + '_' + passage} style={{ marginBottom: 12 }}>
                    {/* Plan + Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {planTitle} — Day {dayNum}
                      </span>
                    </div>

                    {/* Chapter heading + listen */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {displayPassage(passage, appLanguage)}
                      </p>
                      <button
                        onClick={() => handleListen(passage)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none', borderRadius: 10, padding: '8px 14px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: '#fff', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {isLoadingAudio ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {tI18n('j_loading', lang)}…</>
                        ) : isPlayingThis ? (
                          <><AudioWave height={14} color="#fff" /> <Pause size={14} /> {tI18n('pause', lang)}</>
                        ) : (
                          <><Headphones size={14} /> {tI18n('j_listen', lang)}</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text — hidden until Read, same as the hero */}
                    {isExpanded ? (
                    isLoading ? (
                      <ScriptureSkeleton fontSize={scriptureFontSize} label={translation} />
                    ) : (txt || passageTexts[`${expandChapterRef(passage)}_${translation}`]) ? (
                      <>
                        <ScripturePassage
                          text={txt || passageTexts[`${expandChapterRef(passage)}_${translation}`]}
                          passageRef={passage}
                          renderScripture={renderScripture}
                          greekHebrewMode={greekHebrewMode}
                          fontSize={scriptureFontSize}
                        />

                        {/* Compare translation (when active) */}
                        {compareMode && pf.greekHebrew === 'full' && (() => {
                          const cKey = `${passage}_${compareTranslation}`;
                          const cText = compareTexts[cKey];
                          return (
                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--dw-border)' }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                                {compareTranslation}
                              </p>
                              {cText ? (
                                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--dw-text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: 0 }}>
                                  {cText}
                                </p>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                                  <Loader2 size={12} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                                  <span style={{ fontSize: 13, color: 'var(--dw-text-muted)' }}>Loading {compareTranslation}…</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <ScriptureSkeleton fontSize={scriptureFontSize} label={translation} />
                    )
                    ) : (
                      <button
                        onClick={() => handleRead(expandChapterRef(passage))}
                        style={{
                          background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                          borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <BookOpen size={16} /> {t('read_btn')} {passage}
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* 5. Commentary — persona-gated: hidden / collapsed / expanded. Sits
            directly after TODAY'S STUDY so it reads next to the passages it
            comments on; entries now cover every passage of the day. */}
        {pf.commentary !== 'hidden' && allCommentaries.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <div
              onClick={() => !commentaryExpanded && setCommentaryExpanded(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: commentaryExpanded ? 'default' : 'pointer', marginBottom: commentaryExpanded ? 10 : 0 }}
            >
              <h2 className="text-section-header" style={{ margin: 0 }}>{tI18n('commentary_label', lang)}</h2>
              {!commentaryExpanded && (
                <span style={{ fontSize: 12, color: 'var(--dw-accent)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{tI18n('tap_to_read', lang)}</span>
              )}
            </div>
            {commentaryExpanded && (
              <>
                {/* Source tab strip — labels carry the passage when the day has
                    commentary on more than one chapter */}
                {allCommentaries.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {allCommentaries.map((c, i) => (
                      <button
                        key={`${c.passage}_${c.source}`}
                        onClick={() => setSelectedCommentaryIdx(i)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          border: '1px solid',
                          borderColor: i === selectedCommentaryIdx ? 'var(--dw-accent)' : 'var(--dw-border, #E8E6E0)',
                          background: i === selectedCommentaryIdx ? 'var(--dw-accent)' : 'transparent',
                          color: i === selectedCommentaryIdx ? '#fff' : 'var(--dw-text-muted)',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          letterSpacing: '0.02em',
                          transition: 'all 0.15s',
                        }}
                      >
                        {commentaryPassageCount > 1 ? `${c.passage} · ${c.source}` : c.source}
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected commentary text */}
                {allCommentaries[selectedCommentaryIdx] && (
                  <>
                    {allCommentaries.length === 1 && (
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--dw-accent)', letterSpacing: '0.06em', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                        {allCommentaries[0].source.toUpperCase()} · {allCommentaries[0].passage}
                      </p>
                    )}
                    <p
                      onClick={() => setSelection({ text: allCommentaries[selectedCommentaryIdx].text, verseRefs: [allCommentaries[selectedCommentaryIdx].passage], source: 'tap' })}
                      style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.65, fontFamily: 'var(--font-serif-text)', cursor: 'pointer', WebkitUserSelect: 'text', userSelect: 'text' }}
                    >
                      {allCommentaries[selectedCommentaryIdx].text}
                    </p>
                  </>
                )}
              </>
            )}
          </Card>
        )}

        {/* Pastoral Reflection Prompt moved directly under the reading (persona-flow
            spec, 1 Sep): the pastor lands on today's reading + the prompt as one
            unit — see the mount under the date strip. */}

        {/* The new-believer lesson card now renders directly under the hero — see
            "Today's lesson" above. It used to sit here, eight blocks below the
            reading it belongs to. */}

        {/* Campus community count badge REMOVED: its "N people at your campus are
            in the Word today" number was fabricated from a deterministic seed, and
            congregation members hold no credential that could fetch a real count.
            Real campus numbers now live in the pastor Campus Overview below. */}

        {/* Translation selector removed — hero card has translation picker */}


        {/* 3. TODAY'S CHAPTERS — gated by sectionOrder */}
        {personaConfig.sectionOrder.includes('scripture') && (() => {
          // Comfort + new-believer personas get auto-served readings (comfort
          // rotation / pathway lesson) — with no plan or slots, telling them
          // "No reading plan active" mislabels content they already have. Render
          // nothing instead of the setup funnel.
          if (readingSlots.length === 0 && todaysPlanPassages.length === 0 &&
              (personaConfig.persona === 'comfort' || personaConfig.persona === 'new_to_faith')) {
            return null;
          }
          // When plan_scripture is also present (pastor/study personas), that section already
          // shows plan passages with deep tools. Here we only show manually-added reading slots
          // to avoid duplication. If there are no slots in that case, skip the section entirely.
          const hasPlanScripture = personaConfig.sectionOrder.includes('plan_scripture');
          const hasPlanPassages = todaysPlanPassages.length > 0;
          const slotsOnlyMode = hasPlanScripture && hasPlanPassages;
          const visibleSlots = readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length));
          if (slotsOnlyMode && visibleSlots.length === 0) return null;
          return (
          <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border-subtle)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--dw-text-muted)', margin: 0 }}>{slotsOnlyMode ? 'ADDITIONAL READING' : "TODAY'S CHAPTERS"}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
              }} className={isNewPath ? 'dw-select-all-new' : undefined} style={{ background: isNewPath ? 'var(--dw-new-soft)' : 'var(--dw-accent-bg)', border:'1px solid var(--dw-border)', borderRadius:16, padding:'4px 12px', fontSize:12, color: isNewPath ? 'var(--dw-new)' : 'var(--dw-accent)', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600 }}>{t('select_all_passages')}</button>
              <button onClick={() => {
                const slotPassages = readingSlots.slice(0, Math.max(0, chaptersPerDay - todaysPlanPassages.length));
                const passageRefs = [
                  ...todaysPlanPassages.map(p => p.passage),
                  ...slotPassages.map(s => `${s.book} ${s.currentChapter}`),
                ];
                shareContent({
                  title: 'Daily Bible Reading',
                  text: `Today's passages: ${passageRefs.join(', ')}\n\n— Futures Daily Word`,
                  url: 'https://futuresdailyword.com'
                });
              }} style={{ background:'var(--dw-accent-bg)', border:'1px solid var(--dw-border)', borderRadius:8, padding:'4px 8px', fontSize:12, color:'var(--dw-accent)', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                <Share2 size={12} /> Share
              </button>
            </div>
            <button
              onClick={() => setShowReadingSetup(!showReadingSetup)}
              style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-border)',
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
            <Card style={{ textAlign: 'center', padding: '28px 20px' }}>
              <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
                No reading plan active
              </p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 16, lineHeight: 1.5 }}>
                Choose a plan and everything on this page syncs to your daily reading.
              </p>
              <button
                className="dw-btn-dark"
                onClick={() => onNavigate?.('plans')}
                style={{ padding: '12px 24px', borderRadius: 12, background: 'var(--dw-accent)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {tI18n('browse_plans', lang)}
              </button>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Plan passages — hidden in slotsOnlyMode (plan_scripture section shows them with deep tools) */}
              {!slotsOnlyMode && todaysPlanPassages.map(({ planId, planTitle, passage, dayNum }) => {
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
                      <><AudioWave height={16} color="#fff" /> <Pause size={16} /> {tI18n('pause', lang)}</>
                    ) : (
                      <><Headphones size={16} /> {tI18n('j_listen', lang)}</>
                    )}
                  </button>
                );
              })()}
              {/* ── Scripture content — hidden until Read (same as hero) ── */}
              <div style={{ padding: '14px 18px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {displayPassage(passage, appLanguage)}
                </div>
                {isReadingOpen(passage) ? (
                  (txt || passageTexts[`${expandChapterRef(passage)}_${translation}`]) ? (
                  <ScripturePassage
                    text={txt || passageTexts[`${expandChapterRef(passage)}_${translation}`]}
                    passageRef={passage}
                    renderScripture={renderScripture}
                    greekHebrewMode={greekHebrewMode}
                    fontSize={scriptureFontSize}
                  />
                  ) : (
                  <ScriptureSkeleton fontSize={scriptureFontSize} label={translation} />
                  )
                ) : (
                  <button
                    onClick={() => handleRead(expandChapterRef(passage))}
                    style={{
                      background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                      borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <BookOpen size={16} /> {t('read_btn')} {passage}
                  </button>
                )}
              </div>
              {/* Plan-level devotionals suppressed — single devotion shown in main card above */}
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
                const isExpanded = isReadingOpen(passage);
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
                          {tI18n('p_chapter_of', lang)} {slot.currentChapter} {tI18n('p_of', lang)} {maxChapter}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (window.confirm(tI18n('remove_slot_confirm', lang))) removeReadingSlot(slot.id); }}
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
                        aria-label={tI18n('remove_reading_slot', lang)}
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
                        {isExpanded ? tI18n('j_reading', lang) : t('read_btn')}
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
                          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {tI18n('j_loading', lang)}…</>
                        ) : isPlayingThis ? (
                          <><AudioWave height={14} color="#fff" /> <Pause size={16} /> {tI18n('pause', lang)}</>
                        ) : (
                          <><Headphones size={16} /> {tI18n('j_listen', lang)}</>
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
              <ScripturePassage
                text={text}
                passageRef={passage}
                renderScripture={renderScripture}
                greekHebrewMode={greekHebrewMode}
                fontSize={scriptureFontSize}
              />

              {/* Compare translation text */}
              {compareMode && personaConfig.features.greekHebrew === 'full' && (() => {
                const compareKey = `${passage}_${compareTranslation}`;
                const compareText = compareTexts[compareKey];
                return (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--dw-border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                      {compareTranslation}
                    </p>
                    {!compareText ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                        <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 12 }}>Loading {compareTranslation}...</span>
                      </div>
                    ) : (
                      <p className="text-scripture" style={{ fontSize: scriptureFontSize - 1, lineHeight: 1.7, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', borderRadius: 4 }}>
                        {renderScripture(compareText, passage)}
                      </p>
                    )}
                  </div>
                );
              })()}
              </>
                        ) : (
                          <p style={{ color: 'var(--dw-text-faint)', fontSize: 13, padding: '8px 0', fontStyle: 'normal' }}>
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
                  placeholder={t('search_books')}
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
                className="dw-btn-dark"
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
          );
        })()}



        {/* ── Daily Quote — below the fold. Not on the I'm-New path: on the journey
            home every line of text relates to the 40-day journey. ── */}
        {!isNewPath && <div style={{
          marginBottom: 20,
          padding: '8px 0',
          textAlign: 'center',
        }}>
          <p
            onClick={() => setSelection({ text: `"${quote.text}" — ${quote.author}`, verseRefs: [], source: 'tap' })}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 19,
              fontStyle: 'normal',
              color: 'var(--dw-text-primary)',
              lineHeight: 1.8,
              cursor: 'pointer',
              WebkitUserSelect: 'text',
              userSelect: 'text',
              letterSpacing: '0.01em',
            }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{
            color: 'var(--dw-text-muted)',
            fontSize: 13,
            fontWeight: 500,
            marginTop: 10,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            — {quote.author}
          </p>
        </div>}

        {/* ── Daily Word of the Day — persona-gated ── */}
        {pf.wordOfDay !== 'hidden' && (
          <DailyWordCard dailyWord={dailyWord} />
        )}

        {/* ── Weekly Word in Review (Sundays) — persona-gated ── */}
        {pf.weeklyReview && weekReview && !weekReviewDismissed && (
          <WeeklyReviewCard
            weekReview={weekReview}
            onDismiss={() => setWeekReviewDismissed(true)}
            t={t}
          />
        )}

        {/* Commentary card moved up — it renders directly after TODAY'S STUDY now,
            next to the passages it comments on (it used to sit 5+ cards down here,
            past quote / word-of-day / weekly-review). */}

        {/* Featured Plan Invite — removed; Plans tab is the right place to browse */}

        {/* 6. Campus Section — persona-gated */}
        {pf.campusCount !== 'hidden' && <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showCampusPicker ? 14 : 0 }}>
            <MapPin size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h2 className="text-section-header" style={{ marginBottom: 2 }}>{tI18n('your_campus', lang)}</h2>
              <p style={{
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}>
                {currentCampus?.name || tI18n('select_your_campus', lang)}
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
              {currentCampus ? tI18n('change_label', lang) : tI18n('select_label', lang)}
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
        </Card>}

        {/* ── Active Plans Strip ──
            Not on the I'm-New path: their path is the 40-day journey, not catalog
            plans (todaysPlanPassages is already forced empty for them) — but plans
            started earlier or synced from another device would still leak in here. */}
        {!isNewPath && homeActivePlans.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 className="text-section-header" style={{ marginBottom: 10 }}>{tI18n('j_your_active_plans', lang)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {homeActivePlans.map(({ plan, dayNum }) => {
                const pct = Math.min((dayNum / plan.totalDays) * 100, 100);
                const isComplete = dayNum >= plan.totalDays;
                return (
                  <div key={plan.id}>
                    <div style={{
                      background: 'var(--dw-card)',
                      border: '1px solid rgba(37,99,235,0.3)',
                      borderLeft: '3px solid var(--dw-plan)',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', flex: 1, paddingRight: 8 }}>
                          {tField(plan, 'title', lang)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: isComplete ? 'var(--dw-plan-light)' : 'var(--dw-info)',
                          fontFamily: 'var(--font-sans)', background: isComplete ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.08)',
                          padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                        }}>
                          {isComplete ? '✓ Complete' : `${plan.bookId ? 'Ch' : 'Day'} ${dayNum} / ${plan.totalDays}`}
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isComplete ? 'var(--dw-plan-light)' : 'linear-gradient(90deg, var(--dw-plan), var(--dw-plan-light))',
                          borderRadius: 2, transition: 'width 400ms ease',
                        }} />
                      </div>
                    </div>

                    {/* ── Plan completed: prompt to pick the next one ── */}
                    {isComplete && (
                      <div style={{
                        marginTop: 8,
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(96,165,250,0.06))',
                        border: '1px solid rgba(37,99,235,0.2)',
                        borderRadius: 12,
                        padding: '16px',
                      }}>
                        <p style={{
                          fontSize: 15, fontWeight: 700, color: 'var(--dw-text-primary)',
                          fontFamily: 'var(--font-serif)', margin: '0 0 4px',
                        }}>
                          You finished {tField(plan, 'title', lang)}!
                        </p>
                        <p style={{
                          fontSize: 13, color: 'var(--dw-text-secondary)',
                          fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5,
                        }}>
                          Keep the momentum going — pick your next plan.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="dw-btn-dark"
                            onClick={() => onNavigate?.('plans')}
                            style={{
                              flex: 1, background: 'var(--dw-accent)', border: 'none', borderRadius: 10,
                              padding: '12px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              color: '#fff', fontFamily: 'var(--font-sans)',
                            }}
                          >
                            {tI18n('browse_plans', lang)}
                          </button>
                          <button
                            onClick={() => {
                              // Remove the completed plan from active plans
                              try {
                                const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
                                delete ap[plan.id];
                                localStorage.setItem('dw_activeplans', JSON.stringify(ap));
                                try { const _sp = JSON.parse(localStorage.getItem('dw_profile') || '{}'); if (_sp.email) schedulePush(_sp.email); } catch {}
                                setPlanTick(t => t + 1);
                              } catch {}
                            }}
                            style={{
                              background: 'var(--dw-surface-hover)', border: '1px solid var(--dw-border)',
                              borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
                              cursor: 'pointer', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── For You — behavioral personalization (hidden for new_to_faith, comfort) ── */}
        {personaConfig.persona !== 'new_to_faith' && personaConfig.persona !== 'comfort' && (() => {
          const behaviorProfile = getBehaviorProfile();
          if (!hasEnoughBehavior()) return null;
          const personaStr = setup?.persona || '';
          const activePlanIds = homeActivePlans.map(a => a.plan.id);
          const { suggestedPassages, insight, signal } = personalize(
            behaviorProfile, personaStr, activePlanIds, PLAN_CATALOGUE
          );
          if (!suggestedPassages.length && !insight) return null;
          return (
            <Card style={{ marginBottom: 16, border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h2 className="text-section-header" style={{ margin: 0, color: 'var(--dw-info)' }}>{tI18n('for_you', lang)}</h2>
                {signal && signal !== 'mixed' && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--dw-info)',
                    background: 'rgba(37,99,235,0.12)', borderRadius: 20,
                    padding: '2px 8px', fontFamily: 'var(--font-sans)',
                  }}>
                    {signal}
                  </span>
                )}
              </div>
              {insight && (
                <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', lineHeight: 1.55, marginBottom: suggestedPassages.length ? 12 : 0, fontStyle: 'normal' }}>
                  {insight}
                </p>
              )}
              {suggestedPassages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--dw-info)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                    SUGGESTED FOR TODAY
                  </p>
                  {suggestedPassages.map(passage => (
                    <button
                      key={passage}
                      onClick={() => {
                        trackBehavior('passage_read', passage);
                        setExpandedPassages(prev => {
                          const next = new Set(prev);
                          next.add(passage);
                          return next;
                        });
                        loadPassage(passage);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(37,99,235,0.06)',
                        border: '1px solid rgba(37,99,235,0.14)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>{displayPassage(passage, appLanguage)}</span>
                      <span style={{ fontSize: 12, color: 'var(--dw-info)', fontWeight: 600 }}>Read →</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })()}

        {/* Reading Plans Discovery — removed; full plan list lives on Plans tab */}

        {/* Campus Overview — pastor_leader persona only. REAL numbers from the
            campus-scoped analytics endpoint (authenticated by the pastor's own
            campus code); the seeded pseudo-random counts are gone — progress is
            grounded in facts or not shown at all. */}
        {personaConfig.persona === 'pastor_leader' && (() => {
          const campusName = campusStats
            ? (CAMPUSES.find(c => c.id === campusStats.campus)?.name || campusStats.campus)
            : (CAMPUSES.find(c => c.id === userProfile?.campus)?.name || 'your campus');
          return (
            <div style={{
              marginBottom: 16, borderRadius: 16, padding: '16px 14px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(59,130,246,0.04) 100%)',
              border: '1px solid rgba(37,99,235,0.2)',
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--dw-info)', marginBottom: 12,
              }}>
                CAMPUS OVERVIEW
              </p>
              {campusStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-info)', margin: 0 }}>{campusStats.readingToday}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>reading today</p>
                  </div>
                  <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-info)', margin: 0 }}>{campusStats.activeThisWeek}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>active this week</p>
                  </div>
                  <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-purple)', margin: 0 }}>{campusStats.prayerCount}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>prayer requests</p>
                  </div>
                  <div style={{ background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-info)', fontWeight: 600, margin: 0 }}>{campusName}</p>
                  </div>
                </div>
              ) : campusStatsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <Loader2 size={14} style={{ color: 'var(--dw-info)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>{t('loading_label')}</span>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 10px', lineHeight: 1.5 }}>
                    {t('campus_stats_prompt')}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={pastorCodeInput}
                      onChange={e => setPastorCodeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitPastorCode(); }}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={t('campus_stats_prompt')}
                      style={{
                        flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10,
                        border: '1px solid var(--dw-border)', background: 'var(--dw-surface)',
                        color: 'var(--dw-text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
                      }}
                    />
                    <button
                      onClick={submitPastorCode}
                      disabled={!pastorCodeInput.trim()}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: 'none',
                        background: 'var(--dw-info)', color: '#fff', cursor: pastorCodeInput.trim() ? 'pointer' : 'default',
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)',
                        opacity: pastorCodeInput.trim() ? 1 : 0.5, whiteSpace: 'nowrap',
                      }}
                    >
                      {t('campus_stats_view')}
                    </button>
                  </div>
                  {campusStatsError && (
                    <p style={{ fontSize: 11, color: '#B23A2E', fontFamily: 'var(--font-sans)', margin: '8px 0 0' }}>
                      {t('campus_stats_error')}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />

        {/* ── End conditional Daily Word content ── */}

        </div>{/* end hero viewport */}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aiAurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aiBeam {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          40%  { left: 160%; opacity: 0; }
          100% { left: 160%; opacity: 0; }
        }
        @keyframes scaleIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* Hero slider thumb — large, touch-friendly */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          margin-top: -7px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }
        input[type="range"]::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }

        /* Hero card: dramatic colour wave — crimson ↔ near-black rolling through stops */
        @keyframes heroColorWave {
          0%   { background-position: 0% 0%; }
          20%  { background-position: 80% 20%; }
          40%  { background-position: 100% 60%; }
          60%  { background-position: 50% 100%; }
          80%  { background-position: 20% 50%; }
          100% { background-position: 0% 0%; }
        }

        /* Wide bright band sweeping left→right like glass catching light */
        @keyframes heroShimmerSweep {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          80%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
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
        /* Paused state: gentle breathing glow so user sees audio is paused, not stopped */
        @keyframes heroPausedPulse {
          0%, 100% {
            box-shadow: 0 0 0 8px rgba(255,255,255,0.04), 0 10px 32px rgba(0,0,0,0.35);
            border-color: rgba(255,255,255,0.3);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(255,255,255,0.08), 0 10px 32px rgba(0,0,0,0.35);
            border-color: rgba(255,255,255,0.5);
          }
        }
        /* Equalizer ring expansion around play button when audio is active */
        @keyframes heroEqRing {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.06); opacity: 0.8; }
        }
        /* Streak badge glow pulse for milestones */
        @keyframes streakGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(255,120,0,0.45), 0 2px 6px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 22px rgba(255,120,0,0.75), 0 2px 10px rgba(0,0,0,0.25); }
        }
        @keyframes streakFireWiggle {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50% { transform: rotate(4deg) scale(1.12); }
        }
      `}</style>
      {/* Milestone celebration overlay */}
      {showMilestone !== null && (
        <div
          onClick={() => setShowMilestone(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--dw-surface)', borderRadius: 24, padding: '40px 32px',
              textAlign: 'center', maxWidth: 320, width: '90%',
              border: '1px solid rgba(255,149,0,0.3)',
              boxShadow: '0 0 60px rgba(255,149,0,0.2)',
              animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔥</div>
            <p style={{
              fontSize: 32, fontWeight: 700, color: '#FF9500',
              fontFamily: 'var(--font-sans)', marginBottom: 4,
            }}>
              {tI18n('milestone_days', lang).replace('{x}', String(showMilestone))}
            </p>
            <p style={{ fontSize: 17, fontFamily: 'var(--font-serif-text)', color: 'var(--dw-text-primary)', marginBottom: 8 }}>
              {showMilestone >= 100 ? tI18n('milestone_100', lang) : showMilestone >= 30 ? tI18n('milestone_30', lang) : showMilestone >= 14 ? tI18n('milestone_14', lang) : tI18n('milestone_7', lang)}
            </p>
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
              {showMilestone >= 30 ? '"His mercies are new every morning." — Lam. 3:23' : showMilestone >= 7 ? '"Blessed is the one who reads." — Rev. 1:3' : '"Draw near to God and he will draw near to you." — James 4:8'}
            </p>
            <button
              className="dw-btn-dark"
              onClick={() => setShowMilestone(null)}
              style={{
                background: '#FF9500', border: 'none', borderRadius: 12,
                padding: '12px 32px', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {tI18n('p_keep_going', lang)} 🙌
            </button>
          </div>
        </div>
      )}
      {/* Sticky reading action bar — pinned above the tab bar while the expanded
          chapter is on screen, so the core actions never require scrolling away. */}
      {readingBarVisible && (() => {
        const barRef = heroChapterRefs[heroChapterIndex] || heroChapterRefs[0] || '';
        const rawText = passageTexts[`${barRef}_${translation}`] || '';
        // Don't show the bar until the passage text has loaded (else Bookmark/Note would
        // capture empty text), and yield to the highlight toolbar when a verse is selected
        // (they share the same slot) so the two toolbars never stack.
        if (!barRef || !rawText || selection) return null;
        const cleanText = () => {
          try { return parseVerses(rawText).map(v => v.text).join(' '); } catch { return rawText; }
        };
        return (
          <ReadingActionBar
            playing={audioPlaying && !audioPaused && audioCurrentPassage === HERO_KEY}
            canCompare={pf.greekHebrew === 'full'}
            compareActive={compareMode}
            bookmarked={!!highlights[barRef]}
            newPath={isNewPath}
            onNote={() => {
              barNoteSelectionRef.current = true;
              setSelection({ text: cleanText(), verseRefs: [barRef], source: 'select-all' });
              setShowNoteDrawer(true);
            }}
            onListen={() => handleHeroListen()}
            onCompare={() => setCompareMode(m => !m)}
            onAskAI={() => {
              setBibleAIContext(`The reader is currently reading ${barRef} (${translation}). Ground your answer in this passage.`);
              setShowBibleAI(true);
            }}
            onBookmark={() => {
              // toggleHighlight mirrors the bookmark into Notes; it also sets a text
              // selection (pops the highlight toolbar) — clear that, a bookmark tap
              // shouldn't interrupt reading with a toolbar.
              toggleHighlight(barRef, cleanText().slice(0, 200));
              setSelection(null);
            }}
          />
        );
      })()}
      <VerseNoteDrawer
        open={showNoteDrawer}
        onClose={() => {
          setShowNoteDrawer(false);
          // A bar-initiated note selected the whole chapter behind the drawer; on
          // close, drop that selection so the reader isn't left with a gold-washed
          // chapter + lingering highlight toolbar. Toolbar-initiated notes keep
          // their selection (existing flow).
          if (barNoteSelectionRef.current) {
            barNoteSelectionRef.current = false;
            setSelection(null);
          }
        }}
        planContext={todaysPlanPassages.length > 0 ? `${todaysPlanPassages[0].planTitle} — Day ${todaysPlanPassages[0].dayNum}` : undefined}
      />
      {/* Full-screen Day N — the journey reading surface (new_to_faith only).
          Mounted whenever eligible (not just while open) so its useSubView can
          consume the pushed history entry on a UI-initiated close. */}
      {isNewPath && pf.faithPathway && pathwayProgress.enrolled && pathwayData && (() => {
        const jDay = pathwayData.days?.find((d: PathwayDay) => d.day === pathwayDisplayDay);
        const jRef = jDay?.reading ? `${jDay.reading.book} ${jDay.reading.chapter}` : '';
        return (
          <NewBelieverLessonCard
            pathwayData={pathwayData}
            pathwayProgress={pathwayProgress}
            displayDay={pathwayDisplayDay}
            lang={lang}
            t={t}
            scriptureFontSize={scriptureFontSize}
            savePathwayProgress={savePathwayProgressFromLesson}
            open={showJourneyDay}
            onClose={() => setShowJourneyDay(false)}
            passageText={jRef ? passageTexts[`${jRef}_${translation}`] : undefined}
            servedTranslation={jRef ? getServedTranslation(jRef, translation) : undefined}
          />
        );
      })()}
      {/* Global highlight toolbar — appears for ANY selected text (persona-gated).
          newPath swaps it to the simple I'm-New study sheet (What this means /
          Note) — gated on the persona, NOT basicMode, so comfort keeps its
          existing toolbar. */}
      {pf.highlighting !== 'none' && (
        <HighlightToolbar
          onOpenNotes={() => setShowNoteDrawer(true)}
          onGoDeeper={() => { setBibleAIContext(selection?.text || ''); setShowBibleAI(true); }}
          basicMode={pf.highlighting === 'basic'}
          newPath={isNewPath}
          comfortMode={personaConfig.persona === 'comfort'}
          onWhatThisMeans={() => {
            setBibleAIContext(selection?.text || '');
            setBibleAIQuestion(tI18n('what_this_means_q', lang));
            setShowBibleAI(true);
          }}
        />
      )}
      {/* House ads stay off the I'm-New home (journey only); the other five tabs and
          personas keep them — gate the mount here, never inside PromoAds itself. */}
      {!isNewPath && <PromoAds />}
      {pf.greekHebrew !== 'hidden' && (
        <GreekHebrewPopup onGoDeeper={(word) => { setBibleAIContext(word); setShowBibleAI(true); }} />
      )}
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => { setShowBibleAI(false); setBibleAIQuestion(''); }}
        onOpen={() => setShowBibleAI(true)}
        initialContext={bibleAIContext}
        selectedText={selection?.text}
        initialQuestion={bibleAIQuestion || undefined}
      />
      <BibleSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => {
          localStorage.setItem('dw_ai_prefill', query);
          // Open THIS screen's BibleAI. Routing to the app-level one (onOpenAI) is
          // what made Home render two panels at once.
          setShowBibleAI(true);
        }}
      />
      {/* Stop-all lives at App level so keep-alive tabs don't stack three FABs.
          This listener still clears the hero chapter queue. */}
      <div style={{ height: 80 }} />
    </div>
  );
}
