/**
 * Day 1 landing copy — taken from the existing 40-day series
 * (books/faith-pathway.json day 1) plus bundled KJV Ephesians 2:8–9.
 * Superdesign locked the LAYOUT; placeholder Luke 15 / "Welcome Home" is not used.
 */

export const DAY1_SERIES_TITLE = {
  en: 'New to Faith',
  es: 'Nuevo en la Fe',
  pt: 'Novo na F\u00e9',
  id: 'Baru dalam Iman',
} as const;

export const DAY1_TITLE = {
  en: 'Grace Changes Everything',
  es: 'La Gracia Lo Cambia Todo',
  pt: 'A Gra\u00e7a Muda Tudo',
  id: 'Rahmat Mengubah Segalanya',
} as const;

/** First two sentences of Day 1's real lesson — the Superdesign landing slot is short. */
export const DAY1_PASTORAL = {
  en: 'Here\u2019s the thing nobody explains well enough: grace isn\u2019t how you GET saved\u2014it\u2019s how you LIVE saved. There\u2019s a massive difference, and it changes everything about your relationship with God going forward.',
  es: 'Aqu\u00ed est\u00e1 lo que nadie explica bien: la gracia no es c\u00f3mo te SALVAS\u2014es c\u00f3mo VIVES salvado. Hay una diferencia enorme, y cambia todo en tu relaci\u00f3n con Dios de aqu\u00ed en adelante.',
  pt: 'Aqui est\u00e1 a coisa que ningu\u00e9m explica bem: gra\u00e7a n\u00e3o \u00e9 como voc\u00ea FICA salvo\u2014\u00e9 como voc\u00ea VIVE salvo. H\u00e1 uma diferen\u00e7a massiva, e muda tudo sobre seu relacionamento com Deus a partir de agora.',
  id: 'Inilah yang tidak dijelas oleh siapapun dengan baik: rahmat bukan cara Anda DISELAMATKAN\u2014rahmat adalah cara Anda HIDUP setelah diselamatkan. Ada perbedaan besar, dan itu mengubah segalanya tentang hubungan Anda dengan Tuhan ke depannya.',
} as const;

/** Three short blocks from the real Day 1 lesson — Superdesign reading has three pastoral beats. */
export const DAY1_READING_PASTORAL = {
  en: 'Here\u2019s the thing nobody explains well enough: grace isn\u2019t how you GET saved\u2014it\u2019s how you LIVE saved.\n\nThere\u2019s a massive difference, and it changes everything about your relationship with God going forward.\n\nYou don\u2019t earn your way into God\u2019s family by performing well enough. You get there by receiving what\u2019s already been given. That\u2019s grace. It\u2019s a gift you don\u2019t deserve and can\u2019t pay back.',
  es: 'Aqu\u00ed est\u00e1 lo que nadie explica bien: la gracia no es c\u00f3mo te SALVAS\u2014es c\u00f3mo VIVES salvado.\n\nHay una diferencia enorme, y cambia todo en tu relaci\u00f3n con Dios de aqu\u00ed en adelante.\n\nNo te ganas tu entrada a la familia de Dios actuando lo suficientemente bien. Llegas all\u00ed recibiendo lo que ya ha sido dado. Eso es gracia. Es un regalo que no mereces y no puedes pagar.',
  pt: 'Aqui est\u00e1 a coisa que ningu\u00e9m explica bem: gra\u00e7a n\u00e3o \u00e9 como voc\u00ea FICA salvo\u2014\u00e9 como voc\u00ea VIVE salvo.\n\nH\u00e1 uma diferen\u00e7a massiva, e muda tudo sobre seu relacionamento com Deus a partir de agora.\n\nVoc\u00ea n\u00e3o ganha sua entrada \u00e0 fam\u00edlia de Deus se apresentando bem o suficiente. Voc\u00ea chega l\u00e1 recebendo o que j\u00e1 foi dado. Isso \u00e9 gra\u00e7a. \u00c9 um presente que voc\u00ea n\u00e3o merece e n\u00e3o pode pagar.',
  id: 'Inilah yang tidak dijelas oleh siapapun dengan baik: rahmat bukan cara Anda DISELAMATKAN\u2014rahmat adalah cara Anda HIDUP setelah diselamatkan.\n\nAda perbedaan besar, dan itu mengubah segalanya tentang hubungan Anda dengan Tuhan ke depannya.\n\nAnda tidak mendapatkan tempat di keluarga Tuhan dengan berkinerja cukup baik. Anda sampai di sana dengan menerima apa yang sudah diberikan. Itulah rahmat. Ini adalah hadiah yang tidak Anda layak terima dan tidak bisa Anda bayar.',
} as const;

export const DAY1_VERSE_REF = 'Ephesians 2:8-9';

/** Bundled KJV Ephesians 2:8–9 (bible/kjv/ephesians/2.json), braces stripped. */
export const DAY1_VERSE_TEXT =
  'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.';

export function day1Copy(lang: string) {
  const l = (lang in DAY1_TITLE ? lang : 'en') as keyof typeof DAY1_TITLE;
  return {
    series: DAY1_SERIES_TITLE[l],
    title: DAY1_TITLE[l],
    pastoral: DAY1_PASTORAL[l],
    readingPastoral: DAY1_READING_PASTORAL[l],
    verseRef: DAY1_VERSE_REF,
    verseText: DAY1_VERSE_TEXT,
  };
}
