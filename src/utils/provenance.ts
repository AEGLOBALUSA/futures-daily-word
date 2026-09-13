/**
 * Provenance-line formatting for sourced study content (commentaries, the
 * Greek/Hebrew popup, cross-references). Pure — no React, no i18n.
 * Rule: a licence is only ever printed when the study_sources row carries
 * one; loaded_at is never printed as a date.
 */
import type { StudySource } from './study';

export interface ProvenanceFacts {
  name: string;
  edition?: string | null;
  licence?: string | null;
  shareAlikeNote?: string | null;
}

function clean(v: string | null | undefined): string {
  const t = (v || '').trim();
  return t;
}

export function formatProvenance(f: ProvenanceFacts): string {
  const name = clean(f.name);
  if (!name) return '';
  const edition = clean(f.edition);
  const licence = clean(f.licence);
  const parts = [name];
  if (edition) parts.push(edition);
  if (licence) parts.push(licence);
  let out = parts.join(', ');
  const shareAlikeNote = clean(f.shareAlikeNote);
  if (licence && shareAlikeNote) out += `, ${shareAlikeNote}`;
  return out;
}

// Static licence facts for the known study_sources ids, used when the
// study_sources fetch has failed or not yet resolved. Without this a failed
// load silently drops the CC BY / CC BY-SA attribution these licences
// require and shows a raw database id instead of a name.
// Verified against scripts/study/*.mjs (source of truth for these rows).
const STATIC_SOURCE_FALLBACK: Record<string, { name: string; licence: string; shareAlike?: boolean }> = {
  'helloao-matthew-henry': { name: 'Matthew Henry', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'helloao-jfb': { name: 'Jamieson, Fausset & Brown', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'helloao-gill': { name: 'John Gill', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'helloao-clarke': { name: 'Adam Clarke', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'helloao-calvin': { name: 'John Calvin', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'helloao-keil-delitzsch': { name: 'Keil & Delitzsch', licence: 'CC Public Domain Mark 1.0 (public domain)' },
  'openbible-crossrefs': { name: 'OpenBible.info Cross References', licence: 'CC BY 4.0' },
  'oshb-hebrew-strongs': { name: "Open Scriptures Hebrew Bible (Strong's Hebrew Dictionary)", licence: 'CC BY 4.0' },
  'strongs-greek-xml': { name: "Strong's Greek Dictionary", licence: 'CC0 1.0 (public domain)' },
  'stepbible-tagnt': { name: 'STEP Bible TAGNT (Greek New Testament)', licence: 'CC BY 4.0' },
  'stepbible-tahot': { name: 'STEP Bible TAHOT (Hebrew Old Testament)', licence: 'CC BY 4.0' },
  'nave-topical': { name: "Nave's Topical Bible", licence: 'CC BY 4.0' },
  'torrey-topical': { name: "Torrey's New Topical Textbook", licence: 'CC BY 4.0' },
  'theographic-people': { name: 'Theographic Bible Metadata', licence: 'CC BY-SA 4.0', shareAlike: true },
};

export function provenanceForSource(
  sourceId: string,
  sources: Map<string, StudySource> | null,
  fallbackName?: string,
  shareAlikeNote?: string
): ProvenanceFacts {
  const s = sources?.get(sourceId);
  if (s) {
    return {
      name: s.name,
      edition: s.edition,
      licence: s.licence,
      shareAlikeNote: s.share_alike ? (shareAlikeNote || null) : null,
    };
  }
  const fb = STATIC_SOURCE_FALLBACK[sourceId];
  if (fb) {
    return {
      name: fb.name,
      licence: fb.licence,
      shareAlikeNote: fb.shareAlike ? (shareAlikeNote || null) : null,
    };
  }
  return { name: fallbackName || sourceId };
}
