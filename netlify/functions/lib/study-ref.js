/**
 * Scripture reference canon shared by netlify/functions/study.js and the
 * loaders in scripts/study (which import this CommonJS file via createRequire).
 * Book names MUST match src/data/bible-books.ts exactly. No I/O.
 */
const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
  'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];
const CHAPTERS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,
  28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
// USFM / Paratext ids and OSIS ids, canonical order.
const USFM = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH',
  'EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON',
  'MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO',
  'GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
const OSIS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh',
  'Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah',
  'Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor',
  'Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'];

const ALIASES = new Map();
const norm = s => String(s || '').trim().toLowerCase().replace(/[\s._\-']/g, '');
function alias(key, book) { ALIASES.set(norm(key), book); }
BOOKS.forEach((b, i) => { alias(b, b); alias(USFM[i], b); alias(OSIS[i], b); });
[['Psalm','Psalms'],['Pss','Psalms'],['Song of Songs','Song of Solomon'],['Canticles','Song of Solomon'],['Cant','Song of Solomon'],['SoS','Song of Solomon'],['Sol','Song of Solomon'],
 ['Phi','Philippians'],['Phlp','Philippians'],['Philem','Philemon'],['Revelations','Revelation'],['Apocalypse','Revelation'],
 ['Jn','John'],['Mk','Mark'],['Mt','Matthew'],['Lk','Luke'],['Eze','Ezekiel'],['Qoh','Ecclesiastes'],['Jgs','Judges'],
 ['1Kg','1 Kings'],['2Kg','2 Kings'],['1Kin','1 Kings'],['2Kin','2 Kings'],['1Chron','1 Chronicles'],['2Chron','2 Chronicles'],
 ['1Thes','1 Thessalonians'],['2Thes','2 Thessalonians'],['Philip','Philippians'],['Deut','Deuteronomy'],['Nehem','Nehemiah'],
 ['Ecclus','Ecclesiastes'],['Eccles','Ecclesiastes'],['Hebr','Hebrews'],['Zach','Zechariah'],['Mich','Micah'],['Hagg','Haggai'],
].forEach(([k, b]) => alias(k, b));

/** Any book id / name the sources use → canonical name, or null. */
function canonicalBook(raw) {
  if (!raw) return null;
  return ALIASES.get(norm(raw)) || null;
}
function chapterCount(book) { const i = BOOKS.indexOf(book); return i < 0 ? 0 : CHAPTERS[i]; }
function isOldTestament(book) { const i = BOOKS.indexOf(book); return i >= 0 && i < 39; }

/**
 * Parse "Romans 8", "Romans 8:1-4", "Gen.1.1", "1Sam.2.4-6", "ROM 8:28", "Psalm 23"
 * → { book, chapter, verse, verseEnd } (verse 0 = whole chapter) or null.
 * Cross-chapter ranges ("Rom 8:38-9:1") are cut at the first chapter.
 */
function parseRef(raw) {
  const s = String(raw || '').trim().replace(/\s+/g, ' ');
  const m = s.match(/^([1-3]?\s?[A-Za-z][A-Za-z ]*?)\s*[.\s]\s*(\d{1,3})(?:\s*[.:]\s*(\d{1,3})(?:\s*[-–]\s*(?:\d{1,3}\s*[.:]\s*)?(\d{1,3}))?|\s*[-–]\s*(\d{1,3}))?$/);
  if (!m) return null;
  const book = canonicalBook(m[1]);
  if (!book) return null;
  // Single-chapter books are cited by verse: "Jude 3", "Obadiah 1-4", "Philemon 6".
  if (chapterCount(book) === 1 && !m[3]) {
    const verse = Number(m[2]);
    let verseEnd = m[5] ? Number(m[5]) : null;
    if (verseEnd !== null && verseEnd < verse) verseEnd = null;
    return { book, chapter: 1, verse, verseEnd };
  }
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > chapterCount(book)) return null;
  const verse = m[3] ? Number(m[3]) : 0;
  let verseEnd = m[4] ? Number(m[4]) : null;
  if (verseEnd !== null && verseEnd < verse) verseEnd = null;
  // "Romans 8-9" (a chapter range) is cut at the first chapter.
  return { book, chapter, verse, verseEnd };
}

/** "Romans 8:1-4" from the parsed shape. */
function formatRef({ book, chapter, verse, verseEnd }) {
  if (!verse) return `${book} ${chapter}`;
  return `${book} ${chapter}:${verse}${verseEnd && verseEnd !== verse ? `-${verseEnd}` : ''}`;
}

module.exports = { BOOKS, CHAPTERS, canonicalBook, chapterCount, isOldTestament, parseRef, formatRef };
