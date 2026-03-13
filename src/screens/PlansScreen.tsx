import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { useUser } from '../contexts/UserContext';
import { DEVOTIONS } from '../data/devotions';
import { CAMPUSES } from '../data/tokens';
import { PLAN_CATALOGUE } from '../data/plans';
import { CheckCircle, Clock, ArrowRight, Play, RotateCcw, BookOpen, MapPin, Video, Heart, Scroll, ChevronRight , Loader2, ChevronLeft, Headphones, Pause } from 'lucide-react';

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
  const startPlan = useCallback((planId: string) => {
    const updated = {
      ...getActivePlans(),
      [planId]: { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 },
    };
    savePlans(updated);
    setActivePlans(updated);
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
  const browsePlans = PLAN_CATALOGUE.filter(p => !activePlanIds.includes(p.id));
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
              {BOOKS.map(book => (
                <Card
                  key={book.id}
                  style={{ cursor: book.jsonFile ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}
                  onClick={() => book.jsonFile && setActiveBook(book.jsonFile)}
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
                  const completedCount = progress.completedDays.length;
                  const pct = plan.totalDays > 0 ? (completedCount / plan.totalDays) * 100 : 0;
                  const isComplete = completedCount >= plan.totalDays;
                  const nextDay = progress.lastDay + 1;
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
                          <CheckCircle size={22} style={{ color: '#6ac895', flexShrink: 0 }} />
                        ) : (
                          <ArrowRight size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExpanded ? 12 : 0 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: isComplete ? '#6ac895' : 'var(--dw-accent)',
                            borderRadius: 2, transition: 'width 300ms ease',
                          }} />
                        </div>
                        <span style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                          {completedCount}/{plan.totalDays}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 8 }}>
                          {!isComplete && nextDay <= plan.totalDays && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
                                Day {nextDay}: {plan.passages[nextDay - 1] || '—'}
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); completePlanDay(plan.id, nextDay); }}
                                className="dw-btn-primary"
                                style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                <CheckCircle size={14} /> Mark Day {nextDay} Complete
                              </button>
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
            {browsePlans.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                  You've started all available plans!
                </p>
              </Card>
            ) : (
              browsePlans.map(plan => (
                <Card key={plan.id}>
                  <span style={{
                    background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
                  }}>
                    {plan.category}
                  </span>
                  <p className="text-card-title" style={{ marginTop: 8 }}>{plan.title}</p>
                  <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                    {plan.description}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
                    {plan.totalDays} days · {plan.passages.length} passages
                  </p>
                  <button
                    onClick={() => { startPlan(plan.id); setPlanView('active'); }}
                    className="dw-btn-primary"
                    style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Play size={14} /> Start Plan
                  </button>
                </Card>
              ))
            )}
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
