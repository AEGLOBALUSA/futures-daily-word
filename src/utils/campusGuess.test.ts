import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  guessCampus, knownCampusId, consumeCampusParam, readCampusGuess, chooseCampus,
  CAMPUS_GUESS_KEY, __resetCampusGuessForTests,
} from './campusGuess';
import { FALLBACK_CAMPUSES } from '../data/campuses.fallback';
import type { CampusRow } from '../data/campuses';

const LIST = FALLBACK_CAMPUSES;

beforeEach(() => {
  localStorage.clear();
  __resetCampusGuessForTests();
});

describe('guessCampus', () => {
  it('the link or QR code wins over everything', () => {
    const g = guessCampus({ param: 'us-alpharetta', pcoCampus: 'us-kennesaw', city: 'Kennesaw', subdivision: 'GA', country: 'US' }, LIST);
    expect(g.campusId).toBe('us-alpharetta');
    expect(g.source).toBe('param');
    expect(g.shortList[0]).toBe('us-alpharetta');
    // Her region follows: the Georgia campuses, not Tennessee's.
    expect(g.shortList).toContain('us-kennesaw');
    expect(g.shortList).not.toContain('us-franklin');
  });

  it('Planning Center beats geo', () => {
    const g = guessCampus({ pcoCampus: 'us-gwinnett', city: 'Kennesaw', subdivision: 'GA', country: 'US' }, LIST);
    expect(g.campusId).toBe('us-gwinnett');
    expect(g.source).toBe('pco');
  });

  it('Kennesaw gives us-kennesaw', () => {
    const g = guessCampus({ city: 'Kennesaw', subdivision: 'GA', country: 'US', timeZone: 'America/New_York', lang: 'en' }, LIST);
    expect(g.campusId).toBe('us-kennesaw');
    expect(g.source).toBe('town');
  });

  it('a Spanish reader in Kennesaw is asked about Futuros Kennesaw', () => {
    const g = guessCampus({ city: 'Kennesaw', subdivision: 'GA', country: 'US', lang: 'es' }, LIST);
    expect(g.campusId).toBe('us-futuros-kennesaw');
  });

  it('Adelaide metro gives a short list and no single guess, metro campuses first', () => {
    const g = guessCampus({ city: 'Adelaide', subdivision: 'SA', country: 'AU', timeZone: 'Australia/Adelaide' }, LIST);
    expect(g.campusId).toBeUndefined();
    expect(g.source).toBe('region');
    expect(g.shortList.slice(0, 4).sort()).toEqual(['au-adelaide-city', 'au-paradise', 'au-salisbury', 'au-south'].sort());
    expect(g.shortList).toContain('au-mount-barker');
    expect(g.shortList.every((id) => id.startsWith('au-'))).toBe(true);
  });

  it('an unknown param is ignored', () => {
    const g = guessCampus({ param: 'us-nowhere', city: 'Alpharetta', subdivision: 'GA', country: 'US' }, LIST);
    expect(g.campusId).toBe('us-alpharetta');
    expect(g.source).toBe('town');
  });

  it('a town of the same name in another state is not a match', () => {
    // Franklin, MA is not Franklin, TN.
    const g = guessCampus({ city: 'Franklin', subdivision: 'MA', country: 'US', timeZone: 'America/New_York' }, LIST);
    expect(g.campusId).toBeUndefined();
  });

  it('Kadina, Wallaroo and Moonta all point at Copper Coast; Niterói at Rio', () => {
    for (const city of ['Kadina', 'Wallaroo', 'Moonta']) {
      expect(guessCampus({ city, subdivision: 'SA', country: 'AU' }, LIST).campusId).toBe('au-copper-coast');
    }
    expect(guessCampus({ city: 'Niterói', country: 'BR' }, LIST).campusId).toBe('br-rio');
  });

  it('with only a time zone, gives that region as a short list', () => {
    const g = guessCampus({ timeZone: 'America/Chicago', country: 'US' }, LIST);
    expect(g.campusId).toBeUndefined();
    expect(g.shortList).toEqual(['us-franklin']);
  });

  it('no signals at all: no guess, empty short list', () => {
    const g = guessCampus({}, LIST);
    expect(g).toEqual({ shortList: [], source: 'none' });
  });

  it('never guesses a campus that is not on the list (hidden or retired)', () => {
    const without = LIST.filter((c) => c.id !== 'us-kennesaw');
    const g = guessCampus({ city: 'Kennesaw', subdivision: 'GA', country: 'US', lang: 'en' }, without);
    expect(g.campusId).toBe('us-futuros-kennesaw');
  });

  it('a campus the owner adds later is matched by its own town, no code change', () => {
    const added: CampusRow = { ...LIST[0], id: 'us-marietta', name: 'Futures Marietta', city: 'Marietta, GA', region: 'North America', timeZone: 'America/New_York', sortOrder: 999 };
    const g = guessCampus({ city: 'Marietta', subdivision: 'GA', country: 'US' }, [...LIST, added]);
    expect(g.campusId).toBe('us-marietta');
  });

  it('never offers Other as a guess', () => {
    const g = guessCampus({ param: 'other' }, LIST);
    expect(g.campusId).toBeUndefined();
  });
});

describe('?campus= on arrival', () => {
  function loc(search: string) {
    return { href: `https://futuresdailyword.com/${search}`, search };
  }

  it('keeps a known id as a device-only guess and cleans the URL', () => {
    const replaceState = vi.fn();
    const id = consumeCampusParam(loc('?campus=us-alpharetta&sermon=1'), { replaceState }, LIST);
    expect(id).toBe('us-alpharetta');
    expect(localStorage.getItem(CAMPUS_GUESS_KEY)).toBe('us-alpharetta');
    expect(replaceState).toHaveBeenCalledTimes(1);
    const url = String(replaceState.mock.calls[0][2]);
    expect(url).not.toContain('campus=');
    expect(url).toContain('sermon=1');
    // A guess is never the profile campus.
    expect(localStorage.getItem('dw_profile')).toBeNull();
  });

  it('ignores an unknown id but still cleans the URL', () => {
    const replaceState = vi.fn();
    expect(consumeCampusParam(loc('?campus=%3Cscript%3E'), { replaceState }, LIST)).toBeNull();
    expect(localStorage.getItem(CAMPUS_GUESS_KEY)).toBeNull();
    expect(String(replaceState.mock.calls[0][2])).not.toContain('campus=');
    expect(readCampusGuess(LIST)).toBeNull();
  });

  it('does nothing when there is no campus param', () => {
    const replaceState = vi.fn();
    expect(consumeCampusParam(loc('?sermon=1'), { replaceState }, LIST)).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('a new campus not yet on this phone is accepted once the fetched list knows it', () => {
    const replaceState = vi.fn();
    expect(consumeCampusParam(loc('?campus=us-marietta'), { replaceState }, LIST)).toBeNull();
    expect(readCampusGuess(LIST)).toBeNull();
    const added: CampusRow = { ...LIST[0], id: 'us-marietta', name: 'Futures Marietta', city: 'Marietta, GA' };
    expect(readCampusGuess([...LIST, added])).toBe('us-marietta');
    expect(localStorage.getItem(CAMPUS_GUESS_KEY)).toBe('us-marietta');
  });

  it('a stored guess for a campus since removed is ignored', () => {
    localStorage.setItem(CAMPUS_GUESS_KEY, 'us-retired');
    expect(readCampusGuess(LIST)).toBeNull();
  });
});

describe('knownCampusId', () => {
  it('accepts list ids only, never Other', () => {
    expect(knownCampusId('au-paradise', LIST)).toBe('au-paradise');
    expect(knownCampusId('other', LIST)).toBeNull();
    expect(knownCampusId('', LIST)).toBeNull();
    expect(knownCampusId('zz-nope', LIST)).toBeNull();
  });
});

describe('chooseCampus (the Yes tap)', () => {
  it('saves through the same path as the dropdown: the profile campus via saveProfile', () => {
    const saveProfile = vi.fn();
    const requireEmail = vi.fn();
    const profile = { email: 'reader@example.com', firstName: 'Test', campus: '' };
    expect(chooseCampus('us-kennesaw', { userProfile: profile, saveProfile, requireEmail }, LIST)).toBe('saved');
    expect(saveProfile).toHaveBeenCalledWith({ ...profile, campus: 'us-kennesaw' });
    expect(requireEmail).not.toHaveBeenCalled();
  });

  it('before sign-up, keeps the choice as the device guess and opens the email gate', () => {
    const saveProfile = vi.fn();
    const requireEmail = vi.fn();
    expect(chooseCampus('au-paradise', { userProfile: null, saveProfile, requireEmail }, LIST)).toBe('needs-email');
    expect(saveProfile).not.toHaveBeenCalled();
    expect(requireEmail).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CAMPUS_GUESS_KEY)).toBe('au-paradise');
  });

  it('ignores an id that is not a campus', () => {
    const saveProfile = vi.fn();
    expect(chooseCampus('zz-nope', { userProfile: { campus: '' }, saveProfile, requireEmail: vi.fn() }, LIST)).toBe('ignored');
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
