import { useEffect, useState } from 'react';
import { isAlpharettaReader, isCreator } from './access';
import type { AlphaFeature } from './types';

export const alphaFeatureRegistryLoader = {
  load: (): Promise<unknown> => import('../alpharetta/features'),
};

function isFeature(value: unknown): value is AlphaFeature {
  if (!value || typeof value !== 'object') return false;
  const feature = value as Partial<AlphaFeature>;
  return typeof feature.id === 'string' && feature.id.length > 0
    && typeof feature.title === 'string' && feature.title.length > 0
    && (feature.visibility === 'creator' || feature.visibility === 'alpharetta')
    && (typeof feature.Page === 'function' || (typeof feature.Page === 'object' && feature.Page !== null));
}

export function useAlphaFeatures({
  campus,
  staff,
}: {
  campus?: string | null;
  staff?: { role?: string; campusId?: string | null; isAdmin?: boolean } | null;
}): { features: AlphaFeature[]; ready: boolean } {
  const [features, setFeatures] = useState<AlphaFeature[]>([]);
  const [ready, setReady] = useState(false);
  const allowed = isAlpharettaReader(campus) || isCreator(staff);

  useEffect(() => {
    let mounted = true;
    if (!allowed) {
      setFeatures([]);
      setReady(true);
      return () => { mounted = false; };
    }

    setReady(false);
    alphaFeatureRegistryLoader.load()
      .then(module => {
        const entries = module && typeof module === 'object' && 'FEATURES' in module
          ? (module as { FEATURES?: unknown }).FEATURES
          : [];
        const valid = Array.isArray(entries) ? entries.filter(isFeature) : [];
        if (mounted) {
          setFeatures(valid);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setFeatures([]);
          setReady(true);
        }
      });

    return () => { mounted = false; };
  }, [allowed, campus, staff]);

  return { features, ready };
}
