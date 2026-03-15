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
    date: '2026-03-14',
    series: 'Ephesians',
    keyVerse: 'Ephesians 3:20-21',
    keyVerseText: 'Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen. — Ephesians 3:20–21 NKJV',
    sections: [
      {
        heading: 'Tools Are Not Enough',
        body: 'Last week: the map, the elephants, the personas, the knock.\nThis week: the power behind the tools.',
      },
      {
        heading: 'What Power Are You Carrying?',
        body: 'Every time you walk into a difficult conversation, you are fuelled by something. The question is what.',
        points: [
          'Anger — Anger can start a war. It has never ended one.',
          'Resentment — Resentment can keep score. It cannot start over.',
          'Being Right — You can win the argument and lose the person.',
          'Pain — Pain has the power to protect you. It does not have the power to heal you.',
        ],
      },
      {
        heading: 'Wrong Power, Wrong Outcome',
        body: 'Wrong power. Wrong outcome. Every time.',
      },
      {
        heading: 'The God Who Ends the War',
        body: 'Peace is not a policy. It\'s a person. And that person lives in you.\n\nHe put hostility to death.\n\nThree togethers. Heirs together. Members together. Sharers together.\n\nThe church is not a building. It\'s a demonstration.',
        scripture: 'For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. — Ephesians 2:14 NIV\n\nHis purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility. — Ephesians 2:15–16 NIV\n\nThrough the gospel the Gentiles are heirs together with Israel, members together of one body, and sharers together in the promise in Christ Jesus. — Ephesians 3:6 NIV\n\nHis intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. — Ephesians 3:10 NIV',
        scriptureRef: 'Ephesians 2:14–16, 3:6, 3:10 NIV',
      },
      {
        heading: 'The Right Power',
        body: 'Strengthened with power in your inner being.\n\nNot the power of your argument. The power of His Spirit.\n\nWide enough to include the person you want to exclude. Long enough to outlast the silence. High enough to rise above the offense. Deep enough to reach the wound underneath the anger.\n\nLove that surpasses knowledge.',
        scripture: 'I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power, together with all the Lord\'s holy people, to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge. — Ephesians 3:16–19 NIV',
        scriptureRef: 'Ephesians 3:16–19 NIV',
      },
      {
        heading: 'According to the Power That Works in Us',
        body: '"Now to Him" — Not to you. Not to your skill. To Him.\n\n"Who is able" — Present tense. Active. Right now.\n\n"To do exceedingly abundantly above" — Greek: hyperekperissou. Beyond. Out of. Abundantly. Three words fused into one.\n\n"Above all that we ask or think" — You cannot out-dream God.\n\n"According to the power that works in us" — The outcome is connected to what you\'re carrying.\n\nWrong power? Wrong outcome. Right power? Exceedingly. Abundantly. Above.\n\n"To Him be glory in the church" — Every wall that comes down in your house is a sermon the universe can see.',
        scripture: '"Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen." — Ephesians 3:20–21 NKJV',
        scriptureRef: 'Ephesians 3:20–21 NKJV',
      },
      {
        heading: 'Exchange Your Power',
        body: 'Before you knock on the door — swap your power for His.\n\nLay down the anger. Pick up the love.\nLay down the resentment. Pick up the grace.\nLay down the need to be right. Pick up the need to be whole.\nLay down the pain. Pick up the power that put hostility to death.',
      },
      {
        heading: '',
        body: 'Now to Him who is able.',
      },
    ],
    plainText: `What Power Are You Carrying Into the Room?
Futures Church | Alpharetta | March 2026 | Pastor Ashley Evans

EPHESIANS 3:20
Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen. — Ephesians 3:20–21 NKJV

Tools Are Not Enough
Last week: the map, the elephants, the personas, the knock. This week: the power behind the tools.

What Power Are You Carrying?
Every time you walk into a difficult conversation, you are fuelled by something. The question is what.

1. Anger — Anger can start a war. It has never ended one.
2. Resentment — Resentment can keep score. It cannot start over.
3. Being Right — You can win the argument and lose the person.
4. Pain — Pain has the power to protect you. It does not have the power to heal you.

Wrong power. Wrong outcome. Every time.

The God Who Ends the War
For He Himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility. — Ephesians 2:14 NIV

Peace is not a policy. It's a person. And that person lives in you.

His purpose was to create in Himself one new humanity out of the two, thus making peace, and in one body to reconcile both of them to God through the cross, by which He put to death their hostility. — Ephesians 2:15–16 NIV

He put hostility to death.

Through the gospel the Gentiles are heirs together with Israel, members together of one body, and sharers together in the promise in Christ Jesus. — Ephesians 3:6 NIV

Three togethers. Heirs together. Members together. Sharers together.

His intent was that now, through the church, the manifold wisdom of God should be made known to the rulers and authorities in the heavenly realms. — Ephesians 3:10 NIV

The church is not a building. It's a demonstration.

The Right Power
I pray that out of His glorious riches He may strengthen you with power through His Spirit in your inner being, so that Christ may dwell in your hearts through faith. And I pray that you, being rooted and established in love, may have power, together with all the Lord's holy people, to grasp how wide and long and high and deep is the love of Christ, and to know this love that surpasses knowledge. — Ephesians 3:16–19 NIV

Strengthened with power in your inner being. Not the power of your argument. The power of His Spirit.

Wide enough to include the person you want to exclude. Long enough to outlast the silence. High enough to rise above the offense. Deep enough to reach the wound underneath the anger.

Love that surpasses knowledge.

According to the Power That Works in Us
"Now to Him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to Him be glory in the church by Christ Jesus to all generations, forever and ever. Amen." — Ephesians 3:20–21 NKJV

"Now to Him" — Not to you. Not to your skill. To Him.
"Who is able" — Present tense. Active. Right now.
"To do exceedingly abundantly above" — Greek: hyperekperissou. Beyond. Out of. Abundantly. Three words fused into one.
"Above all that we ask or think" — You cannot out-dream God.
"According to the power that works in us" — The outcome is connected to what you're carrying.

Wrong power? Wrong outcome. Right power? Exceedingly. Abundantly. Above.

"To Him be glory in the church" — Every wall that comes down in your house is a sermon the universe can see.

Exchange Your Power
Before you knock on the door — swap your power for His.
Lay down the anger. Pick up the love.
Lay down the resentment. Pick up the grace.
Lay down the need to be right. Pick up the need to be whole.
Lay down the pain. Pick up the power that put hostility to death.

Now to Him who is able.`,
    preloaded: true,
  },
];
