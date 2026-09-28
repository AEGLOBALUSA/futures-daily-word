import type { AlphaFeature } from '../alpharetta-gate/types';

// Future builder: put each feature in src/alpharetta/features/<id>/Page.tsx.
// Register it here with visibility: 'creator' so only the Alpharetta pastor
// and admin see it; switch to 'alpharetta' when it is ready for readers.
// Going to every campus is Ashley's decision and means moving it out of here.
// Always register a Page with lazy(() => import('./features/<id>/Page')), never a static import.
export const FEATURES: AlphaFeature[] = [];
