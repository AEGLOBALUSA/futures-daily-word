/**
 * PastorStudyOnboarding — the multi-step "let's set up your reading" wizard for
 * the pastor_leader / deeper_study personas, extracted from HomeScreen. Owns only
 * its step counter; all app-state mutation goes through the startPlanFromHome prop.
 */
import { useState } from 'react';
import { Card } from './Card';
import type { TabId } from './TabBar';
import { PLAN_CATALOGUE } from '../data/plans';
import { tField } from '../utils/i18n';

interface PastorStudyOnboardingProps {
  isPastor: boolean;
  t: (key: string) => string;
  lang: string;
  startPlanFromHome: (planId: string) => void;
  onNavigate?: (tab: TabId) => void;
}

export function PastorStudyOnboarding({ isPastor, t, lang, startPlanFromHome, onNavigate }: PastorStudyOnboardingProps) {
  const [pastorOnboardStep, setPastorOnboardStep] = useState<number>(() => {
    try {
      if (localStorage.getItem('dw_pastor_onboard_completed')) return -2; // fully done, never show
      // If user already has active plans, skip onboarding entirely
      const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
      if (Object.keys(ap).length > 0) return -2;
      return localStorage.getItem('dw_pastor_onboard_dismissed') ? -1 : 0;
    } catch { return 0; }
  });

          // Fully completed — never show again
          if (pastorOnboardStep === -2) {
            return null;
          }

          // Dismissed (said "Later") — show gentle re-entry
          if (pastorOnboardStep === -1) {
            return (
              <Card style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  {isPastor ? "Ready when you are. Let's set up your reading." : "Whenever you're ready to set up your reading, we're here."}
                </p>
                <button
                  className="dw-btn-dark"
                  onClick={() => setPastorOnboardStep(0)}
                  style={{ background: 'var(--dw-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-sans)' }}
                >
                  Let's Go
                </button>
              </Card>
            );
          }

          // ── PASTOR: Step 0 ──
          if (pastorOnboardStep === 0 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                    Let's get you set up.
                  </p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch { /* ignore */ } }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Later</button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', margin: '0 0 18px', lineHeight: 1.6 }}>
                  You've got commentary, Greek/Hebrew tools, word studies, and sermon prep built in. First, let's get the right reading plan locked in.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="dw-btn-dark" onClick={() => setPastorOnboardStep(1)} style={{
                    padding: '16px 18px', borderRadius: 14, background: 'var(--dw-accent)', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>Help me pick the right plan</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Three quick questions</p>
                  </button>
                  <button onClick={() => {
                    setPastorOnboardStep(-2);
                    try {
                      localStorage.setItem('dw_pastor_onboard_completed', '1');
                      localStorage.setItem('dw_pastor_onboard_dismissed', '1');
                      localStorage.setItem('dw_setup_dismissed', '1');
                    } catch { /* ignore */ }
                    onNavigate?.('plans');
                  }} style={{
                    padding: '14px 16px', borderRadius: 14, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>I already know what I want</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Go straight to plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 1 — What's the priority? ──
          if (pastorOnboardStep === 1 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                    What's the priority right now?
                  </p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  This helps us match you with the right plan and tools.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'personal', label: t('setup_personal_time'), sub: t('setup_personal_desc'), next: 10 },
                    { id: 'depth', label: t('setup_deep_study'), sub: t('setup_deep_desc'), next: 11 },
                    { id: 'rhythm', label: t('setup_rhythm'), sub: t('setup_rhythm_desc'), next: 12 },
                    { id: 'prep', label: t('setup_read_ahead'), sub: t('setup_read_ahead_desc'), next: 13 },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPastorOnboardStep(opt.next)} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                      cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 10 — Personal ──
          if (pastorOnboardStep === 10 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>Where do you want to spend time?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick one. You can always change it later.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'psalms-30', label: 'Psalms', sub: '30 days. One Psalm a day.' },
                    { plan: 'gospel-john', label: 'Gospel of John', sub: '21 days. One chapter a day.' },
                    { plan: 'wisdom-lit', label: 'Wisdom Literature', sub: 'Proverbs, Ecclesiastes, Job — 60 days.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 11 — Deep study ──
          if (pastorOnboardStep === 11 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>What do you want to study?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>You'll get full commentary, Greek/Hebrew tools, and word studies with all of these.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'nt-60', label: 'New Testament in 60 days', sub: 'Entire NT in 60 days. 4–5 chapters a day.' },
                    { plan: 'through-bible-year', label: 'Through the Bible in a year', sub: 'Genesis to Revelation. 365 days.' },
                    { plan: 'wisdom-lit', label: 'Wisdom Literature', sub: 'Proverbs, Ecclesiastes, Song of Solomon, Job. 60 days.' },
                    { plan: 'psalms-proverbs', label: 'Psalms & Proverbs', sub: 'One of each, daily.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 12 — Rhythm ──
          if (pastorOnboardStep === 12 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>How much time are you working with?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick the pace that fits your schedule. A plan you finish beats a plan you quit.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'gospel-john', label: '5–10 minutes', sub: 'Gospel of John — 1 chapter a day, 21 days.' },
                    { plan: 'acts-28', label: '10–15 minutes', sub: 'Acts — 1 chapter a day, 28 days.' },
                    { plan: 'gospels-acts', label: '15–20 minutes', sub: 'Gospels & Acts — 2 chapters a day.' },
                    { plan: 'nt-60', label: '20+ minutes', sub: 'Entire New Testament in 60 days. 4–5 chapters a day.' },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </Card>
            );
          }

          // ── PASTOR: Step 13 — Preaching ──
          if (pastorOnboardStep === 13 && isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>What are you preaching through?</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick the closest match. Full commentary, word studies, and cross-references come with every plan.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'gospels-acts', label: 'Gospels & Acts', sub: 'Matthew through Acts. Life of Jesus, birth of the church.' },
                    { plan: 'nt-60', label: 'Full New Testament', sub: 'Romans through Revelation. 60 days.' },
                    { plan: 'psalms-proverbs', label: 'Psalms & Proverbs', sub: 'One of each, daily. Good for a wisdom series.' },
                    { plan: 'book-church', label: 'The Church Awakening', sub: "Ps A's book on purpose and identity of the church." },
                  ].map(opt => (
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                  <button onClick={() => { onNavigate?.('plans'); }} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--dw-border)', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>Browse all plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── DEEPER_STUDY (non-pastor): Step 0 ──
          if (pastorOnboardStep === 0 && !isPastor) {
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>Let's set up your study.</p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch { /* ignore */ } }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Later</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 16px', lineHeight: 1.5 }}>Pick a reading plan and you'll get full commentary, word studies, and Greek/Hebrew tools alongside every passage.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="dw-btn-dark" onClick={() => setPastorOnboardStep(2)} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--dw-accent)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>Help me choose a plan</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>We'll recommend one based on your pace</p>
                  </button>
                  <button onClick={() => {
                    setPastorOnboardStep(-2);
                    try {
                      localStorage.setItem('dw_pastor_onboard_completed', '1');
                      localStorage.setItem('dw_pastor_onboard_dismissed', '1');
                      localStorage.setItem('dw_setup_dismissed', '1');
                    } catch { /* ignore */ }
                    onNavigate?.('plans');
                  }} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>I know what I want</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>Go straight to the plans</p>
                  </button>
                </div>
              </Card>
            );
          }

          // ── DEEPER_STUDY: Step 2 — curated picker ──
          if (pastorOnboardStep === 2) {
            const recommendedPlans = PLAN_CATALOGUE.filter(p => !p.bookId && ['Gospels & Acts', 'New Testament', 'Full Bible', 'Wisdom'].includes(p.category)).slice(0, 6);
            return (
              <Card style={{ marginBottom: 16, padding: '24px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>Here are a few we'd recommend.</p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Back</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>Pick one and you're in. You can always switch later.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recommendedPlans.map(plan => (
                    <button key={plan.id} onClick={() => { startPlanFromHome(plan.id); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } }} style={{
                      padding: '12px 14px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{tField(plan, 'title', lang)}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{tField(plan, 'description', lang).slice(0, 80)}…</p>
                    </button>
                  ))}
                  <button onClick={() => { onNavigate?.('plans'); }} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--dw-border)', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>Browse all plans →</p>
                  </button>
                </div>
              </Card>
            );
          }

          return null;
}
