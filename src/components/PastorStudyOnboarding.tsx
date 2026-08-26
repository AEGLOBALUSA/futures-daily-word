/**
 * PastorStudyOnboarding — the multi-step "let's set up your reading" wizard for
 * the pastor_leader / deeper_study personas, extracted from HomeScreen. Owns only
 * its step counter; all app-state mutation goes through the startPlanFromHome prop.
 */
import { useState } from 'react';
import { Card } from './Card';
import type { TabId } from './TabBar';
import { PLAN_CATALOGUE } from '../data/plans';
import { tField, t as trans } from '../utils/i18n';
import { getPreachingFocus, setPreachingFocus } from '../utils/sermonPrep';

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

          // Self-dismiss once ANY plan exists — the step state is initialized once,
          // so without this re-check a first-run wizard stayed up after the user
          // started a plan elsewhere (Plans tab, Choose Your Plan, cloud sync).
          try {
            const ap = JSON.parse(localStorage.getItem('dw_activeplans') || '{}');
            if (Object.keys(ap).length > 0) return null;
          } catch { /* ignore */ }

          // Dismissed (said "Later") — show gentle re-entry
          if (pastorOnboardStep === -1) {
            return (
              <Card style={{ marginBottom: 16, textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  {isPastor ? trans('wiz_ready_pastor', lang) : trans('wiz_ready_study', lang)}
                </p>
                <button
                  className="dw-btn-dark"
                  onClick={() => setPastorOnboardStep(0)}
                  style={{ background: 'var(--dw-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-sans)' }}
                >
                  {trans('wiz_lets_go', lang)}
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
                    {trans('wiz_get_set_up', lang)}
                  </p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch { /* ignore */ } }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('later_label', lang)}</button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text)', margin: '0 0 18px', lineHeight: 1.6 }}>
                  {trans('wiz_pastor_intro', lang)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="dw-btn-dark" onClick={() => setPastorOnboardStep(1)} style={{
                    padding: '16px 18px', borderRadius: 14, background: 'var(--dw-accent)', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_help_pick', lang)}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>{trans('wiz_three_questions', lang)}</p>
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
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_know_want', lang)}</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>{trans('wiz_straight_plans', lang)}</p>
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
                    {trans('wiz_priority_q', lang)}
                  </p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  {trans('wiz_priority_sub', lang)}
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>{trans('wiz_where_time_q', lang)}</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>{trans('wiz_pick_one_change', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'psalms-proverbs', label: trans('wiz_plan_psalms', lang), sub: trans('wiz_plan_psalms_sub', lang) },
                    { plan: 'gospel-john', label: trans('wiz_plan_john', lang), sub: trans('wiz_plan_john_sub', lang) },
                    { plan: 'new-testament-90', label: trans('wiz_plan_nt', lang), sub: trans('wiz_plan_nt_sub', lang) },
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>{trans('wiz_study_q', lang)}</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>{trans('wiz_study_sub', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'new-testament-90', label: trans('wiz_plan_nt90', lang), sub: trans('wiz_plan_nt90_sub', lang) },
                    { plan: 'through-bible-year', label: trans('wiz_plan_year', lang), sub: trans('wiz_plan_year_sub', lang) },
                    { plan: 'gospel-john', label: trans('wiz_plan_john', lang), sub: trans('wiz_plan_john_sub', lang) },
                    { plan: 'psalms-proverbs', label: trans('wiz_plan_psalms', lang), sub: trans('wiz_plan_each_daily_sub', lang) },
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>{trans('wiz_time_q', lang)}</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>{trans('wiz_time_sub', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'gospel-john', label: trans('wiz_min_5_10', lang), sub: trans('wiz_min_5_10_sub', lang) },
                    { plan: 'new-testament-90', label: trans('wiz_min_10_15', lang), sub: trans('wiz_min_10_15_sub', lang) },
                    { plan: 'psalms-proverbs', label: trans('wiz_min_15_20', lang), sub: trans('wiz_min_15_20_sub', lang) },
                    { plan: 'through-bible-year', label: trans('wiz_min_20', lang), sub: trans('wiz_min_20_sub', lang) },
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>{trans('wiz_preach_q', lang)}</p>
                  <button onClick={() => setPastorOnboardStep(1)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>{trans('wiz_preach_sub', lang)}</p>
                {/* The question finally accepts its own answer (decision 5): the focus
                    seeds the Notes → Sermon workspace's MY PREPARATION card. */}
                <input
                  defaultValue={getPreachingFocus()}
                  onBlur={e => setPreachingFocus(e.target.value)}
                  placeholder={trans('ws_prep_focus_ph', lang)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                    background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                    borderRadius: 10, color: 'var(--dw-text-primary)',
                    fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', marginBottom: 12,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { plan: 'new-testament-90', label: trans('wiz_full_nt', lang), sub: trans('wiz_full_nt_sub', lang) },
                    { plan: 'through-bible-year', label: trans('wiz_whole_bible', lang), sub: trans('wiz_whole_bible_sub', lang) },
                    { plan: 'psalms-proverbs', label: trans('wiz_plan_psalms', lang), sub: trans('wiz_psalms_wisdom_sub', lang) },
                    { plan: 'book-church', label: 'The Church Awakening', sub: trans('wiz_church_book_sub', lang) },
                  ].map(opt => (
                    // book-church is a book plan (bookId) — excluded from the Home hero
                    // by design, so land the pastor on Plans where the book actually reads.
                    <button key={opt.plan} onClick={() => { startPlanFromHome(opt.plan); setPastorOnboardStep(-2); try { localStorage.setItem('dw_pastor_onboard_completed', '1'); localStorage.setItem('dw_setup_dismissed', '1'); } catch { /* */ } if (opt.plan === 'book-church') onNavigate?.('plans'); }} style={{
                      padding: '14px 16px', borderRadius: 12, background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                  <button onClick={() => { onNavigate?.('plans'); }} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'transparent', border: '1px dashed var(--dw-border)', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_browse_all', lang)}</p>
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
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_setup_study', lang)}</p>
                  <button onClick={() => { setPastorOnboardStep(-1); try { localStorage.setItem('dw_pastor_onboard_dismissed', '1'); } catch { /* ignore */ } }} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('later_label', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 16px', lineHeight: 1.5 }}>{trans('wiz_study_intro', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="dw-btn-dark" onClick={() => setPastorOnboardStep(2)} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--dw-accent)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#fff', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_help_choose', lang)}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>{trans('wiz_recommend_pace', lang)}</p>
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
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_know_want_short', lang)}</p>
                    <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>{trans('wiz_straight_plans', lang)}</p>
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_few_recommend', lang)}</p>
                  <button onClick={() => setPastorOnboardStep(0)} style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{trans('back', lang)}</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 14px', lineHeight: 1.5 }}>{trans('wiz_pick_one_in', lang)}</p>
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
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>{trans('wiz_browse_all', lang)} →</p>
                  </button>
                </div>
              </Card>
            );
          }

          return null;
}
