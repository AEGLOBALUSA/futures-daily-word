export interface PlanDef {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  category: string;
  passages: string[];
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

export const PLAN_CATALOGUE: PlanDef[] = [
  {
    id: 'ot-in-a-year',
    title: 'Old Testament in a Year',
    description: 'Journey through all 39 books of the Old Testament in one year.',
    totalDays: 365,
    category: 'Bible Reading',
    passages: genPassages(OT, 365),
  },
  {
    id: 'through-bible-year',
    title: 'Through the Bible in a Year',
    description: 'Read every chapter of the Bible from Genesis to Revelation in 365 days.',
    totalDays: 365,
    category: 'Bible Reading',
    passages: genPassages([...OT, ...NT], 365),
  },
  {
    id: 'gospels-acts',
    title: 'Gospels & Acts',
    description: 'Walk through the four Gospels and Acts in 117 days.',
    totalDays: 117,
    category: 'Bible Reading',
    passages: genPassages(
      [['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28]],
      117
    ),
  },
  {
    id: 'psalms-proverbs',
    title: 'Psalms & Proverbs',
    description: 'A chapter a day through wisdom, worship, and practical living.',
    totalDays: 181,
    category: 'Bible Reading',
    passages: genPassages([['Psalms', 150], ['Proverbs', 31]], 181),
  },
  {
    id: 'new-testament-90',
    title: 'New Testament in 90 Days',
    description: 'Read through all 27 books of the New Testament in three months.',
    totalDays: 90,
    category: 'Bible Reading',
    passages: genPassages(NT, 90),
  },
  {
    id: 'faith-pathway',
    title: '30-Day Faith Pathway',
    description: 'A guided journey through the foundations of faith for new believers.',
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
    id: 'psalms-30',
    title: 'Psalms in 30 Days',
    description: 'Read through the entire book of Psalms with daily reflections.',
    totalDays: 30,
    category: 'Bible Reading',
    passages: Array.from({ length: 30 }, (_, i) => 'Psalm ' + (i * 5 + 1) + '-' + ((i + 1) * 5)),
  },
  {
    id: 'prayer-life',
    title: 'Building a Prayer Life',
    description: 'Learn different prayer models and build a consistent prayer habit.',
    totalDays: 14,
    category: 'Spiritual Growth',
    passages: [
      'Matthew 6', 'Luke 11', '1 Thessalonians 5', 'Philippians 4', 'James 5',
      'Psalm 5', 'Psalm 63', 'Daniel 6', 'Nehemiah 1', 'Acts 4',
      'Ephesians 6', 'Colossians 4', '1 Timothy 2', 'Jude 1',
    ],
  },
  {
    id: 'gospel-john',
    title: 'Gospel of John',
    description: 'Walk through the Gospel of John chapter by chapter.',
    totalDays: 21,
    category: 'Bible Reading',
    passages: Array.from({ length: 21 }, (_, i) => 'John ' + (i + 1)),
  },
  {
    id: 'armor-of-god',
    title: 'The Armor of God',
    description: 'Study each piece of spiritual armor described in Ephesians 6.',
    totalDays: 7,
    category: 'Spiritual Growth',
    passages: ['Ephesians 6', 'Isaiah 59', 'Romans 13', '1 Thessalonians 5', '2 Corinthians 10', 'Hebrews 4', 'Psalm 18'],
  },
];
