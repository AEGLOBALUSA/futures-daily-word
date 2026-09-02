/**
 * PreachScreen — the pastor's weekly workspace (design doc §4.3).
 * Lives on the hidden `sermon-notes` tab, swapped in by App.tsx only for the
 * pastor_leader persona. Everyone else keeps the existing congregation
 * Sermon Notes surface — this component itself re-checks the persona and
 * falls back to it, so it is never a blank screen if reached directly.
 *
 * Order, top to bottom: THIS WEEK (focus line + the published sermon, if
 * any) → a four-way Prep / Outline / Publish / Archive workspace. The last
 * open segment is remembered per device (`dw_preach_tab`).
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { fetchCurrentSermon, type CurrentSermonMeta } from '../utils/currentSermon';
import { SermonNotesScreen } from './SermonNotesScreen';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';
import { getPreachingFocus, setPreachingFocus, addPrepItem, isPastorPersona } from '../utils/sermonPrep';
import { restoreStaffSession, STAFF_SESSION_EVENT, type StaffRecord } from '../utils/staffIdentity';
import { PrepSheet } from '../components/preach/PrepSheet';
import { OutlineBuilder } from '../components/preach/OutlineBuilder';
import { PublishSermon } from '../components/preach/PublishSermon';
import { SermonArchive } from '../components/preach/SermonArchive';
import { invalidateSermonArchive } from '../utils/sermonArchive';
import { emptyOutline, loadOutline, type PreachOutline } from '../utils/preachOutline';

interface PreachScreenProps {
  onBack: () => void;
}

type PreachTab = 'prep' | 'outline' | 'publish' | 'archive';
const TAB_KEY = 'dw_preach_tab';
const PASSAGE_KEY = 'dw_preach_passage';
const VALID_TABS: PreachTab[] = ['prep', 'outline', 'publish', 'archive'];
const DEFAULT_PASSAGE = 'Romans 8';

function readTab(): PreachTab {
  try {
    const stored = localStorage.getItem(TAB_KEY);
    if (stored && (VALID_TABS as string[]).includes(stored)) return stored as PreachTab;
  } catch { /* ignore */ }
  return 'prep';
}

function readOutlineSafe(): PreachOutline {
  try { return loadOutline(); } catch { return emptyOutline(); }
}

function readInitialPassage(): string {
  try {
    const stored = localStorage.getItem(PASSAGE_KEY);
    if (stored) return stored;
  } catch { /* ignore */ }
  const passage = readOutlineSafe().passage;
  return passage || DEFAULT_PASSAGE;
}

/** Sticky chrome shared with the congregation surfaces — same idiom, own title. */
function PreachChrome({ onBack, lang, children }: { onBack: () => void; lang: string; children: React.ReactNode }) {
  return (
    <div className="screen-container" style={{ background: 'var(--dw-canvas)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 20px',
        borderBottom: '1px solid var(--dw-border)',
        position: 'sticky', top: 0, background: 'var(--dw-canvas)', zIndex: 10,
      }}>
        <button aria-label={t('back', lang)} onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--dw-accent)',
          cursor: 'pointer', padding: '6px 8px 6px 2px', marginRight: 8, display: 'flex', alignItems: 'center',
          gap: 4, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', borderRadius: 8, minHeight: 44,
        }}>
          <ChevronLeft size={20} />
          {t('back', lang)}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--dw-text-primary)' }}>
          {t('preach_title', lang)}
        </h1>
      </div>
      <div style={{ padding: '16px 20px 40px' }}>{children}</div>
    </div>
  );
}

/** A full-screen overlay reading surface — copied from SermonWorkspace's
 *  "Sermon reading overlay" idiom, reused here for both the congregation's
 *  published notes and a past sermon opened from the Archive. */
function ReadingOverlay({ title, lang, onClose, children }: {
  title: string; lang: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--dw-canvas)', overflowY: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--dw-border)',
        position: 'sticky', top: 0, background: 'var(--dw-canvas)', zIndex: 10,
        paddingTop: 'calc(16px + var(--safe-top, 0px))',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--dw-text-primary)' }}>
          {title}
        </h1>
        <button
          aria-label={t('close_label', lang)}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44 }}
        >
          <X size={22} />
        </button>
      </div>
      <div style={{ padding: '0 20px' }}>{children}</div>
    </div>
  );
}

function ThisWeekCard({ lang, onOpenCongregationNotes }: { lang: string; onOpenCongregationNotes: () => void }) {
  const [focus, setFocus] = useState(() => getPreachingFocus());
  const [sermon, setSermon] = useState<CurrentSermonMeta | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCurrentSermon<CurrentSermonMeta>().then(data => {
      if (!alive) return;
      setSermon(data);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  return (
    <div style={{
      background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
      borderRadius: 16, padding: '18px 20px', marginBottom: 20,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 10px',
      }}>
        {t('preach_this_week', lang)}
      </p>
      <input
        data-testid="preach-focus-input"
        value={focus}
        onChange={e => setFocus(e.target.value)}
        onBlur={() => setPreachingFocus(focus)}
        placeholder={t('preach_focus_placeholder', lang)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 12px', minHeight: 44,
          background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
          borderRadius: 10, color: 'var(--dw-text-primary)',
          fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 14,
        }}
      />
      {!loaded ? null : sermon ? (
        <div data-testid="preach-current-sermon">
          <h2 style={{ fontSize: 18, fontWeight: 400, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: '0 0 6px', lineHeight: 1.25 }}>
            {sermon.series || sermon.title}
          </h2>
          {sermon.speaker && (
            <p style={{ fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>
              {sermon.speaker}
            </p>
          )}
          {sermon.date && (
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
              {sermon.date}
            </p>
          )}
          <button
            data-testid="preach-open-congregation-notes"
            onClick={onOpenCongregationNotes}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--dw-accent-bg, rgba(168,85,47,0.1))',
              border: '1px solid var(--dw-accent)', borderRadius: 10,
              padding: '9px 16px', minHeight: 44, cursor: 'pointer',
              color: 'var(--dw-accent)', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
            }}
          >
            {t('preach_open_congregation_notes', lang)}
          </button>
        </div>
      ) : (
        <p data-testid="preach-no-sermon" style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          {t('preach_no_sermon', lang)}
        </p>
      )}
    </div>
  );
}

function PreachTabs({ tab, onChange, lang }: { tab: PreachTab; onChange: (t: PreachTab) => void; lang: string }) {
  const SEGMENTS: { id: PreachTab; key: string }[] = [
    { id: 'prep', key: 'preach_tab_prep' },
    { id: 'outline', key: 'preach_tab_outline' },
    { id: 'publish', key: 'preach_tab_publish' },
    { id: 'archive', key: 'preach_tab_archive' },
  ];
  return (
    <div data-testid="preach-tabs" role="tablist" style={{
      display: 'flex', gap: 6, background: 'var(--dw-surface)',
      border: '1px solid var(--dw-border)', borderRadius: 12, padding: 4, marginBottom: 20,
    }}>
      {SEGMENTS.map(seg => (
        <button
          key={seg.id}
          role="tab"
          aria-selected={tab === seg.id}
          data-testid={`preach-tab-${seg.id}`}
          onClick={() => onChange(seg.id)}
          style={{
            flex: 1, minHeight: 40, border: 'none', borderRadius: 9, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)',
            background: tab === seg.id ? 'var(--dw-accent)' : 'transparent',
            color: tab === seg.id ? '#fff' : 'var(--dw-text-secondary)',
            padding: '8px 6px',
          }}
        >
          {t(seg.key, lang)}
        </button>
      ))}
    </div>
  );
}

function PreachWorkspace({ onBack, lang }: { onBack: () => void; lang: string }) {
  const [tab, setTabState] = useState<PreachTab>(() => readTab());
  const [passage, setPassageState] = useState<string>(() => readInitialPassage());
  const [outline, setOutline] = useState<PreachOutline>(() => readOutlineSafe());
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [showCongregationNotes, setShowCongregationNotes] = useState(false);
  const [viewing, setViewing] = useState<SermonNotesData | null>(null);
  const [publishedNote, setPublishedNote] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => { restoreStaffSession().then(s => { if (alive) setStaff(s); }); };
    load();
    window.addEventListener(STAFF_SESSION_EVENT, load);
    return () => { alive = false; window.removeEventListener(STAFF_SESSION_EVENT, load); };
  }, []);

  const setTab = useCallback((next: PreachTab) => {
    setTabState(next);
    try { localStorage.setItem(TAB_KEY, next); } catch { /* ignore */ }
  }, []);

  const setPassage = useCallback((next: string) => {
    setPassageState(next);
    try { localStorage.setItem(PASSAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const handlePublished = useCallback(() => {
    invalidateSermonArchive(); // the archive must show what was just published
    setPublishedNote(true);
    setTab('archive');
  }, [setTab]);

  return (
    <PreachChrome onBack={onBack} lang={lang}>
      <ThisWeekCard lang={lang} onOpenCongregationNotes={() => setShowCongregationNotes(true)} />
      <PreachTabs tab={tab} onChange={setTab} lang={lang} />

      {tab === 'prep' && (
        <PrepSheet
          passage={passage}
          onPassageChange={setPassage}
          onAddToOutline={(item: { ref: string; text: string }) => addPrepItem(item.ref, item.text)}
          lang={lang}
        />
      )}
      {tab === 'outline' && (
        <OutlineBuilder lang={lang} onChange={setOutline} />
      )}
      {tab === 'publish' && (
        <PublishSermon outline={outline} staff={staff} lang={lang} onPublished={handlePublished} />
      )}
      {tab === 'archive' && (
        <>
          {publishedNote && (
            <p data-testid="preach-published-success" style={{
              fontSize: 13, color: 'var(--dw-success)', fontFamily: 'var(--font-sans)', margin: '0 0 14px',
            }}>
              {t('preach_published_success', lang)}
            </p>
          )}
          <SermonArchive onOpen={s => setViewing(s)} lang={lang} />
        </>
      )}

      {showCongregationNotes && (
        <ReadingOverlay title={t('sermon_notes_title', lang)} lang={lang} onClose={() => setShowCongregationNotes(false)}>
          <SermonNotesScreen onBack={() => setShowCongregationNotes(false)} embedded readOnly />
        </ReadingOverlay>
      )}

      {viewing && (
        <ReadingOverlay title={viewing.title} lang={lang} onClose={() => setViewing(null)}>
          <SermonNotesSurface sermon={viewing} readOnly />
        </ReadingOverlay>
      )}
    </PreachChrome>
  );
}

/** Entry point. Re-checks the persona itself (never relies solely on the
 *  caller) so this is never a blank screen if reached any other way. */
export function PreachScreen({ onBack }: PreachScreenProps) {
  if (!isPastorPersona()) {
    return <SermonNotesScreen onBack={onBack} />;
  }
  return <PreachWorkspace onBack={onBack} lang={getLang()} />;
}
