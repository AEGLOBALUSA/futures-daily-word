import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { track } from '../utils/analytics';
import { isCreator, visibleFeatures } from './access';
import { useAlphaFeatures } from './useAlphaFeatures';
import { useAlphaStaff } from './useAlphaStaff';
import { FeatureSheet } from './FeatureSheet';
import type { AlphaFeature } from './types';

export const ALPHARETTA_TAB_LABEL = 'Alpharetta';
const ALPHARETTA_FEATURE_OPEN = 'alpharetta_feature_open';

const AlpharettaPanel = lazy(() => import('../alpharetta/AlpharettaPanel'));
const loading = <p style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>Loading…</p>;
const pageError = <p style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>This feature couldn&apos;t load. Everything else still works.</p>;

function useAlpharettaGate(campus?: string | null) {
  const staff = useAlphaStaff();
  const { features, ready } = useAlphaFeatures({ campus, staff });
  const visible = visibleFeatures(features, { campus, staff });
  const creator = isCreator(staff);
  const [openFeature, setOpenFeature] = useState<AlphaFeature | null>(null);
  const open = useCallback((feature: AlphaFeature) => {
    track(ALPHARETTA_FEATURE_OPEN, feature.id);
    setOpenFeature(feature);
  }, []);

  const showTab = creator || visible.length > 0;
  const panel = (
    <>
      <ErrorBoundary label="alpharetta" fallback={pageError}>
        <Suspense fallback={loading}>
          <AlpharettaPanel features={visible} creator={creator} ready={ready} onOpen={open} />
        </Suspense>
      </ErrorBoundary>
      {openFeature && <FeatureSheet feature={openFeature} onClose={() => setOpenFeature(null)} />}
    </>
  );
  return { showTab, panel };
}

export function useAlpharettaTab(campus?: string | null): { showTab: boolean; panel: ReactNode } {
  const { showTab, panel } = useAlpharettaGate(campus);
  return { showTab, panel: showTab ? panel : null };
}

export function AlpharettaSlot({ campus }: { campus?: string | null }) {
  const { panel } = useAlpharettaGate(campus);
  return panel;
}
