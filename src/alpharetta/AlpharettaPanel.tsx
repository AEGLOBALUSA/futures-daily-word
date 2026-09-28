import { Suspense, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { track } from '../utils/analytics';
import { FEATURES } from './features';
import { visibleFeatures, isCreator } from './access';
import { useAlphaStaff } from './useAlphaStaff';
import { strings } from './strings';
import type { AlphaFeature } from './types';

const ALPHARETTA_FEATURE_OPEN = 'alpharetta_feature_open';

export default function AlpharettaPanel() {
  const { userProfile } = useUser();
  const staff = useAlphaStaff();
  const features = visibleFeatures(FEATURES, { campus: userProfile?.campus, staff });
  const creator = isCreator(staff);
  const [openFeature, setOpenFeature] = useState<AlphaFeature | null>(null);

  if (openFeature) {
    const Page = openFeature.Page;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 101, background: 'var(--dw-canvas)', overflowY: 'auto' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100%' }}>
          <header style={{ padding: 'calc(34px + env(safe-area-inset-top, 0px) + 10px) 18px 10px', borderBottom: '1px solid var(--dw-border)' }}>
            <button type="button" onClick={() => setOpenFeature(null)} style={{ minHeight: 44, padding: '8px 6px 8px 0', background: 'none', border: 'none', color: 'var(--dw-accent)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
              {strings.back}
            </button>
          </header>
          <ErrorBoundary label={'alpharetta:' + openFeature.id} fallback={<p style={{ padding: 24, color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>{strings.pageError}</p>}>
            <Suspense fallback={<p style={{ padding: 24, color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>{strings.loading}</p>}>
              <Page onClose={() => setOpenFeature(null)} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  if (creator && features.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--dw-text-primary)' }}>{strings.creatorEmptyTitle}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)', lineHeight: 1.5 }}>{strings.creatorEmptyBody}</p>
        <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, boxSizing: 'border-box', borderRadius: 12, background: 'var(--dw-accent)', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', textDecoration: 'none' }}>{strings.creatorEmptyButton}</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {features.map(feature => (
        <button key={feature.id} type="button" onClick={() => { track(ALPHARETTA_FEATURE_OPEN, feature.id); setOpenFeature(feature); }} aria-label={feature.title} style={{ background: 'var(--dw-card)', border: '1px solid var(--dw-border)', borderRadius: 14, padding: 16, minHeight: 64, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ fontSize: 17, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--dw-text-primary)' }}>{feature.title}</div>
          {feature.summary && <div style={{ marginTop: 4, fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)' }}>{feature.summary}</div>}
          {feature.visibility === 'creator' && <div style={{ marginTop: 4, fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)' }}>{strings.creatorTag}</div>}
        </button>
      ))}
    </div>
  );
}
