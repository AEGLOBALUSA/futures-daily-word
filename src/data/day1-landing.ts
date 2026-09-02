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

// BEGIN DAY1_QUESTIONS (generated from books/faith-pathway.json day 1 — keep in sync; day1-landing.test.ts pins it)
/** Day 1's Reflect & Respond questions — part of the lesson, so the landing shows them too. */
export const DAY1_QUESTIONS = {
  en: ['Think about a time you felt like you had to earn someone\'s approval. How did that feel compared to being accepted unconditionally \u2014 and what does it feel like to know God accepts you the same way right now?', 'Is there something in your life you\'ve been trying to \'fix\' before feeling worthy of God\'s love? What would it look like to bring that to Him as-is today?'],
  es: ['Piensa en un momento en que sentiste que ten\u00edas que ganarte la aprobaci\u00f3n de alguien. \u00bfC\u00f3mo se sinti\u00f3 eso comparado con ser aceptado sin condiciones \u2014 y qu\u00e9 se siente saber que Dios te acepta de la misma manera ahora mismo?', '\u00bfHay algo en tu vida que has estado tratando de \'arreglar\' antes de sentirte digno del amor de Dios? \u00bfC\u00f3mo ser\u00eda llevarle eso tal como est\u00e1, hoy?'],
  pt: ['Pense em um momento em que voc\u00ea sentiu que precisava merecer a aprova\u00e7\u00e3o de algu\u00e9m. Como isso se comparava a ser aceito incondicionalmente \u2014 e como \u00e9 saber que Deus te aceita da mesma forma agora?', 'H\u00e1 algo na sua vida que voc\u00ea tem tentado \'consertar\' antes de se sentir digno do amor de Deus? Como seria trazer isso a Ele exatamente como est\u00e1, hoje?'],
  id: ['Pikirkan tentang suatu waktu ketika Anda merasa harus mendapatkan persetujuan seseorang. Bagaimana rasanya dibandingkan dengan diterima tanpa syarat \u2014 dan bagaimana rasanya mengetahui bahwa Tuhan menerima Anda dengan cara yang sama sekarang juga?', 'Apakah ada sesuatu dalam hidup Anda yang selama ini Anda coba \'perbaiki\' sebelum merasa layak menerima kasih Tuhan? Seperti apa jadinya jika Anda membawanya kepada-Nya apa adanya hari ini?'],
} as const;
// END DAY1_QUESTIONS

export function day1Copy(lang: string) {
  const l = (lang in DAY1_TITLE ? lang : 'en') as keyof typeof DAY1_TITLE;
  return {
    series: DAY1_SERIES_TITLE[l],
    title: DAY1_TITLE[l],
    pastoral: DAY1_PASTORAL[l],
    readingPastoral: DAY1_READING_PASTORAL[l],
    verseRef: DAY1_VERSE_REF,
    verseText: DAY1_VERSE_TEXT,
    questions: (DAY1_QUESTIONS as Record<string, readonly string[]>)[l] ?? DAY1_QUESTIONS.en,
  };
}
