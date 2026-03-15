export interface PlanDef {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  category: string;
  passages: string[];
  /** Optional per-day devotional content (index matches passages[]) */
  devotionals?: Array<{ title: string; author: string; body: string }>;
  /** If set, this is a book reading plan — activating it also starts the book plan */
  bookId?: string;
  bookJsonFile?: string;
}

function genPassages(books: [string, number][], days: number): string[] {
  const all: string[] = [];
  for (const [book, count] of books) {
    for (let c = 1; c <= count; c++) all.push(book + ' ' + c);
  }
  const result: string[] = [];
  let idx = 0;
  for (let day = 0; day < days; day++) {
    const rem = all.length - idx;
    const remDays = days - day;
    const n = Math.ceil(rem / remDays);
    result.push(all.slice(idx, idx + n).join(', '));
    idx += n;
  }
  return result;
}

const OT: [string, number][] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36],
  ['Deuteronomy', 34], ['Joshua', 24], ['Judges', 21], ['Ruth', 4],
  ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25],
  ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10], ['Nehemiah', 13],
  ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52],
  ['Lamentations', 5], ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14],
  ['Joel', 3], ['Amos', 9], ['Obadiah', 1], ['Jonah', 4], ['Micah', 7],
  ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4],
];

const NT: [string, number][] = [
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5],
  ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3],
  ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3],
  ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1], ['Revelation', 22],
];

import { ALL_ASHLEY_JANE_DEVOTIONALS, ALL_ASHLEY_JANE_PASSAGES } from './ashley-jane-plan';

export const PLAN_CATALOGUE: PlanDef[] = [

  // ── Featured ──────────────────────────────────────────────────────────────
  {
    id: 'ashley-jane-daily-word',
    title: 'Daily Word with Ashley & Jane',
    description: 'A 100-day journey through fear, faith, grace, community, and purpose — drawn from Ashley & Jane\'s books No More Fear, The Church, and From Scarcity to Supernatural.',
    totalDays: 100,
    category: 'Featured',
    passages: ALL_ASHLEY_JANE_PASSAGES,
    devotionals: ALL_ASHLEY_JANE_DEVOTIONALS,
  },

  // ── Books by Ps A ─────────────────────────────────────────────────────────
  {
    id: 'book-no-more-fear',
    title: 'No More Fear — 40 Days',
    description: 'A 40-day devotional to defeat fear, walk in God\'s authority, and live the bold life you were created for. By Ps A.',
    totalDays: 40,
    category: 'Books',
    bookId: 'no-more-fear',
    bookJsonFile: '/books/no_more_fear.json',
    passages: [
      'Day 1: Fear is normal',
      'Day 2: Fear invades, paralyzes, and holds you captive',
      'Day 3: Fear distracts you from God\'s plan',
      'Day 4: Fear is the source of your discontent and complaining',
      'Day 5: Fear keeps you from connecting the dots',
      'Day 6: Fear focuses your attention on others',
      'Day 7: Fear inhibits your ability to do new things',
      'Day 8: Fear values perfection over progress',
      'Day 9: Fear confuses protecting values with preserving what is familiar',
      'Day 10: Fear causes you to settle for less than what God wants for you',
      'Day 11: Authority is the catalyst for victory over fear and intimidation',
      'Day 12: Authority is the primary battleground of your life',
      'Day 13: Authority is what the Enemy fears most about you',
      'Day 14: Authority has been given to you through Christ',
      'Day 15: Authority sets you apart to accomplish great things',
      'Day 16: Authority grants you access to places others can\'t go',
      'Day 17: Authority is greater than any force that may oppose you',
      'Day 18: Authority gives you clarity, discernment, and confidence',
      'Day 19: Authority allows you to exercise influence',
      'Day 20: Authority gives you the ability to possess what is rightfully yours',
      'Day 21: God has a blueprint for your life',
      'Day 22: God created you to multiply, not maintain',
      'Day 23: God is not limited by your circumstances',
      'Day 24: God is a god of second chances',
      'Day 25: God\'s presence brings an awareness of your deepest fears',
      'Day 26: God wants more for you than what you have and are today',
      'Day 27: God has given every believer a place of influence',
      'Day 28: God designed you to be a force of change in the world',
      'Day 29: God desires to use you to enlarge the Kingdom',
      'Day 30: God will always be faithful and will always follow through',
      'Day 31: Believe you were created to accomplish something of significance',
      'Day 32: Decide to face what you fear the most with confidence',
      'Day 33: Commit to achieving goals that force you to reach for the impossible',
      'Day 34: Build a fortress around your mind to protect your thinking',
      'Day 35: Meditate on Scripture',
      'Day 36: Develop a self-talk routine',
      'Day 37: Engage in a healthy alternative that demands your attention',
      'Day 38: Don\'t listen to negative people',
      'Day 39: Put yourself where fear and intimidation will reveal itself',
      'Day 40: Persist until you experience breakthrough',
    ],
  },
  {
    id: 'book-scarcity',
    title: 'From Scarcity to Abundance — 23 Days',
    description: 'Twenty-three chapters on the grace revolution, God\'s overflow, and the life you were designed to live. By Ps A.',
    totalDays: 23,
    category: 'Books',
    bookId: 'from-scarcity',
    bookJsonFile: '/books/scarcity.json',
    passages: [
      'Chapter 1: The Grace and Favor Revolution',
      'Chapter 2: The Original Design: Created for Supply, Not Stress',
      'Chapter 3: Breaking Free From the Curse of Toil',
      'Chapter 4: Righteousness: The Identity That Changes Everything',
      'Chapter 5: The Power of the Cross',
      'Chapter 6: No More Consciousness of Sin',
      'Chapter 7: Grace Initiates, Faith Responds',
      'Chapter 8: The Supply Chain of Grace',
      'Chapter 9: From Fear to Faith',
      'Chapter 10: The Overflow Life',
      'Chapter 11: The Grace and Work Paradox',
      'Chapter 12: Grace vs. Law',
      'Chapter 13: The Reign of Rest',
      'Chapter 14: The Battle Is the Lord\'s',
      'Chapter 15: Worship with the Words of David',
      'Chapter 16: The Reconnection Revolution',
      'Chapter 17: Standing in Grace',
      'Chapter 18: Living Under the Unforced Rhythms of Grace',
      'Chapter 19: When the Enemy Attacks Your Rest',
      'Chapter 20: Abundance in Every Season',
      'Chapter 21: The Power of Right Believing',
      'Chapter 22: Keep Your Eyes on Jesus',
      'Chapter 23: Living the Overflow',
    ],
  },
  {
    id: 'book-church',
    title: 'The Church Awakening — 19 Days',
    description: 'Nineteen chapters on the true power of the Church, why it exists, and how it changes everything. By Ps A.',
    totalDays: 19,
    category: 'Books',
    bookId: 'church',
    bookJsonFile: '/books/church.json',
    passages: [
      'Introduction: The Download',
      'Chapter 1: The Lie Everyone Believes',
      'Chapter 2: The Half-Empty Tomb',
      'Chapter 3: The Bride Jesus Is Coming Back For',
      'Chapter 4: When The Head Leaves The Body',
      'Chapter 5: The Secret God Kept For Centuries',
      'Chapter 6: Why Your Couch Is Killing Your Faith',
      'Chapter 7: The Last Organization Standing',
      'Chapter 8: Jesus\' Favorite Thing',
      'Chapter 9: God\'s Delivery Service',
      'Chapter 10: Plan A (There Is No Plan B)',
      'Chapter 11: The Day God Changed The Rules',
      'Chapter 12: The Power Only We Have',
      'Chapter 13: Fall In Love Or Fall Away',
      'Chapter 14: Bridezilla (The Church Isn\'t Perfect)',
      'Chapter 15: You\'re Not The Church (And That\'s The Point)',
      'Chapter 16: The Revelation That Changes Everything',
      'Chapter 17: Where To Find Jesus On Sunday Morning',
      'Chapter 18: The Fullness You\'ve Been Missing',
    ],
  },

  // ── Gospels & Acts ────────────────────────────────────────────────────────
  {
    id: 'gospel-john',
    title: 'Gospel of John — 21 Days',
    description: 'Walk through the Gospel of John chapter by chapter — the most intimate portrait of Jesus in scripture.',
    totalDays: 21,
    category: 'Gospels & Acts',
    passages: Array.from({ length: 21 }, (_, i) => 'John ' + (i + 1)),
  },
  {
    id: 'gospels-89',
    title: 'The Four Gospels — 89 Days',
    description: 'Matthew, Mark, Luke, and John — the life, ministry, death, and resurrection of Jesus, chapter by chapter.',
    totalDays: 89,
    category: 'Gospels & Acts',
    passages: genPassages([['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21]], 89),
  },
  {
    id: 'acts-28',
    title: 'Acts of the Apostles — 28 Days',
    description: 'One chapter a day through the explosive birth of the Church and the spread of the gospel across the world.',
    totalDays: 28,
    category: 'Gospels & Acts',
    passages: Array.from({ length: 28 }, (_, i) => 'Acts ' + (i + 1)),
  },
  {
    id: 'gospels-acts',
    title: 'Gospels & Acts — 117 Days',
    description: 'The complete story of Jesus and the early Church — all five books, one passage at a time.',
    totalDays: 117,
    category: 'Gospels & Acts',
    passages: genPassages(
      [['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28]],
      117
    ),
  },

  // ── New Testament ─────────────────────────────────────────────────────────
  {
    id: 'nt-60',
    title: 'New Testament in 60 Days',
    description: 'Read all 27 books of the New Testament in two months — the fastest way to take in the whole NT.',
    totalDays: 60,
    category: 'New Testament',
    passages: genPassages(NT, 60),
  },
  {
    id: 'new-testament-90',
    title: 'New Testament in 90 Days',
    description: 'Read through all 27 books of the New Testament in three months, with time to breathe.',
    totalDays: 90,
    category: 'New Testament',
    passages: genPassages(NT, 90),
  },

  // ── Wisdom & Psalms ───────────────────────────────────────────────────────
  {
    id: 'psalms-30',
    title: 'Psalms in 30 Days',
    description: 'Five psalms a day — read through all 150 psalms in one month of worship and prayer.',
    totalDays: 30,
    category: 'Wisdom',
    passages: Array.from({ length: 30 }, (_, i) => {
      const start = i * 5 + 1;
      const end = (i + 1) * 5;
      return `Psalm ${start}-${end}`;
    }),
  },
  {
    id: 'psalms-proverbs',
    title: 'Psalms & Proverbs — 181 Days',
    description: 'A chapter a day through worship, wisdom, and practical living.',
    totalDays: 181,
    category: 'Wisdom',
    passages: genPassages([['Psalms', 150], ['Proverbs', 31]], 181),
  },
  {
    id: 'wisdom-lit',
    title: 'Psalms, Proverbs & Wisdom — 90 Days',
    description: 'Psalms, Proverbs, Ecclesiastes, and Song of Solomon — the full sweep of Hebrew poetry and wisdom in 90 days.',
    totalDays: 90,
    category: 'Wisdom',
    passages: genPassages([['Psalms', 150], ['Proverbs', 31], ['Ecclesiastes', 12], ['Song of Solomon', 8]], 90),
  },

  // ── Full Bible ────────────────────────────────────────────────────────────
  {
    id: 'ot-in-a-year',
    title: 'Old Testament in a Year',
    description: 'Journey through all 39 books of the Old Testament in one year.',
    totalDays: 365,
    category: 'Full Bible',
    passages: genPassages(OT, 365),
  },
  {
    id: 'through-bible-year',
    title: 'Through the Bible in a Year',
    description: 'Read every chapter of the Bible from Genesis to Revelation in 365 days.',
    totalDays: 365,
    category: 'Full Bible',
    passages: genPassages([...OT, ...NT], 365),
  },

  // ── Foundation & Spiritual Growth ─────────────────────────────────────────
  {
    id: 'faith-pathway',
    title: '30-Day Faith Pathway',
    description: 'A guided journey through the foundations of faith — designed for new believers and anyone returning to Scripture.',
    totalDays: 30,
    category: 'Foundation',
    passages: [
      'John 3', 'Romans 3', 'Ephesians 2', 'John 1', 'Romans 5', 'Romans 6', 'Romans 8',
      'Galatians 5', 'Philippians 4', 'Colossians 3', '1 John 1', '1 John 3', '1 John 4',
      'James 1', 'James 2', 'Hebrews 11', 'Hebrews 12', 'Psalm 23', 'Psalm 27', 'Psalm 37',
      'Psalm 91', 'Psalm 139', 'Proverbs 3', 'Isaiah 40', 'Isaiah 55', 'Matthew 5',
      'Matthew 6', 'Matthew 7', 'Luke 15', 'Revelation 21',
    ],
  },
  {
    id: 'prayer-life',
    title: 'Building a Prayer Life — 14 Days',
    description: 'Learn different prayer models and build a consistent, powerful prayer habit.',
    totalDays: 14,
    category: 'Foundation',
    passages: [
      'Matthew 6', 'Luke 11', '1 Thessalonians 5', 'Philippians 4', 'James 5',
      'Psalm 5', 'Psalm 63', 'Daniel 6', 'Nehemiah 1', 'Acts 4',
      'Ephesians 6', 'Colossians 4', '1 Timothy 2', 'Jude 1',
    ],
  },
  {
    id: 'armor-of-god',
    title: 'The Armor of God — 7 Days',
    description: 'Study each piece of spiritual armor described in Ephesians 6 and understand how to wear it daily.',
    totalDays: 7,
    category: 'Foundation',
    passages: ['Ephesians 6', 'Isaiah 59', 'Romans 13', '1 Thessalonians 5', '2 Corinthians 10', 'Hebrews 4', 'Psalm 18'],
  },

  // ── Comfort ───────────────────────────────────────────────────────
  {
    id: 'psalms-brokenhearted',
    title: 'Psalms for the Brokenhearted — 14 Days',
    description: 'Fourteen days of Psalms focused on grief, lament, and hope — finding strength in sorrow.',
    totalDays: 14,
    category: 'comfort',
    passages: ['Psalm 6', 'Psalm 10', 'Psalm 13', 'Psalm 22', 'Psalm 31', 'Psalm 34', 'Psalm 42', 'Psalm 46', 'Psalm 55', 'Psalm 61', 'Psalm 69', 'Psalm 86', 'Psalm 130', 'Psalm 147'],
  },
  {
    id: 'promises-hurting',
    title: "God's Promises When You're Hurting — 21 Days",
    description: 'Twenty-one days of comfort passages from both Old and New Testament — promises of healing and hope.',
    totalDays: 21,
    category: 'comfort',
    passages: ['Isaiah 41', 'Isaiah 43', 'Isaiah 49', 'Isaiah 54', 'Isaiah 61', 'Psalm 23', 'Psalm 27', 'Psalm 91', 'Psalm 103', 'Psalm 121', 'Psalm 139', 'Lamentations 3', 'Matthew 11', 'John 14', 'John 16', 'Romans 8', '2 Corinthians 1', '2 Corinthians 4', 'Philippians 4', '1 Peter 5', 'Revelation 21'],
  },
  {
    id: 'hope-darkness',
    title: 'Finding Hope in the Darkness — 30 Days',
    description: 'Thirty days through hope-themed passages from Scripture — walking toward light, one day at a time.',
    totalDays: 30,
    category: 'comfort',
    passages: genPassages(
      [
        ['Psalm', 150], // Used for hope-themed passages: 23, 27, 30, 34, 40, 42, 46, 56, 62, 71, 73, 77, 84, 91, 116, 121 (16 total)
        ['Isaiah', 66],
        ['Romans', 16],
        ['2 Corinthians', 13],
        ['Hebrews', 13],
        ['Revelation', 22],
      ],
      30
    ).map((passage, idx) => {
      // Override with specific hope-themed passages
      const hopePassages = [
        'Psalm 23', 'Psalm 27', 'Psalm 30', 'Psalm 34', 'Psalm 40', 'Psalm 42',
        'Psalm 46', 'Psalm 56', 'Psalm 62', 'Psalm 71', 'Psalm 73', 'Psalm 77',
        'Psalm 84', 'Psalm 91', 'Psalm 116', 'Psalm 121',
        'Isaiah 25', 'Isaiah 40', 'Isaiah 43', 'Isaiah 61',
        'Romans 5', 'Romans 8', 'Romans 15',
        '2 Corinthians 4', '2 Corinthians 12',
        'Hebrews 4', 'Hebrews 12',
        'Revelation 21',
      ];
      return hopePassages[idx] || passage;
    }),
  },
];
