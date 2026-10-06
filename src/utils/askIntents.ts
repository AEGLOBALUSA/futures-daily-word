/**
 * Ask does things (DW-P09): the Bible AI box also takes you there.
 *
 * matchIntent(text, lang) reads what the reader typed into Bible AI and, when
 * it is one of a short list of things the app can do itself, returns that
 * thing. Anything else returns null and the question goes to the model as
 * before. Pure and deterministic: fixed patterns in en, es, pt and id, no
 * model call, nothing read from or written to storage.
 *
 * Every pattern except `care` is anchored to the whole message, so a study
 * question that only mentions a passage, a plan or a time ("what does Psalm
 * 23 mean") still reaches the model. `care` is tried first, on every message,
 * with a wide net: crisis or "talk to someone" words go to the pastoral care
 * door and never to a model (Ashley's ruling).
 *
 * The patterns of all four languages are tried whatever the app language;
 * `lang` decides only what depends on it: the translations offered (the
 * licence gate) and which of two same-town campuses a reader means.
 */
import { BOOK_CHAPTERS } from '../data/bible-books';
import { BOOK_NAME_ES, BOOK_NAME_PT, BOOK_NAME_ID, CANONICAL_BOOKS } from '../data/translations';
import { PLAN_CATALOGUE } from '../data/plans';
import { getCampuses, type CampusRow } from '../data/campuses';
import { guessCampus, isFuturosCampus } from './campusGuess';
import { isOfferedTranslation } from './readerTranslation';
import type { TranslationCode } from './api';

export type AskIntent =
  | { kind: 'care'; args: Record<string, never> }
  | { kind: 'add_prayer'; args: { text: string } }
  | { kind: 'read_ref'; args: { book: string; chapter: number; ref: string } }
  | { kind: 'set_reminder'; args: { hour: number } }
  | { kind: 'set_translation'; args: { code: TranslationCode } }
  | { kind: 'sunday_notes'; args: Record<string, never> }
  | { kind: 'im_new'; args: Record<string, never> }
  | { kind: 'set_campus'; args: { campusId: string } }
  | { kind: 'start_plan'; args: { planIds: string[] } };

export type AskIntentKind = AskIntent['kind'];

/** The hours the daily reminder offers (Settings: 5 am to 10 pm). */
export const REMINDER_HOURS: readonly number[] = Array.from({ length: 18 }, (_, i) => i + 5);

// ── Text ────────────────────────────────────────────────────────────────────

/** Lower case, no accents, plain quotes and apostrophes, single spaces. */
function fold(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folded, without the opening ¿¡ and the closing punctuation. */
function base(s: string): string {
  return fold(s).replace(/^[\s¿¡"]+/, '').replace(/[\s.!?¡¿,;:…"]+$/, '').trim();
}

const POLITE_LEAD = /^(please|pls|plz|por favor|porfa|tolong|mohon|hey|hi|ok|okay)[,\s]+/;
const POLITE_TAIL = /[,\s]+(please|pls|plz|por favor|porfa|thanks|thank you|gracias|obrigad[oa]|terima kasih|makasih)$/;

/** base() without a leading or closing "please" (and a closing "thanks"). */
function clean(s: string): string {
  let x = base(s);
  for (let i = 0; i < 2; i++) x = x.replace(POLITE_LEAD, '').replace(POLITE_TAIL, '').trim();
  return x.replace(/[\s.!?,;:]+$/, '').trim();
}

/** What she wrote outside quotation marks: a quoted verse is not her own words. */
function ownWords(s: string): string {
  return String(s || '').replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, ' ');
}

/** An alternation of phrases, longest first, so "read me" is tried before "read". */
function alt(phrases: string[]): string {
  return [...new Set(phrases)].sort((a, b) => b.length - a.length).join('|');
}

// ── care: the widest net, tried first ───────────────────────────────────────

const CARE: RegExp[] = [
  // en
  /\b(talk|speak|chat) (to|with) (someone|somebody|anyone|anybody|a person|a real person|a human|a pastor|my pastor|the pastor|a counsell?or|someone real)\b/,
  /\b(need|want) (someone|somebody) to talk to\b/,
  /\b(i'?m|im|i am) not (ok|okay|alright|all right|doing (ok|okay|well)|safe)\b/,
  /\b(want|wants|wanna|wanting) to die\b/,
  /\b(kill|hurt|harm|cut) (myself|themselves|himself|herself)\b/,
  /\bsuicid/,
  /\bself[- ]?harm/,
  /\bend (my life|it all)\b/,
  /\bno reason to (live|go on)\b/,
  /\bi can'?t (go on|cope|do this anymore|take (it|this) anymore)\b/,
  /\b(i feel|feeling|i'?m|im|i am) (so )?hopeless\b/,
  /\b(i'?m|im|i am) (so |really )?(depressed|in crisis|scared for my life)\b/,
  /\bpanic attack/,
  /\b(being|been|getting) (abused|hurt at home)\b/,
  /\bpastoral care\b/,
  /\bcrisis (line|help|support)\b/,
  /^(i need help|help me|please help me|help|someone help me)$/,
  /^i need (help|someone) (now|right now|urgently)$/,
  /^(i'?m|im|i am) (really )?struggling$/,
  // es
  /\bhablar con (alguien|una persona|un pastor|mi pastor|el pastor|un consejero)\b/,
  /\bno estoy bien\b/,
  /\bquier[oe] morir/,
  /\b(matarme|hacerme dano|lastimarme|quitarme la vida)\b/,
  /\bno puedo mas\b/,
  /\bsin esperanza\b/,
  /\bestoy (muy )?deprimid[oa]\b/,
  /\bcuidado pastoral\b/,
  /^(necesito ayuda|ayudame|ayuda)$/,
  // pt
  /\bfalar com (alguem|uma pessoa|um pastor|meu pastor|o pastor|um conselheiro)\b/,
  /\bnao estou bem\b/,
  /\bquer(o|em) morrer\b/,
  /\b(me matar|me machucar|me ferir|tirar minha vida)\b/,
  /\bnao aguento mais\b/,
  /\bsem esperanca\b/,
  /\bestou (muito )?deprimid[oa]\b/,
  /^(preciso de ajuda|me ajuda|me ajude|socorro)$/,
  // id
  /\b(bicara|berbicara|ngobrol|curhat) (dengan|sama|ke) (seseorang|orang|pendeta|gembala|konselor)\b/,
  /\b(tidak|gak|nggak|ga) baik[- ]baik (saja|aja)\b/,
  /\b(ingin|mau|pengen|pingin) mati\b/,
  /\bbunuh diri\b/,
  /\bmenyakiti diri/,
  /\b(tidak|gak|nggak|ga) kuat lagi\b/,
  /\bputus asa\b/,
  /\b(saya|aku) (sangat )?depresi\b/,
  /\bpelayanan pastoral\b/,
  /^(saya butuh bantuan|aku butuh bantuan|tolong saya|tolong aku|tolong)$/,
];

function isCare(text: string): boolean {
  const x = base(ownWords(text));
  return !!x && CARE.some((re) => re.test(x));
}

// ── add_prayer: her own words go into the Add-prayer box ────────────────────

// Matched on the lower-cased ORIGINAL text (accents kept), so the words after
// the lead can be cut from what she typed, unchanged.
const PRAYER_LEADS: RegExp[] = [
  // en: "please pray for …", "can you pray that …", "i need prayer for …", "prayer request: …"
  /^\s*(?:(?:please|pls|plz|hey|hi)[,\s]+)?(?:(?:can|could|would|will) (?:you|someone|somebody|everyone|you all|y'all) (?:please )?)?(?:please )?pray (?:for|about|over)\s+/,
  /^\s*(?:(?:please)[,\s]+)?(?:i|we) (?:need|would like|'d like|’d like|want|ask for) (?:some )?prayers? (?:for|about|over)\s+/,
  /^\s*prayer request[:\s-]+/,
  // es: "por favor oren por …", "pueden orar por …", "necesito oración por …"
  /^\s*(?:por favor[,\s]+)?(?:(?:puedes|pueden|podrías|podrias|podrían|podrian) )?(?:por favor )?(?:orar|ora|oren|rezar|reza|recen) por\s+/,
  /^\s*(?:por favor[,\s]+)?(?:necesito|necesitamos|pido) (?:una )?oraci[oó]n (?:por|para)\s+/,
  /^\s*petici[oó]n de oraci[oó]n[:\s-]+/,
  // pt: "por favor orem por …", "podem orar pela …", "preciso de oração por …"
  /^\s*(?:por favor[,\s]+)?(?:(?:pode|podem|poderia|poderiam) )?(?:por favor )?(?:orar|ore|orem|rezar|reze) (?:por|pelo|pela|pelos|pelas)\s+/,
  /^\s*(?:por favor[,\s]+)?(?:preciso|precisamos) de (?:uma )?ora[cç][aã]o (?:por|pelo|pela|para)\s+/,
  /^\s*pedido de ora[cç][aã]o[:\s-]+/,
  // id: "tolong doakan …", "mohon doa untuk …", "saya butuh doa untuk …"
  /^\s*(?:(?:tolong|mohon|bisakah|bisa)[,\s]+)?(?:doakan|doain|mendoakan|berdoa untuk|berdoalah untuk|doa untuk)\s+/,
  /^\s*(?:saya|aku|kami) (?:butuh|perlu|minta) (?:dukungan )?doa (?:untuk|bagi)\s+/,
  /^\s*pokok doa[:\s-]+/,
];

/** "me" / "us" alone is not a request on its own: keep the whole sentence. */
const ONLY_SELF = /^(me|us|m[ií]|nosotros|nosotras|mim|n[oó]s|saya|aku|kami)$/i;

/** "pray that God heals my dad": a request whose whole sentence is the request. */
const PRAY_THAT = /^\s*(?:(?:please|pls|plz|por favor|tolong|mohon)[,\s]+)?(?:(?:can|could|would|will) (?:you|someone|somebody|everyone|you all) (?:please )?)?(?:please )?(?:pray that|orar para que|oren para que|ora para que|orem para que|ore para que|orar para que|doakan (?:agar|supaya|biar))\s+\S/;

function prayerText(text: string): string | null {
  const original = String(text || '').normalize('NFC').trim();
  if (!original) return null;
  const lower = original.toLowerCase();
  for (const lead of PRAYER_LEADS) {
    const m = lead.exec(lower);
    if (!m) continue;
    const rest = original.slice(m[0].length).replace(/[\s?¿]+$/, '').trim();
    const restPlain = rest.replace(/[\s.!?,;:]+$/, '');
    if (!restPlain) return null;
    // Her words, unchanged: only the leading "please pray for" goes.
    return ONLY_SELF.test(restPlain) ? original.replace(/[\s?¿]+$/, '') : rest;
  }
  if (PRAY_THAT.test(lower)) return original.replace(/[\s?¿]+$/, '');
  return null;
}

// ── read_ref: open the reader at a book and chapter ─────────────────────────

const ORDINALS: [RegExp, string][] = [
  [/^(1st|first|i|primera|primer|primeira|primeiro|pertama)\s+(de\s+)?/, '1 '],
  [/^(2nd|second|ii|segunda|segundo|kedua)\s+(de\s+)?/, '2 '],
  [/^(3rd|third|iii|tercera|tercero|terceira|terceiro|ketiga)\s+(de\s+)?/, '3 '],
];

function bookKey(s: string): string {
  let x = fold(s).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, d] of ORDINALS) {
    if (re.test(x)) { x = x.replace(re, d); break; }
  }
  return x.replace(/^(\d)\s*/, '$1 ');
}

const BOOK_ALIASES: Record<string, string[]> = {
  Psalms: ['psalm', 'ps', 'psa', 'salmo', 'mazmur'],
  'Song of Solomon': ['song of songs', 'songs', 'song', 'cantar de los cantares', 'cantico dos canticos', 'canticos dos canticos'],
  Revelation: ['revelations', 'apocalypse'],
};

let bookIndex: Map<string, string> | null = null;

function books(): Map<string, string> {
  if (bookIndex) return bookIndex;
  const m = new Map<string, string>();
  const add = (name: string, book: string) => { const k = bookKey(name); if (k && !m.has(k)) m.set(k, book); };
  for (const book of CANONICAL_BOOKS) {
    add(book, book);
    add((BOOK_NAME_ES as Record<string, string>)[book] || '', book);
    add((BOOK_NAME_PT as Record<string, string>)[book] || '', book);
    add((BOOK_NAME_ID as Record<string, string>)[book] || '', book);
    for (const a of BOOK_ALIASES[book] || []) add(a, book);
  }
  bookIndex = m;
  return m;
}

/** "Psalm 23", "Salmos 23:1-6", "1 Juan 4" → the book (English) and chapter, or null. */
export function parseChapterRef(raw: string): { book: string; chapter: number; ref: string } | null {
  const m = /^(.+?)\s*(\d{1,3})(?:\s*[:.]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?$/.exec(fold(raw).replace(/^(the|el|la|o|a|kitab)\s+/, ''));
  if (!m) return null;
  const book = books().get(bookKey(m[1]));
  if (!book) return null;
  const chapter = parseInt(m[2], 10);
  const max = BOOK_CHAPTERS[book] || 0;
  if (!(chapter >= 1 && chapter <= max)) return null;
  return { book, chapter, ref: `${book} ${chapter}` };
}

const READ_VERB = new RegExp('^(?:' + alt([
  // en
  'read', 'read me', 'open', 'open up', 'show me', 'show', 'go to', 'take me to', 'turn to', "let'?s read",
  'i want to read', "i'?d like to read", 'i wanna read', 'can i read', 'start reading', 'bring up', 'pull up',
  // es
  'lee', 'leer', 'leeme', 'abre', 'abrir', 'abreme', 'muestrame', 'ir a', 'llevame a', 'vamos a leer', 'quiero leer',
  // pt
  'ler', 'leia', 'abra', 'abre', 'me mostre', 'mostre', 'mostra', 'ir para', 'me leve para', 'vamos ler', 'quero ler',
  // id
  'baca', 'bacakan', 'buka', 'bukakan', 'tunjukkan', 'tampilkan', 'mau baca', 'saya mau baca', 'aku mau baca',
  'ayo baca', 'ingin membaca', 'saya ingin membaca', 'pergi ke',
]) + ')\\s+(.+)$');

// ── set_reminder ────────────────────────────────────────────────────────────

const AM_WORDS = /^(am|a ?m|morning|in the morning|every morning|each morning|de la manana|da manha|pagi|pagi hari)$/;
const PM_WORDS = /^(pm|p ?m|afternoon|evening|night|tonight|at night|in the (afternoon|evening)|every (evening|night)|each (evening|night)|de la tarde|de la noche|da tarde|da noite|siang|sore|malam|malam hari)$/;

const REMIND_LEAD = new RegExp('^(?:' + alt([
  // en
  'remind me', 'remind me (?:every|each) day', 'remind me daily', 'set (?:a |my )?(?:daily )?reminder',
  'reminder', 'send me a reminder', 'notify me', 'ping me', 'nudge me', 'move my reminder',
  'change my reminder(?: time)?', 'set my reminder(?: time)?', 'my reminder',
  // es
  'recuerdame', 'recordarme', 'avisame', 'ponme un recordatorio', 'pon un recordatorio', 'pon mi recordatorio',
  'cambia mi recordatorio', 'recordatorio', 'recuerdame todos los dias', 'recuerdame cada dia',
  // pt
  'me lembre', 'me lembra', 'lembre-me', 'lembra-me', 'me avise', 'me avisa', 'coloque um lembrete',
  'coloca um lembrete', 'lembrete', 'muda meu lembrete', 'mude meu lembrete', 'me lembre todo dia',
  'me lembre todos os dias',
  // id
  'ingatkan saya', 'ingatkan aku', 'ingetin saya', 'ingetin aku', 'pasang pengingat', 'atur pengingat',
  'pengingat', 'ubah pengingat(?: saya)?', 'ganti pengingat(?: saya)?', 'ingatkan saya setiap hari',
  'ingatkan aku setiap hari',
]) + ')(?:\\s+(?:to|for|para|pada))?(?:\\s+(?:at|@|a las|a la|para las|as|a|pras|jam|pukul|pada jam|pada pukul|ke jam))?\\s+'
  + '(\\d{1,2})(?:\\s*[:.h]\\s*(\\d{2}))?\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|o\'?clock|h)?'
  + '(?:\\s+(.*))?$');

const DAILY_TAIL = /^(every ?day|each day|daily|todos los dias|cada dia|diario|todo dia|todos os dias|diariamente|setiap hari|tiap hari)$/;

function reminderHour(text: string): number | null {
  const m = REMIND_LEAD.exec(clean(text));
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const unit = (m[3] || '').replace(/[.\s]/g, '');
  // The tail may carry the part of day and/or "every day", in either order.
  let tail = (m[4] || '').trim();
  let marker: 'am' | 'pm' | null = unit === 'am' ? 'am' : unit === 'pm' ? 'pm' : null;
  for (let i = 0; i < 2 && tail; i++) {
    const parts = tail.split(' ');
    let consumed = false;
    for (let n = parts.length; n >= 1 && !consumed; n--) {
      const head = parts.slice(0, n).join(' ');
      if (DAILY_TAIL.test(head)) consumed = true;
      else if (AM_WORDS.test(head)) { marker = marker || 'am'; consumed = true; }
      else if (PM_WORDS.test(head)) { marker = marker || 'pm'; consumed = true; }
      if (consumed) tail = parts.slice(n).join(' ').trim();
    }
    if (!consumed) return null;
  }
  if (tail) return null;
  if (min !== 0) return null; // the reminder is on the hour; anything else goes to the model
  let hour: number;
  if (marker === 'am') {
    if (h < 1 || h > 12) return null;
    hour = h === 12 ? 0 : h;
  } else if (marker === 'pm') {
    if (h < 1 || h > 12) return null;
    hour = h === 12 ? 12 : h + 12;
  } else if (h >= 13 && h <= 23) {
    hour = h;
  } else if (h >= 1 && h <= 4) {
    hour = h + 12; // "remind me at 3" is the afternoon
  } else if (h >= 5 && h <= 12) {
    hour = h; // "remind me at 6" is the morning
  } else {
    return null;
  }
  return REMINDER_HOURS.includes(hour) ? hour : null;
}

// ── set_translation ─────────────────────────────────────────────────────────

const TRANSLATION_NAMES: [string, TranslationCode][] = [
  ['niv', 'NIV'], ['new international version', 'NIV'],
  ['esv', 'ESV'], ['english standard version', 'ESV'],
  ['nlt', 'NLT'], ['new living translation', 'NLT'], ['new living', 'NLT'],
  ['kjv', 'KJV'], ['king james', 'KJV'], ['king james version', 'KJV'],
  ['nkjv', 'NKJV'], ['new king james', 'NKJV'], ['new king james version', 'NKJV'],
  ['amp', 'AMP'], ['amplified', 'AMP'], ['amplified bible', 'AMP'],
  ['nasb', 'NASB'], ['new american standard', 'NASB'], ['new american standard bible', 'NASB'],
  ['web', 'WEB'], ['world english', 'WEB'], ['world english bible', 'WEB'],
  ['rv1960', 'RV1960'], ['rvr1960', 'RV1960'], ['rvr60', 'RV1960'], ['rv60', 'RV1960'],
  ['reina valera', 'RV1960'], ['reina valera 1960', 'RV1960'],
  ['nvi', 'NVI'], ['nueva version internacional', 'NVI'],
  ['ara', 'ARA'], ['almeida', 'ARA'], ['almeida revista e atualizada', 'ARA'],
  ['tb', 'TB'], ['terjemahan baru', 'TB'],
];

function translationCode(raw: string): TranslationCode | null {
  const x = fold(raw).replace(/-/g, ' ')
    .replace(/^(the|la|a|o|el|versi|terjemahan)\s+/, '')
    .replace(/\s+(translation|version|bible|traduccion|version|biblia|traducao|versao|terjemahan|versi|alkitab)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const hit = TRANSLATION_NAMES.find(([name]) => name === x);
  return hit ? hit[1] : null;
}

const TRANSLATION_LEADS: RegExp[] = [
  // en
  /^(?:switch|change|swap|move|set|put)(?: me| it| my (?:bible|translation|version|bible translation|bible version))?(?: over)? (?:to|into) (.+?)(?: (?:from now on|instead|for me))?$/,
  /^(?:i want to read(?: in)?|i'?d like to read(?: in)?|can i (?:use|read|have)|let me read|let me use|read from|read in|i prefer|give me|show me|i want|i'?d like|use) (.+?)(?: (?:from now on|instead|for me))?$/,
  // es
  /^(?:cambia(?:r|me)?|pon(?:me|er)?|pasa(?:r|me)?|usa(?:r)?|quiero(?: leer)?(?: en)?|prefiero|lee(?:r)? en)(?: (?:la|mi) (?:traduccion|version|biblia))?(?: (?:a|en|por|con))? (.+?)(?: (?:de ahora en adelante|desde ahora))?$/,
  // pt
  /^(?:muda(?:r)?|mude|troca(?:r)?|troque|coloca(?:r)?|coloque|usa(?:r)?|use|quero(?: ler)?(?: na| em)?|prefiro|ler na|ler em)(?: (?:a|minha) (?:traducao|versao|biblia))?(?: (?:para|pra|na|em|a))? (.+?)(?: (?:de agora em diante|daqui pra frente))?$/,
  // id
  /^(?:ganti|ubah|pakai|gunakan|pindah|mau pakai|saya mau pakai|aku mau pakai|saya mau baca|aku mau baca|baca pakai)(?: (?:terjemahan|versi|alkitab)(?: saya| aku)?)?(?: (?:ke|jadi|dengan|pakai))? (.+?)(?: (?:mulai sekarang|seterusnya))?$/,
];

function translationIntent(text: string, lang: string): TranslationCode | null {
  const x = clean(text);
  for (const re of TRANSLATION_LEADS) {
    const m = re.exec(x);
    if (!m) continue;
    const code = translationCode(m[1]);
    if (!code) continue;
    // The licence gate: only what Settings offers in her language.
    return isOfferedTranslation(code, lang) ? code : null;
  }
  return null;
}

// ── sunday_notes ────────────────────────────────────────────────────────────

const NOTES: RegExp[] = [
  // en
  /^(?:where (?:are|is|can i (?:find|see|get)|do i find)|open|show(?: me)?|find|get|take me to|go to|i want|i need|can i (?:see|have|get)|bring up|pull up)?\s*(?:(?:the|my|this|last|today'?s|this week'?s|sunday'?s|sundays|our|church'?s) )*(?:(?:sunday'?s?|sermon|message|church|weekend|service) )+notes(?: (?:from|for) (?:sunday|church|this week|last sunday|the sermon|today|this sunday))?$/,
  /^(?:where (?:are|is)|open|show(?: me)?|find)?\s*(?:the )?notes (?:from|for) (?:sunday|church|the sermon|this sunday|last sunday|the service|today'?s (?:sermon|service))$/,
  // es
  /^(?:donde (?:estan|encuentro|veo)|abre|abrir|muestrame|ver|quiero(?: ver)?|necesito)?\s*(?:las |mis )?notas (?:del|de la|de) (?:sermon|domingo|mensaje|predica|predicacion|iglesia|culto)(?: del domingo| de hoy| de esta semana)?$/,
  // pt
  /^(?:onde (?:estao|encontro|vejo)|abra|abrir|me mostre|mostre|ver|quero(?: ver)?|preciso)?\s*(?:as |minhas )?(?:notas|anotacoes) (?:do|da|de) (?:sermao|domingo|mensagem|pregacao|culto|igreja)(?: de domingo| de hoje| desta semana)?$/,
  // id
  /^(?:di ?mana|buka|tunjukkan|lihat|mau lihat|saya mau(?: lihat)?|aku mau(?: lihat)?)?\s*catatan (?:khotbah|kotbah|minggu|ibadah|firman)(?: (?:hari )?minggu(?: ini| lalu)?| hari ini)?$/,
];

// ── im_new ──────────────────────────────────────────────────────────────────

const IM_NEW: RegExp[] = [
  // en
  /^(?:i'?m|im|i am) (?:brand |very |totally |completely |pretty |really )?new(?: (?:to|at|in|with) (?:all (?:of )?this|this|faith|the faith|church|jesus|christianity|god|the bible|reading the bible|being a christian|following jesus|it all|all this))?(?: here)?$/,
  /^(?:i'?m|im|i am) a new (?:christian|believer|follower of jesus)$/,
  /^i (?:just|recently) (?:became a christian|got saved|gave my life to (?:jesus|christ|god)|started following jesus|started believing)$/,
  /^(?:where|how) (?:do|should|can) i (?:start|begin)$/,
  /^i (?:don'?t|do not) know where to (?:start|begin)$/,
  // es
  /^(?:soy|estoy) (?:muy |totalmente )?nuev[oa](?: (?:en|con) (?:todo )?(?:esto|la fe|la iglesia|jesus|la biblia|el cristianismo|dios))?(?: aqui)?$/,
  /^acabo de (?:aceptar a (?:jesus|cristo)|hacerme cristian[oa]|conocer a (?:jesus|dios)|entregarle mi vida a (?:jesus|cristo|dios))$/,
  /^(?:por )?donde (?:empiezo|comienzo)$/,
  /^no se (?:por )?donde (?:empezar|comenzar)$/,
  // pt
  /^(?:sou|estou) (?:muito |totalmente )?nov[oa](?: (?:nisso|nisto|em tudo isso|na fe|na igreja|com jesus|na biblia|com deus))?(?: aqui)?$/,
  /^acabei de (?:aceitar (?:jesus|cristo)|me tornar cristao|me tornar crista|me converter|entregar minha vida a (?:jesus|cristo|deus))$/,
  /^por onde (?:comeco|eu comeco|devo comecar)$/,
  /^nao sei por onde comecar$/,
  // id
  /^(?:saya|aku) (?:masih )?baru(?: (?:di sini|dalam iman|mengenal (?:tuhan|yesus)|di gereja|dengan semua ini|percaya|bertobat|dalam hal ini|ikut yesus))?$/,
  /^(?:saya|aku) (?:orang percaya|orang kristen|kristen) baru$/,
  /^(?:saya|aku) baru (?:saja )?(?:percaya|menerima yesus|bertobat)$/,
  /^(?:(?:saya|aku) )?(?:harus )?mulai dari mana$/,
  /^(?:saya|aku) (?:tidak|nggak|gak) tahu (?:harus )?mulai dari mana$/,
];

// ── set_campus ──────────────────────────────────────────────────────────────

const CAMPUS_LEADS: RegExp[] = [
  // en
  /^(?:i'?m|im|i am) (?:at|from|part of|with|in|a member (?:of|at)|connected (?:to|with)) (.+)$/,
  /^i (?:go to|attend|belong to|worship at|go to church at|am part of) (.+)$/,
  /^(?:my|our) (?:campus|church|home church|church campus) is (.+)$/,
  /^(?:set|change|switch|move|make) my (?:campus|church) (?:to )?(.+)$/,
  // es
  /^(?:estoy en|soy de|voy a|asisto a|me congrego en|congrego en|formo parte de) (.+)$/,
  /^mi (?:campus|iglesia|congregacion) es (.+)$/,
  /^(?:cambia|cambiar|pon|poner) mi (?:campus|iglesia) (?:a|en) (.+)$/,
  // pt
  /^(?:estou em|estou no|estou na|sou de|sou do|sou da|vou a|vou ao|vou na|vou no|frequento|frequento a|frequento o|congrego em|congrego na|congrego no|faco parte d[aeo]) (.+)$/,
  /^(?:meu campus|minha igreja) e (.+)$/,
  /^(?:muda|mudar|mude|troca|troque) (?:meu campus|minha igreja) (?:para|pra) (.+)$/,
  // id
  /^(?:saya|aku) (?:di|dari|ikut|beribadah di|bergereja di|jemaat|jemaat di|anggota) (.+)$/,
  /^(?:gereja|kampus) (?:saya|aku)(?: (?:di|adalah|itu))? (.+)$/,
  /^(?:ganti|ubah|pindah) (?:kampus|gereja) (?:saya|aku)? ?(?:ke|jadi) (.+)$/,
];

const CHURCH_WORD = /\b(church|campus|iglesia|igreja|gereja|kampus|congregacion)\b/g;

function campusFromWords(raw: string, lang: string, campuses: CampusRow[]): string | null {
  const said = fold(raw)
    .replace(/^(the|el|la|los|o|a|os|as|di|ke)\s+/, '')
    .replace(CHURCH_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (said.length < 3) return null;
  const list = campuses.filter((c) => c.id !== 'other');
  // 1. Her words are a campus's whole name ("Futuros Kennesaw").
  const whole = list.filter((c) => fold(c.name).replace(CHURCH_WORD, ' ').replace(/\s+/g, ' ').trim() === said);
  if (whole.length === 1) return whole[0].id;
  // 2. Its name without "Futures"/"Futuros" ("Paradise"); a Futures and a
  //    Futuros campus of the same name: her language chooses.
  const bare = said.replace(/^(futures|futuros)\s+/, '');
  const named = list.filter((c) => fold(c.name).replace(/^(futures|futuros)\s+/, '') === bare);
  if (named.length === 1) return named[0].id;
  if (named.length > 1) {
    const futuros = named.filter(isFuturosCampus);
    const futures = named.filter((c) => !isFuturosCampus(c));
    const side = lang === 'es' && futuros.length ? futuros : futures.length ? futures : futuros;
    if (side.length === 1) return side[0].id;
    return null;
  }
  // 3. Her town, matched the way the campus guess matches a town (one campus only).
  const byTown = guessCampus({ city: bare, lang }, campuses);
  return byTown.source === 'town' && byTown.campusId ? byTown.campusId : null;
}

function campusIntent(text: string, lang: string, campuses: CampusRow[]): string | null {
  const x = clean(text);
  for (const re of CAMPUS_LEADS) {
    const m = re.exec(x);
    if (!m) continue;
    const id = campusFromWords(m[1], lang, campuses);
    if (id) return id;
  }
  return null;
}

// ── start_plan ──────────────────────────────────────────────────────────────

const WHOLE_BIBLE = ['through-bible-year', 'new-testament-90'];

const PLAN_TOPICS: { words: RegExp; plans: string[] }[] = [
  { words: /\b(whole|entire|complete|full) bible\b|\bbible in (a|one) year\b|\btoda la biblia\b|\bbiblia (completa|entera)\b|\btoda a biblia\b|\bbiblia (inteira|completa|toda)\b|\bseluruh alkitab\b|\balkitab (dalam )?setahun\b/, plans: WHOLE_BIBLE },
  { words: /\bnew testament\b|\bnuevo testamento\b|\bnovo testamento\b|\bperjanjian baru\b/, plans: ['new-testament-90', 'gospel-john'] },
  { words: /\b(psalms?|proverbs|wisdom|salmos?|proverbios|sabiduria|sabedoria|mazmur|amsal|hikmat)\b/, plans: ['psalms-proverbs'] },
  { words: /\b(gospels?|jesus|john|evangelios?|evangelhos?|juan|joao|injil|yohanes|yesus)\b/, plans: ['gospel-john'] },
  { words: /\b(pray|prayer|praying|oracion|orar|oracao|doa|berdoa)\b/, plans: ['prayer-life'] },
  { words: /\b(anxiety|anxious|worry|worries|worried|stress|stressed|peace|ansiedad|ansioso|ansiosa|preocupacion|paz|ansiedade|preocupacao|cemas|khawatir|kuatir|damai)\b/, plans: ['peace-anxiety', 'be-still-rest'] },
  { words: /\b(fear|fears|afraid|scared|miedo|temor|medo|takut|ketakutan)\b/, plans: ['faith-over-fear', 'book-no-more-fear'] },
  { words: /\b(grief|grieving|loss|heartbreak|broken ?hearted|broken heart|duelo|perdida|corazon roto|luto|perda|coracao partido|duka|kehilangan|patah hati)\b/, plans: ['psalms-brokenhearted'] },
  { words: /\b(forgive|forgiving|forgiveness|perdon|perdonar|perdao|perdoar|pengampunan|mengampuni)\b/, plans: ['forgiveness'] },
  { words: /\b(gratitude|grateful|thankful|thankfulness|gratitud|agradecimiento|gratidao|syukur|bersyukur)\b/, plans: ['gratitude'] },
  { words: /\b(marriage|married|spouse|husband|wife|matrimonio|esposo|esposa|casamento|marido|pernikahan|suami|istri)\b/, plans: ['marriage-love'] },
  { words: /\b(identity|who i am|identidad|identidade|identitas)\b/, plans: ['identity-christ'] },
  { words: /\b(purpose|calling|proposito|llamado|chamado|tujuan|panggilan)\b/, plans: ['purpose-calling'] },
  { words: /\b(trust|trusting|confianza|confiar|confianca|mempercayai)\b/, plans: ['trusting-god'] },
  { words: /\b(fresh start|new start|new beginning|start over|nuevo comienzo|empezar de nuevo|recomeco|novo comeco|awal baru|mulai lagi)\b/, plans: ['fresh-start'] },
  { words: /\b(rest|tired|weary|descanso|cansado|cansada|cansaco|istirahat|lelah)\b/, plans: ['be-still-rest'] },
  { words: /\b(basics|beginner|beginners|new christian|new believer|foundations?|basico|principiante|nuevo creyente|iniciante|novo convertido|dasar|pemula)\b/, plans: ['faith-pathway'] },
];

const WHOLE_BIBLE_ASK: RegExp[] = [
  /^(?:i (?:want|need|would like|'d like|wanna|plan|hope) to |help me |how (?:do|can|should) i |can i |let'?s |i'?m going to |i will |i'?ll |time to )?(?:read|get|go|work) (?:through )?(?:the )?(?:whole|entire|complete|full) bible(?: (?:this year|in a year|in one year|cover to cover))?$/,
  /^(?:i (?:want|would like|'d like) to )?read (?:through )?the bible (?:in (?:a|one) year|cover to cover)$/,
  /^(?:quiero |me gustaria |ayudame a |como puedo |puedo |vamos a )?(?:leer|terminar) (?:toda la biblia|la biblia (?:completa|entera)|la biblia en un ano)$/,
  /^(?:quero |gostaria de |me ajude a |como posso |posso |vamos )?ler (?:a biblia (?:toda|inteira|completa)|toda a biblia|a biblia em um ano)$/,
  /^(?:(?:saya|aku) )?(?:ingin |mau |pengen |bagaimana |bisakah saya )?(?:membaca|baca) (?:seluruh alkitab|alkitab (?:dalam setahun|sampai habis|seluruhnya)|semua alkitab)$/,
];

const PLAN_ASK: RegExp[] = [
  /^(?:(?:can you |could you )?(?:give|find|suggest|recommend|show) me |i (?:want|need|would like|'d like) |start |begin |is there |do you have |any )?(?:a |an |some )?(?:good )?(?:bible )?(?:reading )?plans? (?:for|on|about|to help with|with|when|through|for when) (.+)$/,
  /^(?:(?:give|show|find|suggest) me |start |begin |i want |i need )?(?:a |an )?((?:\S+ ){0,3}\S+) reading plans?$/,
  /^(?:(?:dame|muestrame|recomiendame|quiero|necesito|empezar|comenzar) )?(?:un )?plan(?: de lectura)? (?:para|sobre|de|con) (.+)$/,
  /^(?:(?:me de|me mostre|me recomende|quero|preciso de|comecar|iniciar) )?(?:um )?plano(?: de leitura)? (?:para|sobre|de|com) (.+)$/,
  /^(?:(?:berikan|kasih|tunjukkan|saya mau|aku mau|mulai) )?rencana(?: baca(?:an)?| membaca)? (?:untuk|tentang|soal|buat) (.+)$/,
];

const START_PLAN = /^(?:start|begin|empezar|empieza|comenzar|comienza|iniciar|inicia|comecar|comeca|mulai|mulailah)(?: (?:the|el|la|o|a|plan|plano|rencana|reading plan|plan de lectura|plano de leitura))* (.+)$/;

function knownPlans(ids: string[]): string[] {
  const known = new Set(PLAN_CATALOGUE.map((p) => p.id));
  return ids.filter((id) => known.has(id)).slice(0, 2);
}

function planTitleKey(s: string): string {
  return fold(s).split(/\s+[—–-]\s+|:\s+/)[0].trim();
}

function planIntent(text: string): string[] | null {
  const x = clean(text);
  if (WHOLE_BIBLE_ASK.some((re) => re.test(x))) return knownPlans(WHOLE_BIBLE);
  // "start New Testament in 90 Days": a plan by its title, in any language.
  const start = START_PLAN.exec(x);
  if (start) {
    const want = fold(start[1]);
    const hit = PLAN_CATALOGUE.find((p) => [p.title, p.titleEs, p.titlePt, p.titleId]
      .filter((v): v is string => !!v)
      .some((v) => fold(v) === want || planTitleKey(v) === want));
    if (hit) return [hit.id];
  }
  for (const re of PLAN_ASK) {
    const m = re.exec(x);
    if (!m) continue;
    const topic = PLAN_TOPICS.find((tp) => tp.words.test(m[1]));
    if (topic) {
      const ids = knownPlans(topic.plans);
      if (ids.length) return ids;
    }
  }
  return null;
}

// ── The matcher ─────────────────────────────────────────────────────────────

const NONE: Record<string, never> = {};

/**
 * What the reader asked the app to do, or null for a question for the model.
 * `ctx.campuses` defaults to the reader-side campus list.
 */
export function matchIntent(
  text: string,
  lang: string,
  ctx: { campuses?: CampusRow[] } = {},
): AskIntent | null {
  const raw = String(text || '');
  if (!raw.trim()) return null;

  // 1. Care first, on any length: no model, ever, for these words.
  if (isCare(raw)) return { kind: 'care', args: NONE };
  // 2. A prayer request, at any length: her own words go to the Add-prayer box.
  const prayer = prayerText(raw);
  if (prayer) return { kind: 'add_prayer', args: { text: prayer } };

  // A long message is a question or a story, not a command.
  if (raw.length > 400) return null;

  const x = clean(raw);

  // 3. "read Psalm 23"
  const read = READ_VERB.exec(x);
  if (read) {
    const ref = parseChapterRef(read[1]);
    if (ref) return { kind: 'read_ref', args: ref };
  }

  // 4. "remind me at 6"
  const hour = reminderHour(raw);
  if (hour !== null) return { kind: 'set_reminder', args: { hour } };

  // 5. "switch to NLT" (only a translation offered in her language)
  const code = translationIntent(raw, lang);
  if (code) return { kind: 'set_translation', args: { code } };

  // 6. "where are Sunday's notes"
  if (NOTES.some((re) => re.test(x))) return { kind: 'sunday_notes', args: NONE };

  // 7. "I'm new to all this"
  if (IM_NEW.some((re) => re.test(x))) return { kind: 'im_new', args: NONE };

  // 8. "I'm at Paradise"
  const campusId = campusIntent(raw, lang, ctx.campuses || getCampuses());
  if (campusId) return { kind: 'set_campus', args: { campusId } };

  // 9. "I want to read the whole Bible"
  const planIds = planIntent(raw);
  if (planIds && planIds.length) return { kind: 'start_plan', args: { planIds } };

  return null;
}
