import { describe, it, expect } from 'vitest';
import { ALPHARETTA, isCreator, showAlpharettaTab, visibleFeatures } from './access';
import type { AlphaFeature } from './types';

const creatorFeature = { id: 'private', title: 'Private', visibility: 'creator' } as AlphaFeature;
const readerFeature = { id: 'public', title: 'Public', visibility: 'alpharetta' } as AlphaFeature;

describe('Alpharetta access', () => {
  it('hides the tab and features from other readers', () => {
    expect(showAlpharettaTab({ campus: 'us-gwinnett', staff: null, features: [readerFeature] })).toBe(false);
    expect(visibleFeatures([creatorFeature, readerFeature], { campus: 'us-gwinnett', staff: null })).toEqual([]);
  });
  it('does not show creator-only features to an Alpharetta reader', () => {
    expect(showAlpharettaTab({ campus: ALPHARETTA, staff: null, features: [creatorFeature] })).toBe(false);
    expect(visibleFeatures([creatorFeature], { campus: ALPHARETTA, staff: null })).toEqual([]);
  });
  it('shows published features to an Alpharetta reader', () => {
    expect(showAlpharettaTab({ campus: ALPHARETTA, staff: null, features: [creatorFeature, readerFeature] })).toBe(true);
    expect(visibleFeatures([creatorFeature, readerFeature], { campus: ALPHARETTA, staff: null })).toEqual([readerFeature]);
  });
  it('gives the Alpharetta creator the empty tab and every feature', () => {
    const staff = { campusId: ALPHARETTA };
    expect(showAlpharettaTab({ campus: '', staff, features: [] })).toBe(true);
    expect(visibleFeatures([creatorFeature, readerFeature], { campus: '', staff })).toEqual([creatorFeature, readerFeature]);
  });
  it('treats admins as creators but not another campus pastor', () => {
    expect(isCreator({ role: 'admin' })).toBe(true);
    expect(isCreator({ campusId: 'us-gwinnett', role: 'pastor' })).toBe(false);
  });
});
