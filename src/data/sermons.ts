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
    series: 'What Power Are You Carrying Into the Room?',
    keyVerse: 'Ephesians 3:20',
    keyVerseText: '\u201CNow to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen.\u201D \u2014 Ephesians 3:20\u201321 NKJV',
    sections: [
      {
        heading: 'It\u2019s Working',
        body: 'Paul \u2014 AD 61 \u2014 Rome \u2014 house arrest \u2014 chained to a Roman guard.\n\nVisitors: Timothy, Luke, Epaphras, Tychicus, Epaphroditus, Aristarchus, Mark, Onesimus.\n\nThe gospel was unchained even when the messenger was not.',
      },
      {
        heading: 'Jesus Broke It Down',
        body: '',
        scripture: 'For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. His purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility.\n\n\u2014 Ephesians 2:14\u201316',
        scriptureRef: 'Ephesians 2:14\u201316',
      },
      {
        heading: '',
        body: '',
        scripture: 'His intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms.\n\n\u2014 Ephesians 3:10',
        scriptureRef: 'Ephesians 3:10',
      },
      {
        heading: 'The Right Power',
        body: '',
        scripture: 'I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge.\n\n\u2014 Ephesians 3:16\u201319',
        scriptureRef: 'Ephesians 3:16\u201319',
      },
      {
        heading: 'The Eruption',
        body: '',
        scripture: '\u201CNow to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen.\u201D\n\n\u2014 Ephesians 3:20\u201321',
        scriptureRef: 'Ephesians 3:20\u201321',
      },
      {
        heading: '',
        body: 'The power of verse 20 is the power of chapter 2. They are the same power.\n\nWrong power \u2192 Wrong outcome\nRight power \u2192 Exceedingly. Abundantly. Above.',
      },
      {
        heading: 'Don\u2019t Let It Stop You',
        body: 'Don\u2019t let the anger stop you. Lay it down. Pick up love.\n\nDon\u2019t let the resentment stop you. Lay it down. Pick up grace.\n\nDon\u2019t let the need to be right stop you. Lay it down. Pick up wholeness.\n\nDon\u2019t let the pain stop you. Lay it down. Pick up the power that put hostility to death.\n\nDon\u2019t let the fear stop you. Lay it down. Pick up the God who opens doors nothing can shut.',
      },
      {
        heading: '',
        body: 'Lift your eyes. The possibilities are far beyond what you can see in the natural.\n\nIt\u2019s working. It\u2019s still working. And it will work in your life.\n\nSomehow. Some way. Grace will make a way.\n\nNow to Him who is able.',
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

It's Working.
Paul — AD 61 — Rome — house arrest — chained to a Roman guard.
Visitors: Timothy, Luke, Epaphras, Tychicus, Epaphroditus, Aristarchus, Mark, Onesimus.
The gospel was unchained even when the messenger was not.

Jesus Broke It Down.
For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. His purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility. — Ephesians 2:14–16.

His intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. — Ephesians 3:10.

The Right Power.
I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge. — Ephesians 3:16–19.

The Eruption.
"Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen." — Ephesians 3:20–21.

The power of verse 20 is the power of chapter 2. They are the same power.
Wrong power leads to wrong outcome. Right power leads to exceedingly, abundantly, above.

Don't Let It Stop You.
Don't let the anger stop you. Lay it down. Pick up love.
Don't let the resentment stop you. Lay it down. Pick up grace.
Don't let the need to be right stop you. Lay it down. Pick up wholeness.
Don't let the pain stop you. Lay it down. Pick up the power that put hostility to death.
Don't let the fear stop you. Lay it down. Pick up the God who opens doors nothing can shut.

Lift your eyes. The possibilities are far beyond what you can see in the natural.
It's working. It's still working. And it will work in your life.
Somehow. Some way. Grace will make a way.
Now to Him who is able.`,
    preloaded: true,
  },
];
