/**
 * Day 1 landing copy — taken from the existing 40-day series
 * (books/faith-pathway.json day 1) plus bundled KJV Ephesians 2:8–9.
 * Superdesign locked the LAYOUT; placeholder Luke 15 / "Welcome Home" is not used.
 */

export const DAY1_SERIES_TITLE = {
  en: 'New & Returning to Faith',
  es: 'Nuevos y De Regreso a la Fe',
  pt: 'Novos e De Volta \u00e0 F\u00e9',
  id: 'Baru & Kembali ke Iman',
} as const;

export const DAY1_TITLE = {
  en: 'Grace Changes Everything',
  es: 'La Gracia Lo Cambia Todo',
  pt: 'A Gra\u00e7a Muda Tudo',
  id: 'Rahmat Mengubah Segalanya',
} as const;

/** First two sentences of Day 1's real lesson — the Superdesign slot is short. */
export const DAY1_PASTORAL = {
  en: 'Here\u2019s the thing nobody explains well enough: grace isn\u2019t how you GET saved\u2014it\u2019s how you LIVE saved. There\u2019s a massive difference, and it changes everything about your relationship with God going forward.',
  es: 'Aqu\u00ed est\u00e1 lo que nadie explica bien: la gracia no es c\u00f3mo te SALVAS\u2014es c\u00f3mo VIVES salvado. Hay una diferencia enorme, y cambia todo en tu relaci\u00f3n con Dios de aqu\u00ed en adelante.',
  pt: 'Aqui est\u00e1 a coisa que ningu\u00e9m explica bem: gra\u00e7a n\u00e3o \u00e9 como voc\u00ea FICA salvo\u2014\u00e9 como voc\u00ea VIVE salvo. H\u00e1 uma diferen\u00e7a massiva, e muda tudo sobre seu relacionamento com Deus a partir de agora.',
  id: 'Inilah yang tidak dijelas oleh siapapun dengan baik: rahmat bukan cara Anda DISELAMATKAN\u2014rahmat adalah cara Anda HIDUP setelah diselamatkan. Ada perbedaan besar, dan itu mengubah segalanya tentang hubungan Anda dengan Tuhan ke depannya.',
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
    verseRef: DAY1_VERSE_REF,
    verseText: DAY1_VERSE_TEXT,
  };
}
