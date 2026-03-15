/**
 * Pre-loaded Sermon Notes — curated by Futures Church leadership.
 * These appear in both the Sermon Notes tab and the Journal Sermons tab.
 */

export interface SermonData {
  id: string;
  title: string;
  speaker: string;
  campus: string;
  date: string;            // ISO date string
  series?: string;
  keyVerse: string;
  keyVerseText: string;
  /** Full structured sermon content — rendered as sections */
  sections: SermonSection[];
  /** Plain-text body for search / Listen button */
  plainText: string;
  /** Whether this is a pre-loaded (non-deletable) sermon */
  preloaded: true;
}

export interface SermonSection {
  heading: string;
  body: string;              // supports \n\n paragraph breaks
  scripture?: string;        // optional scripture block
  scriptureRef?: string;     // e.g. "Ephesians 2:14 NIV"
  points?: string[];         // numbered or bulleted points
}

export const PRELOADED_SERMONS: SermonData[] = [];
