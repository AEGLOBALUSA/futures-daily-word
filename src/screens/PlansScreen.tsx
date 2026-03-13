import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { DEVOTIONS } from '../data/devotions';
import { CAMPUSES } from '../data/tokens';
import { PLAN_CATALOGUE } from '../data/plans';
import { CheckCircle, Clock, ArrowRight, Play, RotateCcw, BookOpen, MapPin, Video, Heart, Scroll, ChevronRight, Loader2, ChevronLeft, Headphones, Pause, Circle } from 'lucide-react';

interface BookChapter { title: string; paragraphs: string[]; }
interface BookData { id: string; title: string; subtitle?: string; author: string; icon?: string; description?: string; chapters: BookChapter[]; }
interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
  jsonFile?: string;
}

const BOOKS: Book[] = [
  { id: 'from-scarcity', title: 'From Scarcity to Abundance', description: 'A guide to God\'s provision', author: 'Ps A', jsonFile: '/books/scarcity.json' },
  { id: 'church', title: 'The Church Awakening', description: 'Understanding our purpose in faith', author: 'Ps A', jsonFile: '/books/church.json' },
  { id: 'no-more-fear', title: 'No More Fear', description: 'Living boldly in faith', author: 'Ps A', jsonFile: '/books/no_more_fear.json' },
];

const JANE_BOOKS: Book[] = [
  { id: 'jane-book-1', title: 'Grace & Truth', description: 'Biblical foundations for living', author: 'Ps Jane', jsonFile: undefined },
];

/* ── localStorage helpers ── */
interface PlanProgress {
  startedAt: string;
  completedDays: number[];
  lastDay: number;
}

interface BookPlan {
  jsonFile: string;
  title: string;
  author: string;
  currentChapter: number;
  totalChapters: number;
  startedAt: string;
}

function getBookPlans(): Record<string, BookPlan> {
  try { return JSON.parse(localStorage.getItem('dw_book_plans') || '{}'); }
  catch { return {}; }
}

function saveBookToday(bookId: string, data: { title: string; paragraphs: string[]; chapterIndex: number; bookTitle: string; bookAuthor: string }) {
  try { localStorage.setItem(`dw_book_today_${bookId}`, JSON.stringify(data)); } catch {}
}

function getActivePlans(): Record<string, PlanProgress> {
  try {
    return JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
  } catch { return {}; }
}

function savePlans(plans: Record<string, PlanProgress>) {
  localStorage.setItem('dw_activeplans', JSON.stringify(plans));
}

function getStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem('dw_streak') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (data.lastDate === today) return data.count || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (data.lastDate === yesterday.toISOString().slice(0, 10)) return data.count || 0;
    return 0;
  } catch { return 0; }
}

function recordStreak() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = JSON.parse(localStorage.getItem('dw_streak') || '{}');
    if (data.lastDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const count = data.lastDate === yesterday.toISOString().slice(0, 10) ? (data.count || 0) + 1 : 1;
    localStorage.setItem('dw_streak', JSON.stringify({ lastDate: today, count }));
  } catch {
    localStorage.setItem('dw_streak', JSON.stringify({ lastDate: today, count: 1 }));
  }
}

interface EssaySection { title: string; file: string; }
interface EssayTOC { title: string; author: string; sections: EssaySection[]; }

export function PlansScreen() {
  const { userProfile } = useUser();
  const [showPlanDetail, setShowPlanDetail] = useState(false);
  const [plansView, setPlanView] = useState<'active' | 'browse'>('active');
  const [activePlans, setActivePlans] = useState<Record<string, PlanProgress>>(getActivePlans);
  const [streak, setStreak] = useState(getStreak);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedBrowsePlan, setExpandedBrowsePlan] = useState<string | null>(null);
  const [selectedToStart, setSelectedToStart] = useState<string[]>([]);
  const [deactivateConfirm, setDeactivateConfirm] = useState<string | null>(null);

  // Book plan state
  const [bookPlans, setBookPlans] = useState<Record<string, BookPlan>>(getBookPlans);
  const [startingBook, setStartingBook] = useState<string | null>(null);

  const startBookPlan = async (book: Book) => {
    if (!book.jsonFile) return;
    setStartingBook(book.id);
    try {
      const resp = await fetch(book.jsonFile);
      const data = await resp.json();
      const chapters = data.chapters as Array<{ title: string; paragraphs: string[] }>;
      const plan: BookPlan = {
        jsonFile: book.jsonFile,
        title: book.title,
        author: book.author,
        currentChapter: 0,
        totalChapters: chapters.length,
        startedAt: new Date().toISOString(),
      };
      const updated = { ...getBookPlans(), [book.id]: plan };
      localStorage.setItem('dw_book_plans', JSON.stringify(updated));
      saveBookToday(book.id, { title: chapters[0].title, paragraphs: chapters[0].paragraphs, chapterIndex: 0, bookTitle: book.title, bookAuthor: book.author });
      setBookPlans(updated);
    } catch {}
    setStartingBook(null);
  };

  const advanceBookChapter = async (bookId: string) => {
    const plans = getBookPlans();
    const plan = plans[bookId];
    if (!plan) return;
    const nextChapter = plan.currentChapter + 1;
    if (nextChapter >= plan.totalChapters) return;
    try {
      const resp = await fetch(plan.jsonFile);
      const data = await resp.json();
      const chapters = data.chapters as Array<{ title: string; paragraphs: string[] }>;
      const ch = chapters[nextChapter];
      plan.currentChapter = nextChapter;
      plans[bookId] = plan;
      localStorage.setItem('dw_book_plans', JSON.stringify(plans));
      saveBookToday(bookId, { title: ch.title, paragraphs: ch.paragraphs, chapterIndex: nextChapter, bookTitle: plan.title, bookAuthor: plan.author });
      setBookPlans({ ...plans });
    } catch {}
  };

  // Book reader state — must be at top level (Rules of Hooks)
  const [activeBook, setActiveBook] = useState<string | null>(null);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [bookChapter, setBookChapter] = useState<number | null>(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookAudioActive, setBookAudioActive] = useState(false);

  // Essay reader state
  const [activeEssay, setActiveEssay] = useState<string | null>(null);
  const [essayTOC, setEssayTOC] = useState<EssayTOC | null>(null);
  const [essaySection, setEssaySection] = useState<number | null>(null);
  const [sectionContent, setSectionContent] = useState<string>('');
  const [essayLoading, setEssayLoading] = useState(false);
  const [essayAudioActive, setEssayAudioActive] = useState(false);

  // Persona-based plan suggestions
  const persona = (() => {
    try {
      return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || '';
    } catch { return ''; }
  })();

  const readChapter = (paragraphs: string[]) => {
    if (!('speechSynthesis' in window)) return;
    if (bookAudioActive) {
      window.speechSynthesis.cancel();
      setBookAudioActive(false);
      return;
    }
    window.speechSynthesis.cancel();
    const text = paragraphs.join(' ');
    const utter = new SpeechSynthesisUtterance(text.slice(0, 10000));
    utter.lang = 'en-US'; utter.rate = 0.91;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en') && v.localService);
    if (preferred) utter.voice = preferred;
    utter.onend = () => setBookAudioActive(false);
    utter.onerror = () => setBookAudioActive(false);
    setBookAudioActive(true);
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.speak(utter);
      };
    } else { window.speechSynthesis.speak(utter); }
  };

  const readSection = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (essayAudioActive) {
      window.speechSynthesis.cancel();
      setEssayAudioActive(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 10000));
    utter.lang = 'en-US'; utter.rate = 0.91;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /samantha|karen|daniel|moira|siri|enhanced/i.test(v.name) && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en') && v.localService);
    if (preferred) utter.voice = preferred;
    utter.onend = () => setEssayAudioActive(false);
    utter.onerror = () => setEssayAudioActive(false);
    setEssayAudioActive(true);
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; window.speechSynthesis.speak(utter); };
    } else { window.speechSynthesis.speak(utter); }
  };

  const activePlanIds = Object.keys(activePlans);

  // Start a plan — also kicks off the book plan system if plan has a bookId
  const startPlan = useCallback((planId: string) => {
    const planDef = PLAN_CATALOGUE.find(p => p.id === planId);
    const updated = {
      ...getActivePlans(),
      [planId]: { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 },
    };
    savePlans(updated);
    setActivePlans(updated);
    // If this is a book plan, also start the book reading plan
    if (planDef?.bookId && planDef.bookJsonFile) {
      const bookObj = [...BOOKS, ...JANE_BOOKS].find(b => b.id === planDef.bookId);
      if (bookObj) startBookPlan(bookObj);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completePlanDay = useCallback((planId: string, dayNum: number) => {
    const plans = getActivePlans();
    const plan = plans[planId];
    if (!plan) return;
    if (!plan.completedDays.includes(dayNum)) {
      plan.completedDays.push(dayNum);
      plan.lastDay = Math.max(plan.lastDay, dayNum);
    }
    plans[planId] = plan;
    savePlans(plans);
    setActivePlans({ ...plans });
    recordStreak();
    setStreak(getStreak());
  }, []);

  const resetPlan = useCallback((planId: string) => {
    const plans = getActivePlans();
    delete plans[planId];
    savePlans(plans);
    setActivePlans({ ...plans });
    // Also remove book plan data if applicable
    const planDef = PLAN_CATALOGUE.find(p => p.id === planId);
    if (planDef?.bookId) {
      try {
        const bookPlansData = JSON.parse(localStorage.getItem('dw_book_plans') || '{}');
        delete bookPlansData[planDef.bookId];
        localStorage.setItem('dw_book_plans', JSON.stringify(bookPlansData));
        localStorage.removeItem(`dw_book_today_${planDef.bookId}`);
        setBookPlans({ ...bookPlansData });
      } catch {}
    }
  }, []);

  // Auto-suggest faith-pathway for new believers
  useEffect(() => {
    if (persona === 'new_returning' && !activePlans['faith-pathway']) {
      // Don't auto-start, just show browse view
    }
  }, [persona]);

  // Book fetch effect — top level (Rules of Hooks)
  useEffect(() => {
    if (!activeBook) { setBookData(null); setBookChapter(null); return; }
    setBookLoading(true);
    fetch(activeBook, { cache: 'reload' })
      .then(r => r.json())
      .then((d: BookData) => setBookData(d))
      .catch(() => {})
      .finally(() => setBookLoading(false));
  }, [activeBook]);

  // Essay TOC fetch
  useEffect(() => {
    if (!activeEssay) { setEssayTOC(null); setEssaySection(null); setSectionContent(''); return; }
    setEssayLoading(true);
    fetch(`/essays/${activeEssay}/toc.json`)
      .then(r => r.json())
      .then((toc: EssayTOC) => setEssayTOC(toc))
      .catch(() => {})
      .finally(() => setEssayLoading(false));
  }, [activeEssay]);

  // Essay section fetch
  useEffect(() => {
    if (essaySection === null || !essayTOC || !activeEssay) return;
    setEssayLoading(true);
    setSectionContent('');
    const sec = essayTOC.sections[essaySection];
    if (!sec) return;
    fetch(`/essays/${activeEssay}/${sec.file}`)
      .then(r => r.json())
      .then((data: { content?: string; text?: string; body?: string; paragraphs?: string[] }) => {
        setSectionContent(data.content || data.text || data.body || (data.paragraphs ? data.paragraphs.join('\n\n') : ''));
      })
      .catch(() => setSectionContent('Could not load section.'))
      .finally(() => setEssayLoading(false));
  }, [essaySection, essayTOC, activeEssay]);

  const myPlans = PLAN_CATALOGUE.filter(p => activePlanIds.includes(p.id));

  // Persona-based browse ordering — put persona-relevant plans first within each category
  const PERSONA_PRIORITY: Record<string, string[]> = {
    new_returning: ['ashley-jane-daily-word', 'faith-pathway', 'gospel-john', 'acts-28', 'prayer-life', 'armor-of-god'],
    pastor: ['ashley-jane-daily-word', 'book-church', 'gospels-acts', 'nt-60', 'faith-pathway', 'acts-28'],
    deeper: ['ashley-jane-daily-word', 'nt-60', 'wisdom-lit', 'gospels-89', 'through-bible-year', 'psalms-proverbs'],
    difficult: ['ashley-jane-daily-word', 'psalms-30', 'prayer-life', 'armor-of-god', 'faith-pathway', 'psalms-proverbs'],
  };
  const priorityIds = PERSONA_PRIORITY[persona] || [];
  const browsePlans = [...PLAN_CATALOGUE].sort((a, b) => {
    const ai = priorityIds.indexOf(a.id);
    const bi = priorityIds.indexOf(b.id);
    if (ai !== -1 && bi === -1) return -1;
    if (ai === -1 && bi !== -1) return 1;
    if (ai !== -1 && bi !== -1) return ai - bi;
    return 0;
  });
  const campusData = userProfile?.campus ? CAMPUSES.find(c => c.id === userProfile.campus) : null;
  const devotion = DEVOTIONS[0]; // Today's devotion

  // Hub view (V1 structure) - the main Plans & More page
  if (!showPlanDetail) {
    return (
      <div className="screen-container">
      {/* ── In-app book reader ── */}
      {activeBook && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--dw-canvas)', zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Reader header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--dw-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => { if (bookChapter !== null) { window.speechSynthesis?.cancel(); setBookAudioActive(false); setBookChapter(null); } else { window.speechSynthesis?.cancel(); setBookAudioActive(false); setActiveBook(null); } }}
              style={{ background: 'none', border: 'none', color: 'var(--dw-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 14, padding: 0, minHeight: 44 }}
            >
              <ChevronLeft size={18} />
              {bookChapter !== null ? 'Contents' : 'Back'}
            </button>
            {bookData && bookChapter === null && (
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--dw-text-primary)', margin: 0, flex: 1 }}>
                {bookData.title}
              </p>
            )}
            {bookData && bookChapter !== null && (
              <>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dw-text-muted)', margin: 0, flex: 1 }}>
                  {bookData.chapters[bookChapter]?.title}
                </p>
                <button
                  onClick={() => readChapter(bookData.chapters[bookChapter]?.paragraphs || [])}
                  style={{
                    background: bookAudioActive ? 'var(--dw-accent)' : 'var(--dw-accent-bg)',
                    border: `1px solid var(--dw-accent)`,
                    borderRadius: 999, padding: '6px 14px', color: bookAudioActive ? '#fff' : 'var(--dw-accent)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: 5, minHeight: 36,
                  }}
                >
                  {bookAudioActive ? <><Pause size={13} /> Stop</> : <><Headphones size={13} /> Listen</>}
                </button>
              </>
            )}
          </div>
          {/* Reader body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
            {bookLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24 }}>
                <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading…</span>
              </div>
            )}
            {/* Chapter list */}
            {bookData && bookChapter === null && !bookLoading && (
              <div style={{ padding: '16px 20px' }}>
                {bookData.subtitle && (
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 20 }}>{bookData.subtitle}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bookData.chapters.map((ch, i) => (
                    <Card key={i} style={{ cursor: 'pointer' }} onClick={() => setBookChapter(i)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', minWidth: 22 }}>{i + 1}</span>
                        <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)', margin: 0 }}>{ch.title}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {/* Chapter content */}
            {bookData && bookChapter !== null && !bookLoading && (
              <div style={{ padding: '20px 20px' }}>
                {bookData.chapters[bookChapter!]?.paragraphs.map((p: string, i: number) => (
                  <p key={i} style={{ color: 'var(--dw-text-secondary)', fontSize: 16, lineHeight: 1.75, fontFamily: 'var(--font-serif)', marginBottom: 20 }}>{p}</p>
                ))}
              </div>
            )}
          </div>
          <style>{'.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      )}

      {/* ── In-app essay reader ── */}
      {activeEssay && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--dw-canvas)', zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--dw-border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => {
                if (essaySection !== null) { window.speechSynthesis?.cancel(); setEssayAudioActive(false); setEssaySection(null); setSectionContent(''); }
                else { window.speechSynthesis?.cancel(); setEssayAudioActive(false); setActiveEssay(null); }
              }}
              style={{ background: 'none', border: 'none', color: 'var(--dw-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 14, padding: 0, minHeight: 44 }}
            >
              <ChevronLeft size={18} />
              {essaySection !== null ? 'Contents' : 'Back'}
            </button>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--dw-text-primary)', margin: 0, flex: 1 }}>
              {essaySection !== null && essayTOC ? essayTOC.sections[essaySection]?.title : (essayTOC?.title || 'Essay')}
            </p>
            {essaySection !== null && sectionContent && (
              <button
                onClick={() => readSection(sectionContent)}
                style={{
                  background: essayAudioActive ? 'var(--dw-accent)' : 'var(--dw-accent-bg)',
                  border: '1px solid var(--dw-accent)', borderRadius: 999,
                  padding: '6px 14px', color: essayAudioActive ? '#fff' : 'var(--dw-accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  display: 'flex', alignItems: 'center', gap: 5, minHeight: 36,
                }}
              >
                {essayAudioActive ? <><Pause size={13} /> Stop</> : <><Headphones size={13} /> Listen</>}
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
            {essayLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24 }}>
                <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading…</span>
              </div>
            )}
            {/* Section list */}
            {essayTOC && essaySection === null && !essayLoading && (
              <div style={{ padding: '16px 20px' }}>
                {essayTOC.author && (
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 20 }}>by {essayTOC.author}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {essayTOC.sections.map((sec, i) => (
                    <Card key={i} style={{ cursor: 'pointer' }} onClick={() => setEssaySection(i)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', minWidth: 22 }}>{i + 1}</span>
                        <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)', margin: 0 }}>{sec.title}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {/* Section content */}
            {essaySection !== null && sectionContent && !essayLoading && (
              <div style={{ padding: '20px 20px' }}>
                {sectionContent.split('\n\n').map((para, i) => (
                  <p key={i} style={{ color: 'var(--dw-text-secondary)', fontSize: 16, lineHeight: 1.75, fontFamily: 'var(--font-serif)', marginBottom: 20 }}>{para}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        <div style={{ padding: '24px 24px 0' }}>
          {/* Header */}
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26, fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            Plans & More
          </h1>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 24, fontFamily: 'var(--font-sans)' }}>
            Your reading plans, devotion, and community
          </p>

          {/* Devotion of the Day */}
          {devotion && (
            <Card style={{ marginBottom: 24, borderLeft: '3px solid var(--dw-accent)' }}>
              <p className="text-section-header" style={{ marginBottom: 8 }}>DEVOTION OF THE DAY</p>
              <p className="text-card-title" style={{ marginBottom: 8 }}>{devotion.title}</p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                {devotion.verse}
              </p>
              <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
                {devotion.body}
              </p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                — {devotion.author}
              </p>
            </Card>
          )}

          {/* My Campus */}
          {campusData && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={18} style={{ color: 'var(--dw-accent)' }} />
                  <div>
                    <p className="text-card-title">{campusData.name}</p>
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                      {campusData.city}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--dw-text-muted)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="dw-btn-secondary" style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Heart size={14} /> Prayer Wall
                </button>
                {campusData.videoUrl && (
                  <a
                    href={campusData.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dw-btn-secondary"
                    style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flex: 1, textDecoration: 'none' }}
                  >
                    <Video size={14} /> Live Stream
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Your Plans */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>YOUR PLANS</p>
            {myPlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  No active plans
                </p>
                <button className="dw-btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => setShowPlanDetail(true)}>
                  Browse Plans
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myPlans.slice(0, 2).map(plan => {
                  const progress = activePlans[plan.id];
                  if (!progress) return null;
                  const completedCount = progress.completedDays.length;
                  const pct = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
                  return (
                    <Card key={plan.id} style={{ cursor: 'pointer' }} onClick={() => setShowPlanDetail(true)}>
                      <p className="text-card-title" style={{ marginBottom: 8 }}>{plan.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: 'var(--dw-accent)',
                            borderRadius: 2, transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                          {completedCount}/{plan.totalDays}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ps A's Books */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>PS A'S BOOKS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BOOKS.map(book => {
                const bp = bookPlans[book.id];
                return (
                  <Card key={book.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                      onClick={() => book.jsonFile && setActiveBook(book.jsonFile)}>
                      <div style={{ width: 48, height: 48, background: 'var(--dw-accent-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookOpen size={24} style={{ color: 'var(--dw-accent)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', marginBottom: 2 }}>{book.title}</p>
                        <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                          {book.description}
                        </p>
                        {bp && (
                          <p style={{ fontSize: 12, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', marginTop: 3, fontWeight: 600 }}>
                            Chapter {bp.currentChapter + 1} of {bp.totalChapters} · in Study Notes
                          </p>
                        )}
                      </div>
                      <ChevronRight size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                    </div>
                    {/* Reading plan controls */}
                    {book.jsonFile && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {!bp ? (
                          <button
                            onClick={() => startBookPlan(book)}
                            disabled={startingBook === book.id}
                            style={{
                              flex: 1, padding: '9px 14px', borderRadius: 10,
                              background: 'linear-gradient(155deg, #4D2E00 0%, #9A6A08 18%, #C8920E 35%, #E8B910 50%, #F5CF55 58%, #D4A017 72%, #9A6A08 88%, #4D2E00 100%)',
                              color: '#fff', border: 'none', cursor: 'pointer',
                              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {startingBook === book.id ? '+ Adding…' : '+ Add to Reading Plan'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => book.jsonFile && setActiveBook(book.jsonFile)}
                              style={{
                                flex: 1, padding: '9px 14px', borderRadius: 10,
                                background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                                border: '1px solid var(--dw-border)', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                              }}
                            >
                              Read Chapter
                            </button>
                            {bp.currentChapter + 1 < bp.totalChapters && (
                              <button
                                onClick={() => advanceBookChapter(book.id)}
                                style={{
                                  flex: 1, padding: '9px 14px', borderRadius: 10,
                                  background: 'var(--dw-surface)', color: 'var(--dw-text-muted)',
                                  border: '1px solid var(--dw-border)', cursor: 'pointer',
                                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                                }}
                              >
                                Next Chapter →
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Ps Jane's Books */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>PS JANE'S BOOKS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {JANE_BOOKS.map(book => (
                <Card
                  key={book.id}
                  style={{ cursor: book.jsonFile ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}
                  onClick={() => book.jsonFile && window.open(book.jsonFile, '_blank', 'noopener,noreferrer')}
                >
                  <div style={{ width: 48, height: 48, background: 'var(--dw-accent-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={24} style={{ color: 'var(--dw-accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', marginBottom: 4 }}>{book.title}</p>
                    <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                      {book.description}
                    </p>
                    {book.jsonFile && (
                      <p style={{ color: 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 4, fontWeight: 500 }}>
                        Tap to view →
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} style={{ color: book.jsonFile ? 'var(--dw-accent)' : 'var(--dw-text-muted)', flexShrink: 0 }} />
                </Card>
              ))}
            </div>
          </div>

          {/* Essays */}
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 12, paddingLeft: 4 }}>ESSAYS</p>
            <Card style={{ cursor: 'pointer' }} onClick={() => setActiveEssay('knocking-on-the-door')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Scroll size={18} style={{ color: 'var(--dw-accent)' }} />
                <div style={{ flex: 1 }}>
                  <p className="text-card-title">Knocking on the Door</p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                    Conflict personas &amp; biblical guard rails
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--dw-accent)' }} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Plans detail view

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setShowPlanDetail(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dw-accent)',
              cursor: 'pointer',
              padding: 0,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              minHeight: 44,
            }}
          >
            ← Back
          </button>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26, fontWeight: 400,
          color: 'var(--dw-text-primary)',
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Your Plans
        </h1>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Browse and manage your reading plans
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--dw-surface)',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {(['active', 'browse'] as const).map(view => (
            <button
              key={view}
              onClick={() => setPlanView(view)}
              style={{
                flex: 1,
                background: plansView === view ? 'var(--dw-accent)' : 'transparent',
                color: plansView === view ? '#fff' : 'var(--dw-text-muted)',
                border: 'none', borderRadius: 8, padding: '10px 0',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                minHeight: 44, fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {view === 'active' ? `My Plans (${myPlans.length})` : `Browse All (${browsePlans.length})`}
            </button>
          ))}
        </div>

        {plansView === 'active' ? (
          <>
            {myPlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 16 }}>
                <BookOpen size={28} style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }} />
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  No active plans yet
                </p>
                <button className="dw-btn-primary" style={{ fontSize: 13 }} onClick={() => { setShowPlanDetail(true); setPlanView('browse'); }}>
                  Browse Plans
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPlans.map(plan => {
                  const progress = activePlans[plan.id];
                  if (!progress) return null;
                  const isBookPlan = !!plan.bookId;
                  const bookPlanData = isBookPlan && plan.bookId ? bookPlans[plan.bookId] : undefined;

                  // Progress calculation differs for book vs Bible plans
                  const completedCount = isBookPlan
                    ? (bookPlanData ? bookPlanData.currentChapter + 1 : 0)
                    : progress.completedDays.length;
                  const totalItems = isBookPlan ? plan.totalDays : plan.totalDays;
                  const pct = totalItems > 0 ? Math.min((completedCount / totalItems) * 100, 100) : 0;
                  const isComplete = completedCount >= totalItems;
                  const nextDay = isBookPlan
                    ? (bookPlanData ? bookPlanData.currentChapter + 1 : 0)
                    : progress.lastDay + 1;
                  const isExpanded = expandedPlan === plan.id;

                  return (
                    <Card key={plan.id} onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                          }}>
                            {plan.category}
                          </span>
                          <p className="text-card-title" style={{ marginTop: 8 }}>{plan.title}</p>
                        </div>
                        {isComplete ? (
                          <CheckCircle size={22} style={{ color: '#93C5FD', flexShrink: 0 }} />
                        ) : (
                          <ArrowRight size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExpanded ? 12 : 0 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: isComplete ? '#93C5FD' : 'var(--dw-accent)',
                            borderRadius: 2, transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                          {isBookPlan ? `Ch ${completedCount}/${totalItems}` : `${completedCount}/${totalItems} days`}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 8 }}>
                          {!isComplete && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 6, fontFamily: 'var(--font-serif)', lineHeight: 1.4 }}>
                                {isBookPlan
                                  ? `Up next: ${plan.passages[nextDay] || plan.passages[plan.passages.length - 1] || '—'}`
                                  : `Day ${nextDay}: ${plan.passages[nextDay - 1] || '—'}`}
                              </p>
                              {!isBookPlan && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); completePlanDay(plan.id, nextDay); }}
                                  className="dw-btn-primary"
                                  style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  <CheckCircle size={14} /> Mark Day {nextDay} Complete
                                </button>
                              )}
                              {isBookPlan && plan.bookId && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); advanceBookChapter(plan.bookId!); }}
                                  className="dw-btn-primary"
                                  style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  <ArrowRight size={14} /> Next Chapter
                                </button>
                              )}
                            </div>
                          )}
                          {isComplete && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); resetPlan(plan.id); }}
                                className="dw-btn-secondary"
                                style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                <RotateCcw size={14} /> Restart
                              </button>
                            </div>
                          )}
                          {/* Remove plan button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); resetPlan(plan.id); }}
                            style={{
                              marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                              padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            × Remove this plan
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <>
              {/* Multi-select hint */}
              <div style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-border)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <Circle size={16} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.4 }}>
                  You can run <strong>multiple plans at once.</strong> Tap to select, then save.
                </p>
              </div>

              {(() => {
                // Group plans by category
                const categories = Array.from(new Set(browsePlans.map(p => p.category)));
                return categories.map(cat => (
                  <div key={cat}>
                    <p style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--dw-text-muted)',
                      fontFamily: 'var(--font-sans)', margin: '8px 0 8px',
                    }}>{cat}</p>
                    {browsePlans.filter(p => p.category === cat).map(plan => {
                      const isActive = activePlanIds.includes(plan.id);
                      const isSelected = selectedToStart.includes(plan.id);
                      const isPreviewOpen = expandedBrowsePlan === plan.id;
                      const isConfirmingDeactivate = deactivateConfirm === plan.id;
                      const progress = activePlans[plan.id];
                      const bookPlanData = plan.bookId ? bookPlans[plan.bookId] : undefined;

                      return (
                        <div
                          key={plan.id}
                          style={{
                            background: isActive ? 'rgba(37,99,235,0.06)' : isSelected ? 'var(--dw-accent-bg)' : 'var(--dw-card)',
                            border: isActive ? '2px solid rgba(37,99,235,0.5)' : isSelected ? '2px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            cursor: 'pointer',
                            transition: 'border 0.15s, background 0.15s',
                            position: 'relative',
                            marginBottom: 10,
                          }}
                          onClick={() => {
                            if (isActive) {
                              // First tap shows confirm; second tap deactivates
                              if (isConfirmingDeactivate) {
                                resetPlan(plan.id);
                                setDeactivateConfirm(null);
                              } else {
                                setDeactivateConfirm(plan.id);
                                setTimeout(() => setDeactivateConfirm(null), 3000);
                              }
                              return;
                            }
                            setSelectedToStart(prev =>
                              isSelected ? prev.filter(id => id !== plan.id) : [...prev, plan.id]
                            );
                          }}
                        >
                          {/* Status badge top-right */}
                          {isActive ? (
                            <div style={{
                              position: 'absolute', top: 14, right: 14,
                              background: isConfirmingDeactivate ? '#c0392b' : '#2563EB',
                              borderRadius: 999, padding: '2px 9px',
                              fontSize: 10, fontWeight: 700, color: '#fff',
                              fontFamily: 'var(--font-sans)', letterSpacing: '0.04em',
                              textTransform: 'uppercase', transition: 'background 0.2s',
                            }}>
                              {isConfirmingDeactivate ? 'Tap to remove' : '✓ Active'}
                            </div>
                          ) : (
                            <div style={{
                              position: 'absolute', top: 14, right: 14,
                              width: 22, height: 22, borderRadius: '50%',
                              background: isSelected ? 'var(--dw-accent)' : 'var(--dw-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s', flexShrink: 0,
                            }}>
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          )}

                          <p className="text-card-title" style={{ marginTop: 0, paddingRight: 80, marginBottom: 6 }}>{plan.title}</p>
                          <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
                            {plan.description}
                          </p>

                          {/* Progress bar for active plans */}
                          {isActive && progress && !plan.bookId && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                                  Day {progress.completedDays.length} of {plan.totalDays}
                                </span>
                                <span style={{ fontSize: 11, color: '#2563EB', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                                  {Math.round((progress.completedDays.length / plan.totalDays) * 100)}%
                                </span>
                              </div>
                              <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${(progress.completedDays.length / plan.totalDays) * 100}%`, height: '100%', background: '#2563EB', borderRadius: 2 }} />
                              </div>
                            </div>
                          )}
                          {isActive && bookPlanData && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                                  Chapter {bookPlanData.currentChapter + 1} of {bookPlanData.totalChapters}
                                </span>
                                <span style={{ fontSize: 11, color: '#2563EB', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                                  {Math.round(((bookPlanData.currentChapter + 1) / bookPlanData.totalChapters) * 100)}%
                                </span>
                              </div>
                              <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${((bookPlanData.currentChapter + 1) / bookPlanData.totalChapters) * 100}%`, height: '100%', background: '#2563EB', borderRadius: 2 }} />
                              </div>
                            </div>
                          )}

                          {/* Meta row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)', margin: 0 }}>
                              {plan.totalDays} {plan.bookId ? 'chapters' : 'days'}
                            </p>
                            {/* Day preview toggle */}
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedBrowsePlan(isPreviewOpen ? null : plan.id); }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                fontSize: 11, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              {isPreviewOpen ? 'Hide schedule ▲' : 'See schedule ▼'}
                            </button>
                          </div>

                          {/* Day-by-day schedule preview */}
                          {isPreviewOpen && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                marginTop: 12,
                                borderTop: '1px solid var(--dw-border)',
                                paddingTop: 12,
                              }}
                            >
                              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8, textTransform: 'uppercase' }}>
                                {plan.bookId ? 'Reading Schedule' : 'Daily Schedule'}
                              </p>
                              {plan.passages.map((passage, i) => (
                                <div key={i} style={{
                                  display: 'flex', gap: 10, alignItems: 'flex-start',
                                  padding: '5px 0',
                                  borderBottom: i < plan.passages.length - 1 ? '1px solid var(--dw-border-subtle)' : 'none',
                                }}>
                                  <span style={{
                                    minWidth: 42, fontSize: 10, fontWeight: 700,
                                    color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                                    paddingTop: 1,
                                  }}>
                                    {plan.bookId ? `Ch ${i + 1}` : `Day ${i + 1}`}
                                  </span>
                                  <span style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: plan.bookId ? 'var(--font-serif)' : 'var(--font-sans)', lineHeight: 1.4 }}>
                                    {passage}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              {/* Save button — appears when plans selected */}
              {selectedToStart.length > 0 && (
                <div style={{ position: 'sticky', bottom: 80, zIndex: 10 }}>
                  <button
                    onClick={() => {
                      selectedToStart.forEach(id => startPlan(id));
                      setSelectedToStart([]);
                      setPlanView('active');
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--dw-accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 14,
                      padding: '16px 20px',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: 'var(--font-sans)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
                    }}
                  >
                    <Play size={16} />
                    Save {selectedToStart.length} Plan{selectedToStart.length > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </>
          </div>
        )}

        {/* Reading streak */}
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Clock size={24} style={{ color: 'var(--dw-accent)', marginBottom: 8 }} />
          <p className="text-card-title" style={{ marginBottom: 4 }}>
            {streak > 0 ? `${streak} Day Streak` : 'Start Your Streak'}
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            {streak > 0
              ? `Keep going! You've read for ${streak} day${streak > 1 ? 's' : ''} in a row.`
              : 'Complete a plan day to start your reading streak.'}
          </p>
        </Card>

        {/* Suggested faith pathway for new believers */}
        {persona === 'new_returning' && !activePlans['faith-pathway'] && (
          <Card style={{ marginTop: 16, borderLeft: '3px solid var(--dw-accent)' }}>
            <p className="text-section-header" style={{ marginBottom: 8 }}>RECOMMENDED FOR YOU</p>
            <p className="text-card-title" style={{ marginBottom: 4 }}>30-Day Faith Pathway</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
              Perfect for new believers — a guided journey through the foundations of faith.
            </p>
            <button
              onClick={() => { startPlan('faith-pathway'); }}
              className="dw-btn-primary"
              style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Play size={14} /> Start Faith Pathway
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
