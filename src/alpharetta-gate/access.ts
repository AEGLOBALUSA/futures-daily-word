import type { AlphaFeature } from './types';

export const ALPHARETTA = 'us-alpharetta';

export function isAlpharettaReader(campus?: string | null): boolean {
  return campus === ALPHARETTA;
}

export function isCreator(staff?: { role?: string; campusId?: string | null; isAdmin?: boolean } | null): boolean {
  return !!staff && (staff.campusId === ALPHARETTA || staff.role === 'admin' || !!staff.isAdmin);
}

export function visibleFeatures(
  features: AlphaFeature[],
  { campus, staff }: { campus?: string | null; staff?: { role?: string; campusId?: string | null; isAdmin?: boolean } | null },
): AlphaFeature[] {
  if (isCreator(staff)) return features;
  if (isAlpharettaReader(campus)) return features.filter(feature => feature.visibility === 'alpharetta');
  return [];
}

export function showAlpharettaTab({
  campus,
  staff,
  features,
}: {
  campus?: string | null;
  staff?: { role?: string; campusId?: string | null; isAdmin?: boolean } | null;
  features: AlphaFeature[];
}): boolean {
  return isCreator(staff) || visibleFeatures(features, { campus, staff }).length > 0;
}
