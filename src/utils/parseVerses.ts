/**
 * Parse a passage string that contains verse markers like [1], [2], etc.
 * into an array of { verse, text } objects.
 *
 * ESV API returns:  "[1] In the beginning God created... [2] The earth was..."
 * Bolls API returns: "[1] text [2] text" (same format)
 *
 * If no verse markers are found, returns a single entry with verse 0 and the full text.
 */
export interface ParsedVerse {
  verse: number;
  text: string;
}

export function parseVerses(raw: string): ParsedVerse[] {
  if (!raw || !raw.trim()) return [];

  // Match [N] markers — the ESV/Bolls format
  const parts = raw.split(/\[(\d+)\]\s*/);

  // parts looks like: ["preamble", "1", "text1", "2", "text2", ...]
  // Index 0 is any text before the first marker (usually empty or whitespace)
  // Then alternating: verseNum, verseText, verseNum, verseText, ...

  const verses: ParsedVerse[] = [];

  // If there's meaningful text before the first [N], include it as verse 0
  const preamble = (parts[0] || '').trim();
  if (preamble) {
    verses.push({ verse: 0, text: preamble });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parseInt(parts[i], 10);
    const verseText = (parts[i + 1] || '').trim();
    if (verseText) {
      verses.push({ verse: verseNum, text: verseText });
    }
  }

  // Fallback: no [N] markers found — treat the whole text as one block
  if (verses.length === 0) {
    verses.push({ verse: 0, text: raw.trim() });
  }

  return verses;
}
