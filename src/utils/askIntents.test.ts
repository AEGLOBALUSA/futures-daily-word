/**
 * DW-P09: Ask does things. Every row of the spec's table in en, es, pt and id,
 * the licence gate on translations, and the questions that must still reach
 * the model.
 */
import { describe, it, expect } from 'vitest';
import { matchIntent, parseChapterRef } from './askIntents';
import { setReaderTranslation, offeredTranslations } from './readerTranslation';
import { FALLBACK_CAMPUSES } from '../data/campuses.fallback';

const campuses = FALLBACK_CAMPUSES;
const m = (text: string, lang = 'en') => matchIntent(text, lang, { campuses });

describe('matchIntent: the table, in four languages', () => {
  it('read Psalm 23 → the reader at Psalm 23', () => {
    const want = { kind: 'read_ref', args: { book: 'Psalms', chapter: 23, ref: 'Psalms 23' } };
    expect(m('read Psalm 23')).toEqual(want);
    expect(m('Lee Salmos 23', 'es')).toEqual(want);
    expect(m('Ler Salmos 23', 'pt')).toEqual(want);
    expect(m('Baca Mazmur 23', 'id')).toEqual(want);
  });

  it('remind me at 6 → 6:00 am', () => {
    const want = { kind: 'set_reminder', args: { hour: 6 } };
    expect(m('remind me at 6')).toEqual(want);
    expect(m('Recuérdame a las 6', 'es')).toEqual(want);
    expect(m('Me lembre às 6', 'pt')).toEqual(want);
    expect(m('Ingatkan saya jam 6', 'id')).toEqual(want);
  });

  it('I want to read the whole Bible → the year plan and the New Testament in 90 days', () => {
    const want = { kind: 'start_plan', args: { planIds: ['through-bible-year', 'new-testament-90'] } };
    expect(m('I want to read the whole Bible')).toEqual(want);
    expect(m('Quiero leer toda la Biblia', 'es')).toEqual(want);
    expect(m('Quero ler a Bíblia toda', 'pt')).toEqual(want);
    expect(m('Saya ingin membaca seluruh Alkitab', 'id')).toEqual(want);
  });

  it("where are Sunday's notes → Sermon Notes", () => {
    const want = { kind: 'sunday_notes', args: {} };
    expect(m("where are Sunday's notes")).toEqual(want);
    expect(m('¿Dónde están las notas del domingo?', 'es')).toEqual(want);
    expect(m('Onde estão as notas do domingo?', 'pt')).toEqual(want);
    expect(m('Di mana catatan khotbah minggu ini?', 'id')).toEqual(want);
  });

  it("please pray for my mum's surgery → her own words, without the lead", () => {
    expect(m("please pray for my mum's surgery")).toEqual({ kind: 'add_prayer', args: { text: "my mum's surgery" } });
    expect(m('Por favor oren por la cirugía de mi mamá', 'es')).toEqual({ kind: 'add_prayer', args: { text: 'la cirugía de mi mamá' } });
    expect(m('Por favor orem pela cirurgia da minha mãe', 'pt')).toEqual({ kind: 'add_prayer', args: { text: 'cirurgia da minha mãe' } });
    expect(m('Tolong doakan operasi ibu saya', 'id')).toEqual({ kind: 'add_prayer', args: { text: 'operasi ibu saya' } });
  });

  it('switch to NLT → a translation offered in her language', () => {
    expect(m('switch to NLT')).toEqual({ kind: 'set_translation', args: { code: 'NLT' } });
    expect(m('Cambia a la NVI', 'es')).toEqual({ kind: 'set_translation', args: { code: 'NVI' } });
    expect(m('Mudar para ARA', 'pt')).toEqual({ kind: 'set_translation', args: { code: 'ARA' } });
    expect(m('Ganti ke TB', 'id')).toEqual({ kind: 'set_translation', args: { code: 'TB' } });
  });

  it("I'm new to all this → Choose your path", () => {
    const want = { kind: 'im_new', args: {} };
    expect(m("I'm new to all this")).toEqual(want);
    expect(m('Soy nuevo en todo esto', 'es')).toEqual(want);
    expect(m('Sou nova em tudo isso', 'pt')).toEqual(want);
    expect(m('Saya baru dengan semua ini', 'id')).toEqual(want);
  });

  it("I'm at Paradise → a known campus, confirmed later", () => {
    expect(m("I'm at Paradise")).toEqual({ kind: 'set_campus', args: { campusId: 'au-paradise' } });
    expect(m('Voy a Kennesaw', 'es')).toEqual({ kind: 'set_campus', args: { campusId: 'us-futuros-kennesaw' } });
    expect(m('Sou do Rio', 'pt')).toEqual({ kind: 'set_campus', args: { campusId: 'br-rio' } });
    expect(m('Saya di Bali', 'id')).toEqual({ kind: 'set_campus', args: { campusId: 'id-bali' } });
  });

  it('I need to talk to someone → the care door', () => {
    const want = { kind: 'care', args: {} };
    expect(m('I need to talk to someone')).toEqual(want);
    expect(m('Necesito hablar con alguien', 'es')).toEqual(want);
    expect(m('Preciso falar com alguém', 'pt')).toEqual(want);
    expect(m('Saya perlu bicara dengan seseorang', 'id')).toEqual(want);
  });

  it('what does grace mean → the model, as today', () => {
    expect(m('what does grace mean')).toBeNull();
    expect(m('¿Qué significa la gracia?', 'es')).toBeNull();
    expect(m('O que significa graça?', 'pt')).toBeNull();
    expect(m('Apa arti kasih karunia?', 'id')).toBeNull();
  });
});

describe('the translation licence gate', () => {
  it('a request in another language can never pick a translation not offered there (NIV)', () => {
    expect(offeredTranslations('es')).not.toContain('NIV');
    expect(m('Cambia a NIV', 'es')).toBeNull();
    expect(m('Mudar para NIV', 'pt')).toBeNull();
    expect(m('Ganti ke NIV', 'id')).toBeNull();
    expect(m('switch to NVI', 'en')).toBeNull();
  });

  it('a translation Daily Word does not offer at all is never chosen', () => {
    expect(m('switch to the MSG')).toBeNull();
    expect(m('use the Passion Translation')).toBeNull();
    expect(m('switch to CSB')).toBeNull();
  });

  it('the setter refuses it too, and changes nothing', () => {
    localStorage.setItem('dw_translation', 'RV1960');
    expect(setReaderTranslation('NIV', 'es')).toBe(false);
    expect(localStorage.getItem('dw_translation')).toBe('RV1960');
    expect(localStorage.getItem('dw_translation_manual')).toBeNull();
    expect(setReaderTranslation('NVI', 'es')).toBe(true);
    expect(localStorage.getItem('dw_translation')).toBe('NVI');
  });
});

describe('care is tried first, with a wide net', () => {
  it('beats a prayer request and a campus', () => {
    expect(m("please pray for me, I'm not okay")?.kind).toBe('care');
    expect(m('pray for my friend, she wants to die')?.kind).toBe('care');
    expect(m('I want to talk to a pastor')?.kind).toBe('care');
    expect(m("I'm not okay")?.kind).toBe('care');
    expect(m('help')?.kind).toBe('care');
  });

  it('a long message still reaches the care door', () => {
    expect(m(`${'I have been reading every day and '.repeat(20)}I want to die`)?.kind).toBe('care');
  });

  it('a quoted verse is not her own words', () => {
    expect(m('Tell me more about: "I need to talk to someone"')).toBeNull();
  });

  it('a study question asking for help still reaches the model', () => {
    expect(m('I need help understanding Romans 8')).toBeNull();
  });
});

describe('only whole requests; questions go to the model', () => {
  it.each([
    'what does Psalm 23 mean',
    'Show me Philippians 4:6-7 and explain what it means and how to apply it.',
    'how do I pray for my enemies',
    'what is a good reading plan',
    "explain god's plan for my life",
    'remind me at 6:30',
    'remind me at 3am',
    "I'm at a loss",
    "I'm in Romans 8",
    'read Psalm 151',
    'switch to grace',
    'what do the sermon notes say about grace',
    '',
    '   ',
  ])('%j → null', (text) => {
    expect(m(text)).toBeNull();
  });
});

describe('the details', () => {
  it('reads book names, ordinals and verses', () => {
    expect(parseChapterRef('1 John 4')).toMatchObject({ book: '1 John', chapter: 4 });
    expect(parseChapterRef('First John 4')).toMatchObject({ book: '1 John', chapter: 4 });
    expect(parseChapterRef('Juan 3:16')).toMatchObject({ book: 'John', chapter: 3 });
    expect(parseChapterRef('Song of Songs 2')).toMatchObject({ book: 'Song of Solomon', chapter: 2 });
    expect(parseChapterRef('Kisah Para Rasul 2')).toMatchObject({ book: 'Acts', chapter: 2 });
    expect(parseChapterRef('Hezekiah 3')).toBeNull();
    expect(m('show me John 3:16')).toMatchObject({ kind: 'read_ref', args: { ref: 'John 3' } });
    expect(m('read me Romans 8 please')).toMatchObject({ kind: 'read_ref', args: { ref: 'Romans 8' } });
  });

  it('works out the hour', () => {
    expect(m('remind me at 7pm')).toEqual({ kind: 'set_reminder', args: { hour: 19 } });
    expect(m('remind me every day at 8')).toEqual({ kind: 'set_reminder', args: { hour: 8 } });
    expect(m('set a reminder for 18:00')).toEqual({ kind: 'set_reminder', args: { hour: 18 } });
    expect(m('remind me at 3')).toEqual({ kind: 'set_reminder', args: { hour: 15 } });
    expect(m('Recuérdame a las 7 de la noche', 'es')).toEqual({ kind: 'set_reminder', args: { hour: 19 } });
    expect(m('Ingatkan saya jam 6 pagi setiap hari', 'id')).toEqual({ kind: 'set_reminder', args: { hour: 6 } });
    expect(m('remind me at 6 to pray')).toBeNull();
  });

  it('keeps her whole sentence when the lead is all there is', () => {
    expect(m('pray for me')).toEqual({ kind: 'add_prayer', args: { text: 'pray for me' } });
    expect(m('Pray that God heals my dad')).toEqual({ kind: 'add_prayer', args: { text: 'Pray that God heals my dad' } });
    expect(m('Can you pray for my job interview?')).toEqual({ kind: 'add_prayer', args: { text: 'my job interview' } });
  });

  it('a same-named Futures and Futuros campus: her language chooses', () => {
    expect(m("I'm at Kennesaw", 'en')).toEqual({ kind: 'set_campus', args: { campusId: 'us-kennesaw' } });
    expect(m('I go to Futuros Kennesaw', 'en')).toEqual({ kind: 'set_campus', args: { campusId: 'us-futuros-kennesaw' } });
    expect(m("I'm from Adelaide")).toBeNull(); // several campuses name Adelaide
  });

  it('plans by topic and by title', () => {
    expect(m('a reading plan for anxiety')).toEqual({ kind: 'start_plan', args: { planIds: ['peace-anxiety', 'be-still-rest'] } });
    expect(m('start New Testament in 90 Days')).toEqual({ kind: 'start_plan', args: { planIds: ['new-testament-90'] } });
    expect(m('un plan de lectura para el perdón', 'es')).toEqual({ kind: 'start_plan', args: { planIds: ['forgiveness'] } });
  });
});
