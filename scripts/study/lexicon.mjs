/**
 * Strong's number → lexicon entry (study_lexicon).
 *   Greek:  morphgnt/strongs-dictionary-xml strongsgreek.xml (CC0), G1–G5624.
 *   Hebrew: openscriptures/HebrewLexicon HebrewStrong.xml (CC BY 4.0), H1–H8674.
 * Both files are predictable single-purpose XML; a tolerant tag scan is enough
 * (no XML dependency in the repo). Entries are normalised to:
 *   lemma, translit, pronunciation, gloss (one line), definition, usage (KJV renderings).
 */
import { fetchCached, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCES = {
  greek: {
    id: 'strongs-greek-xml',
    name: "Strong's Greek Dictionary (XML edition)",
    licence: 'CC0 1.0 (public domain)',
    attribution: "Strong's Greek Dictionary (James Strong, 1890, public domain); XML edition by Ulrik Sandborg-Petersen, github.com/morphgnt/strongs-dictionary-xml, released under CC0.",
    url: 'https://github.com/morphgnt/strongs-dictionary-xml',
    share_alike: false,
    language: 'en',
  },
  hebrew: {
    id: 'oshb-hebrew-strongs',
    name: "Strong's Hebrew Dictionary (Open Scriptures Hebrew Bible)",
    licence: 'CC BY 4.0',
    attribution: "Hebrew lexicon data from the Open Scriptures Hebrew Bible Project (github.com/openscriptures/HebrewLexicon), licensed under CC BY 4.0. Strong's Hebrew Dictionary text is public domain.",
    url: 'https://github.com/openscriptures/HebrewLexicon',
    share_alike: false,
    language: 'en',
  },
};

const GREEK_URL = 'https://raw.githubusercontent.com/morphgnt/strongs-dictionary-xml/master/strongsgreek.xml';
const HEBREW_URL = 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml';

function text(s) {
  return String(s || '')
    .replace(/<strongsref[^>]*language="(GREEK|HEBREW)"[^>]*strongs="(\d+)"[^>]*\/>/g, (_, l, n) => (l === 'GREEK' ? 'G' : 'H') + n)
    .replace(/<w[^>]*src="([^"]+)"[^>]*>[^<]*<\/w>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
const attr = (s, name) => { const m = String(s).match(new RegExp(`\\b${name}="([^"]*)"`)); return m ? m[1] : ''; };
const first = (s, re) => { const m = String(s).match(re); return m ? m[1] : ''; };

/** One-line gloss: the definition up to its first ';' or ':' (Strong's style). */
function glossOf(def) {
  const d = String(def || '').replace(/^[\s,;:.-]+/, '');
  const cut = d.split(/[;:]/)[0].trim();
  return (cut.length > 90 ? cut.slice(0, 89).replace(/\s+\S*$/, '') + '…' : cut) || d.slice(0, 90);
}

export function parseGreek(xml) {
  const out = [];
  const re = /<entry strongs="(\d+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const num = Number(m[1]);
    const body = m[2];
    const greekTag = first(body, /(<greek [^>]*>)/);
    const lemma = attr(greekTag, 'unicode');
    if (!lemma) continue;
    const translit = attr(greekTag, 'translit');
    const pronunciation = attr(first(body, /(<pronunciation [^>]*\/>)/), 'strongs');
    const derivation = text(first(body, /<strongs_derivation>([\s\S]*?)<\/strongs_derivation>/));
    const def = text(first(body, /<strongs_def>([\s\S]*?)<\/strongs_def>/));
    const kjv = text(first(body, /<kjv_def>([\s\S]*?)<\/kjv_def>/)).replace(/^:--\s*/, '').replace(/\.$/, '');
    const definition = [derivation, def].filter(Boolean).join(' ').trim() || kjv;
    out.push({
      strongs: `G${num}`,
      language: 'greek',
      lemma, translit: translit || null, pronunciation: pronunciation || null,
      gloss: glossOf(def || kjv || derivation),
      definition: definition || null,
      usage: kjv ? `KJV: ${kjv}` : null,
      source_id: SOURCES.greek.id,
    });
  }
  return out;
}

export function parseHebrew(xml) {
  const out = [];
  const re = /<entry id="H(\d+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const num = Number(m[1]);
    const body = m[2];
    const wTag = first(body, /(<w [^>]*>)[^<]*<\/w>/);
    const lemma = first(body, /<w [^>]*>([^<]*)<\/w>/).trim();
    if (!lemma) continue;
    const lang = attr(wTag, 'xml:lang');
    const source = text(first(body, /<source>([\s\S]*?)<\/source>/));
    const meaning = text(first(body, /<meaning>([\s\S]*?)<\/meaning>/));
    const usage = text(first(body, /<usage>([\s\S]*?)<\/usage>/)).replace(/\.$/, '');
    const definition = [source, meaning].filter(Boolean).join(' ').trim() || usage;
    out.push({
      strongs: `H${num}`,
      language: lang === 'arc' ? 'aramaic' : 'hebrew',
      lemma,
      translit: attr(wTag, 'xlit') || null,
      pronunciation: attr(wTag, 'pron') || null,
      gloss: glossOf(meaning || usage || source),
      definition: definition || null,
      usage: usage ? `KJV: ${usage}` : null,
      source_id: SOURCES.hebrew.id,
    });
  }
  return out;
}

export async function load(client, { dryRun = false } = {}) {
  const greek = parseGreek(await fetchCached(GREEK_URL, 'strongsgreek.xml'));
  const hebrew = parseHebrew(await fetchCached(HEBREW_URL, 'HebrewStrong.xml'));
  process.stdout.write(`  lexicon: ${greek.length} Greek, ${hebrew.length} Hebrew/Aramaic entries\n`);
  if (dryRun) return greek.length + hebrew.length;
  for (const [src, rows] of [[SOURCES.greek, greek], [SOURCES.hebrew, hebrew]]) {
    await recordSource(client, src, null);
    await clearSource(client, 'study_lexicon', src.id);
    await upsertBatches(client, 'study_lexicon', rows, { batch: 1000 });
    await recordSource(client, src, rows.length);
  }
  return greek.length + hebrew.length;
}
