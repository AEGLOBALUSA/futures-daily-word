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

export const PRELOADED_SERMONS: SermonData[] = [
  {
    id: 'sermon-power-in-the-room-2026-03',
    title: 'What Power Are You Carrying Into the Room?',
    speaker: 'Pastor Ashley Evans',
    campus: 'us-alpharetta',
    date: '2026-03-15',
    series: 'Ephesians',
    keyVerse: 'Ephesians 3:20',
    keyVerseText: '\u201CNow to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen.\u201D \u2014 Ephesians 3:20\u201321 NKJV',
    sections: [
      {
        heading: 'The Revelation',
        body: '',
        scripture: 'For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. \u2014 Ephesians 2:14\n\nHis purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility. \u2014 Ephesians 2:15\u201316',
        scriptureRef: 'Ephesians 2:14\u201316',
      },
      {
        heading: '',
        body: '',
        scripture: 'His intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. \u2014 Ephesians 3:10',
        scriptureRef: 'Ephesians 3:10',
      },
      {
        heading: '',
        body: '',
        scripture: 'I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge. \u2014 Ephesians 3:16\u201319',
        scriptureRef: 'Ephesians 3:16\u201319',
      },
      {
        heading: 'What Power Are You Carrying?',
        body: '',
        points: [
          'Anger',
          'Resentment',
          'Being Right',
          'Pain',
          'Fear',
        ],
      },
      {
        heading: '',
        body: 'Wrong power \u2192 Wrong outcome.\nRight power \u2192 Exceedingly. Abundantly. Above.',
      },
      {
        heading: 'According to the Power That Works in Us',
        body: '',
        scripture: '\u201CNow to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us.\u201D \u2014 Ephesians 3:20',
        scriptureRef: 'Ephesians 3:20',
      },
      {
        heading: '',
        body: 'The power of verse 20 is the power of chapter 2. They are the same power.',
      },
      {
        heading: 'Exchange Your Power',
        body: 'Lay down the anger. Pick up the love.\nLay down the resentment. Pick up the grace.\nLay down the need to be right. Pick up the need to be whole.\nLay down the pain. Pick up the power that put hostility to death.\nLay down the fear. Pick up the God who opens doors nothing can shut.',
      },
      {
        heading: '',
        body: 'Somehow. Some way. Grace will make a way.\n\nNow to Him who is able.',
      },
      {
        heading: 'My next step this week:',
        body: '',
      },
    ],
    plainText: `What Power Are You Carrying Into the Room?
Futures Church. Pastor Ashley Evans.
EPHESIANS 3:20

"Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen." — Ephesians 3:20–21 NKJV

The Revelation.
For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. — Ephesians 2:14.
His purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility. — Ephesians 2:15–16.

His intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. — Ephesians 3:10.

I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge. — Ephesians 3:16–19.

What Power Are You Carrying?
Anger. Resentment. Being Right. Pain. Fear.
Wrong power leads to wrong outcome. Right power leads to exceedingly, abundantly, above.

According to the Power That Works in Us.
"Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us." — Ephesians 3:20.
The power of verse 20 is the power of chapter 2. They are the same power.

Exchange Your Power.
Lay down the anger. Pick up the love.
Lay down the resentment. Pick up the grace.
Lay down the need to be right. Pick up the need to be whole.
Lay down the pain. Pick up the power that put hostility to death.
Lay down the fear. Pick up the God who opens doors nothing can shut.

Somehow. Some way. Grace will make a way.
Now to Him who is able.`,
    preloaded: true,
  },
];
