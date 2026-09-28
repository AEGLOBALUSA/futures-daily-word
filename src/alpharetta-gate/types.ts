import type React from 'react';

export type Visibility = 'creator' | 'alpharetta';

export interface AlphaPageProps { onClose: () => void }

export interface AlphaFeature {
  id: string;
  title: string;
  summary?: string;
  visibility: Visibility;
  Page: React.LazyExoticComponent<React.ComponentType<AlphaPageProps>>;
}
