import { createPortal } from 'react-dom';
import { Suspense, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSubView } from '../utils/useSubView';
import type { AlphaFeature } from './types';

const loading = <p style={{ padding: 24, color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>Loading…</p>;
const pageError = <p style={{ padding: 24, color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>This feature couldn&apos;t load. Everything else still works.</p>;

export function FeatureSheet({ feature, onClose }: { feature: AlphaFeature; onClose: () => void }) {
  useSubView(true, onClose);

  useEffect(() => {
    const reset = () => onClose();
    window.addEventListener('dw-tab-reset', reset);
    return () => window.removeEventListener('dw-tab-reset', reset);
  }, [onClose]);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--dw-canvas)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100%', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <header style={{ padding: 'calc(34px + env(safe-area-inset-top, 0px) + 10px) 18px 10px', borderBottom: '1px solid var(--dw-border)' }}>
          <button type="button" onClick={onClose} style={{ minHeight: 44, padding: '8px 6px 8px 0', background: 'none', border: 'none', color: 'var(--dw-accent)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            Back to Alpharetta
          </button>
        </header>
        <ErrorBoundary label={'alpharetta:' + feature.id} fallback={pageError}>
          <Suspense fallback={loading}>
            <feature.Page onClose={onClose} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>,
    document.body,
  );
}
