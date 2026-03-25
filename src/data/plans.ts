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
  /** Indonesian translations */
  titleId?: string;
  descriptionId?: string;
  /** Spanish translations */
  titleEs?: string;
  descriptionEs?: string;
  /** Portuguese translations */
  titlePt?: string;
  descriptionPt?: string;
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
    titleId: 'Firman Harian bersama Ashley & Jane',
    titleEs: 'Palabra Diaria con Ashley y Jane',
    titlePt: 'Palavra Diária com Ashley e Jane',
    description: 'A 100-day journey through fear, faith, grace, community, and purpose — drawn from Ashley & Jane\'s books No More Fear, The Church, and From Scarcity to Supernatural.',
    descriptionId: 'Perjalanan 100 hari melalui ketakutan, iman, kasih karunia, komunitas, dan tujuan hidup — diambil dari buku-buku Ashley & Jane: No More Fear, The Church, dan From Scarcity to Supernatural.',
    descriptionEs: 'Un recorrido de 100 días a través del miedo, la fe, la gracia, la comunidad y el propósito — basado en los libros de Ashley y Jane: No More Fear, The Church y From Scarcity to Supernatural.',
    descriptionPt: 'Uma jornada de 100 dias através do medo, da fé, da graça, da comunidade e do propósito — extraída dos livros de Ashley e Jane: No More Fear, The Church e From Scarcity to Supernatural.',
    totalDays: 100,
    category: 'Featured',
    passages: ALL_ASHLEY_JANE_PASSAGES,
    devotionals: ALL_ASHLEY_JANE_DEVOTIONALS,
  },

  // ── Books by Ps A ─────────────────────────────────────────────────────────
  {
    id: 'book-no-more-fear',
    title: 'No More Fear — 40 Days',
    titleId: 'Tidak Ada Lagi Ketakutan — 40 Hari',
    titleEs: 'No Más Miedo — 40 Días',
    titlePt: 'Sem Mais Medo — 40 Dias',
    description: 'A 40-day devotional to defeat fear, walk in God\'s authority, and live the bold life you were created for. By Ps A.',
    descriptionId: 'Renungan 40 hari untuk mengalahkan rasa takut, berjalan dalam otoritas Tuhan, dan menjalani kehidupan yang berani sesuai rancangan-Nya. Oleh Ps A.',
    descriptionEs: 'Un devocional de 40 días para vencer el miedo, caminar en la autoridad de Dios y vivir la vida valiente para la cual fuiste creado. Por el Ps A.',
    descriptionPt: 'Um devocional de 40 dias para vencer o medo, caminhar na autoridade de Deus e viver a vida corajosa para a qual você foi criado. Por Ps A.',
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
    titleId: 'Dari Kekurangan ke Kelimpahan — 23 Hari',
    titleEs: 'De la Escasez a la Abundancia — 23 Días',
    titlePt: 'Da Escassez à Abundância — 23 Dias',
    description: 'Twenty-three chapters on the grace revolution, God\'s overflow, and the life you were designed to live. By Ps A.',
    descriptionId: 'Dua puluh tiga bab tentang revolusi kasih karunia, limpahan berkat Tuhan, dan kehidupan yang dirancang-Nya untuk Anda. Oleh Ps A.',
    descriptionEs: 'Veintitrés capítulos sobre la revolución de la gracia, la sobreabundancia de Dios y la vida para la cual fuiste diseñado. Por el Ps A.',
    descriptionPt: 'Vinte e três capítulos sobre a revolução da graça, a abundância de Deus e a vida para a qual você foi projetado. Por Ps A.',
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
    titleId: 'Kebangkitan Gereja — 19 Hari',
    titleEs: 'El Despertar de la Iglesia — 19 Días',
    titlePt: 'O Despertar da Igreja — 19 Dias',
    description: 'Nineteen chapters on the true power of the Church, why it exists, and how it changes everything. By Ps A.',
    descriptionId: 'Sembilan belas bab tentang kuasa sejati Gereja, mengapa Gereja ada, dan bagaimana Gereja mengubah segalanya. Oleh Ps A.',
    descriptionEs: 'Diecinueve capítulos sobre el verdadero poder de la Iglesia, por qué existe y cómo lo transforma todo. Por el Ps A.',
    descriptionPt: 'Dezenove capítulos sobre o verdadeiro poder da Igreja, por que ela existe e como ela transforma tudo. Por Ps A.',
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
    titleId: 'Injil Yohanes — 21 Hari',
    titleEs: 'Evangelio de Juan — 21 Días',
    titlePt: 'Evangelho de João — 21 Dias',
    description: 'Walk through the Gospel of John chapter by chapter — the most intimate portrait of Jesus in scripture.',
    descriptionId: 'Telusuri Injil Yohanes bab demi bab — potret Yesus yang paling mendalam dalam Alkitab.',
    descriptionEs: 'Recorre el Evangelio de Juan capítulo a capítulo — el retrato más íntimo de Jesús en las Escrituras.',
    descriptionPt: 'Percorra o Evangelho de João capítulo por capítulo — o retrato mais íntimo de Jesus nas Escrituras.',
    totalDays: 21,
    category: 'Gospels & Acts',
    passages: Array.from({ length: 21 }, (_, i) => 'John ' + (i + 1)),
  },
  {
    id: 'gospels-89',
    title: 'The Four Gospels — 89 Days',
    titleId: 'Empat Injil — 89 Hari',
    titleEs: 'Los Cuatro Evangelios — 89 Días',
    titlePt: 'Os Quatro Evangelhos — 89 Dias',
    description: 'Matthew, Mark, Luke, and John — the life, ministry, death, and resurrection of Jesus, chapter by chapter.',
    descriptionId: 'Matius, Markus, Lukas, dan Yohanes — kehidupan, pelayanan, kematian, dan kebangkitan Yesus, bab demi bab.',
    descriptionEs: 'Mateo, Marcos, Lucas y Juan — la vida, el ministerio, la muerte y la resurrección de Jesús, capítulo a capítulo.',
    descriptionPt: 'Mateus, Marcos, Lucas e João — a vida, o ministério, a morte e a ressurreição de Jesus, capítulo por capítulo.',
    totalDays: 89,
    category: 'Gospels & Acts',
    passages: genPassages([['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21]], 89),
  },
  {
    id: 'acts-28',
    title: 'Acts of the Apostles — 28 Days',
    titleId: 'Kisah Para Rasul — 28 Hari',
    titleEs: 'Hechos de los Apóstoles — 28 Días',
    titlePt: 'Atos dos Apóstolos — 28 Dias',
    description: 'One chapter a day through the explosive birth of the Church and the spread of the gospel across the world.',
    descriptionId: 'Satu bab sehari melalui kelahiran Gereja yang dahsyat dan penyebaran Injil ke seluruh dunia.',
    descriptionEs: 'Un capítulo al día a través del nacimiento explosivo de la Iglesia y la expansión del evangelio por todo el mundo.',
    descriptionPt: 'Um capítulo por dia através do nascimento extraordinário da Igreja e a expansão do evangelho pelo mundo.',
    totalDays: 28,
    category: 'Gospels & Acts',
    passages: Array.from({ length: 28 }, (_, i) => 'Acts ' + (i + 1)),
  },
  {
    id: 'gospels-acts',
    title: 'Gospels & Acts — 117 Days',
    titleId: 'Injil & Kisah Rasul — 117 Hari',
    titleEs: 'Evangelios y Hechos — 117 Días',
    titlePt: 'Evangelhos e Atos — 117 Dias',
    description: 'The complete story of Jesus and the early Church — all five books, one passage at a time.',
    descriptionId: 'Kisah lengkap tentang Yesus dan Gereja mula-mula — kelima kitab, satu perikop setiap hari.',
    descriptionEs: 'La historia completa de Jesús y la Iglesia primitiva — los cinco libros, un pasaje a la vez.',
    descriptionPt: 'A história completa de Jesus e da Igreja primitiva — todos os cinco livros, uma passagem de cada vez.',
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
    titleId: 'Perjanjian Baru dalam 60 Hari',
    titleEs: 'Nuevo Testamento en 60 Días',
    titlePt: 'Novo Testamento em 60 Dias',
    description: 'Read all 27 books of the New Testament in two months — the fastest way to take in the whole NT.',
    descriptionId: 'Baca seluruh 27 kitab Perjanjian Baru dalam dua bulan — cara tercepat untuk menyelesaikan seluruh PB.',
    descriptionEs: 'Lee los 27 libros del Nuevo Testamento en dos meses — la forma más rápida de recorrer todo el NT.',
    descriptionPt: 'Leia todos os 27 livros do Novo Testamento em dois meses — o caminho mais rápido para percorrer todo o NT.',
    totalDays: 60,
    category: 'New Testament',
    passages: genPassages(NT, 60),
  },
  {
    id: 'new-testament-90',
    title: 'New Testament in 90 Days',
    titleId: 'Perjanjian Baru dalam 90 Hari',
    titleEs: 'Nuevo Testamento en 90 Días',
    titlePt: 'Novo Testamento em 90 Dias',
    description: 'Read through all 27 books of the New Testament in three months, with time to breathe.',
    descriptionId: 'Baca seluruh 27 kitab Perjanjian Baru dalam tiga bulan, dengan waktu untuk merenungkannya.',
    descriptionEs: 'Recorre los 27 libros del Nuevo Testamento en tres meses, con tiempo para reflexionar.',
    descriptionPt: 'Leia todos os 27 livros do Novo Testamento em três meses, com tempo para absorver.',
    totalDays: 90,
    category: 'New Testament',
    passages: genPassages(NT, 90),
  },

  // ── Wisdom & Psalms ───────────────────────────────────────────────────────
  {
    id: 'psalms-30',
    title: 'Psalms in 30 Days',
    titleId: 'Mazmur dalam 30 Hari',
    titleEs: 'Salmos en 30 Días',
    titlePt: 'Salmos em 30 Dias',
    description: 'Five psalms a day — read through all 150 psalms in one month of worship and prayer.',
    descriptionId: 'Lima mazmur setiap hari — baca seluruh 150 mazmur dalam satu bulan penyembahan dan doa.',
    descriptionEs: 'Cinco salmos al día — recorre los 150 salmos en un mes de adoración y oración.',
    descriptionPt: 'Cinco salmos por dia — leia todos os 150 salmos em um mês de louvor e oração.',
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
    titleId: 'Mazmur & Amsal — 181 Hari',
    titleEs: 'Salmos y Proverbios — 181 Días',
    titlePt: 'Salmos e Provérbios — 181 Dias',
    description: 'A chapter a day through worship, wisdom, and practical living.',
    descriptionId: 'Satu bab setiap hari melalui penyembahan, hikmat, dan kehidupan praktis.',
    descriptionEs: 'Un capítulo al día a través de la adoración, la sabiduría y la vida práctica.',
    descriptionPt: 'Um capítulo por dia através do louvor, da sabedoria e da vida prática.',
    totalDays: 181,
    category: 'Wisdom',
    passages: genPassages([['Psalms', 150], ['Proverbs', 31]], 181),
  },
  {
    id: 'wisdom-lit',
    title: 'Psalms, Proverbs & Wisdom — 90 Days',
    titleId: 'Mazmur, Amsal & Hikmat — 90 Hari',
    titleEs: 'Salmos, Proverbios y Sabiduría — 90 Días',
    titlePt: 'Salmos, Provérbios e Sabedoria — 90 Dias',
    description: 'Psalms, Proverbs, Ecclesiastes, and Song of Solomon — the full sweep of Hebrew poetry and wisdom in 90 days.',
    descriptionId: 'Mazmur, Amsal, Pengkhotbah, dan Kidung Agung — seluruh puisi dan hikmat Ibrani dalam 90 hari.',
    descriptionEs: 'Salmos, Proverbios, Eclesiastés y Cantar de los Cantares — toda la poesía y sabiduría hebrea en 90 días.',
    descriptionPt: 'Salmos, Provérbios, Eclesiastes e Cântico dos Cânticos — toda a poesia e sabedoria hebraica em 90 dias.',
    totalDays: 90,
    category: 'Wisdom',
    passages: genPassages([['Psalms', 150], ['Proverbs', 31], ['Ecclesiastes', 12], ['Song of Solomon', 8]], 90),
  },

  // ── Full Bible ────────────────────────────────────────────────────────────
  {
    id: 'ot-in-a-year',
    title: 'Old Testament in a Year',
    titleId: 'Perjanjian Lama dalam Setahun',
    titleEs: 'Antiguo Testamento en un Año',
    titlePt: 'Antigo Testamento em um Ano',
    description: 'Journey through all 39 books of the Old Testament in one year.',
    descriptionId: 'Jelajahi seluruh 39 kitab Perjanjian Lama dalam satu tahun.',
    descriptionEs: 'Recorre los 39 libros del Antiguo Testamento en un año.',
    descriptionPt: 'Percorra todos os 39 livros do Antigo Testamento em um ano.',
    totalDays: 365,
    category: 'Full Bible',
    passages: genPassages(OT, 365),
  },
  {
    id: 'through-bible-year',
    title: 'Through the Bible in a Year',
    titleId: 'Seluruh Alkitab dalam Setahun',
    titleEs: 'Toda la Biblia en un Año',
    titlePt: 'Toda a Bíblia em um Ano',
    description: 'Read every chapter of the Bible from Genesis to Revelation in 365 days.',
    descriptionId: 'Baca setiap bab Alkitab dari Kejadian hingga Wahyu dalam 365 hari.',
    descriptionEs: 'Lee cada capítulo de la Biblia, de Génesis a Apocalipsis, en 365 días.',
    descriptionPt: 'Leia cada capítulo da Bíblia, de Gênesis a Apocalipse, em 365 dias.',
    totalDays: 365,
    category: 'Full Bible',
    passages: genPassages([...OT, ...NT], 365),
  },

  // ── Foundation & Spiritual Growth ─────────────────────────────────────────
  {
    id: 'faith-pathway',
    title: '30-Day Faith Pathway',
    titleId: 'Jalan Iman 30 Hari',
    titleEs: 'Camino de Fe — 30 Días',
    titlePt: 'Caminho da Fé — 30 Dias',
    description: 'A guided journey through the foundations of faith — designed for new believers and anyone returning to Scripture.',
    descriptionId: 'Perjalanan terpandu melalui dasar-dasar iman — dirancang untuk orang percaya baru dan siapa pun yang ingin kembali mendalami Alkitab.',
    descriptionEs: 'Un recorrido guiado por los fundamentos de la fe — diseñado para nuevos creyentes y para quienes desean volver a las Escrituras.',
    descriptionPt: 'Uma jornada guiada pelos fundamentos da fé — feita para novos crentes e para quem deseja retornar às Escrituras.',
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
    titleId: 'Membangun Kehidupan Doa — 14 Hari',
    titleEs: 'Construyendo una Vida de Oración — 14 Días',
    titlePt: 'Construindo uma Vida de Oração — 14 Dias',
    description: 'Learn different prayer models and build a consistent, powerful prayer habit.',
    descriptionId: 'Pelajari berbagai model doa dan bangun kebiasaan berdoa yang konsisten dan penuh kuasa.',
    descriptionEs: 'Aprende diferentes modelos de oración y desarrolla un hábito de oración constante y poderoso.',
    descriptionPt: 'Aprenda diferentes modelos de oração e desenvolva um hábito de oração consistente e poderoso.',
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
    titleId: 'Perlengkapan Senjata Allah — 7 Hari',
    titleEs: 'La Armadura de Dios — 7 Días',
    titlePt: 'A Armadura de Deus — 7 Dias',
    description: 'Study each piece of spiritual armor described in Ephesians 6 and understand how to wear it daily.',
    descriptionId: 'Pelajari setiap bagian perlengkapan senjata rohani dalam Efesus 6 dan pahami cara mengenakannya setiap hari.',
    descriptionEs: 'Estudia cada pieza de la armadura espiritual descrita en Efesios 6 y aprende a usarla cada día.',
    descriptionPt: 'Estude cada peça da armadura espiritual descrita em Efésios 6 e entenda como usá-la diariamente.',
    totalDays: 7,
    category: 'Foundation',
    passages: ['Ephesians 6', 'Isaiah 59', 'Romans 13', '1 Thessalonians 5', '2 Corinthians 10', 'Hebrews 4', 'Psalm 18'],
  },

  // ── Comfort ───────────────────────────────────────────────────────
  {
    id: 'psalms-brokenhearted',
    title: 'Psalms for the Brokenhearted — 14 Days',
    titleId: 'Mazmur untuk yang Patah Hati — 14 Hari',
    titleEs: 'Salmos para los Quebrantados — 14 Días',
    titlePt: 'Salmos para os de Coração Partido — 14 Dias',
    description: 'Fourteen days of Psalms focused on grief, lament, and hope — finding strength in sorrow.',
    descriptionId: 'Empat belas hari Mazmur yang berfokus pada duka, ratapan, dan harapan — menemukan kekuatan di tengah kesedihan.',
    descriptionEs: 'Catorce días de Salmos enfocados en el duelo, el lamento y la esperanza — encontrando fortaleza en medio del dolor.',
    descriptionPt: 'Catorze dias de Salmos focados no luto, no lamento e na esperança — encontrando força em meio à dor.',
    totalDays: 14,
    category: 'comfort',
    passages: ['Psalm 6', 'Psalm 10', 'Psalm 13', 'Psalm 22', 'Psalm 31', 'Psalm 34', 'Psalm 42', 'Psalm 46', 'Psalm 55', 'Psalm 61', 'Psalm 69', 'Psalm 86', 'Psalm 130', 'Psalm 147'],
  },
  {
    id: 'promises-hurting',
    title: "God's Promises When You're Hurting — 21 Days",
    titleId: 'Janji Tuhan Saat Kamu Terluka — 21 Hari',
    titleEs: 'Promesas de Dios Cuando Estás Sufriendo — 21 Días',
    titlePt: 'Promessas de Deus Quando Você Está Sofrendo — 21 Dias',
    description: 'Twenty-one days of comfort passages from both Old and New Testament — promises of healing and hope.',
    descriptionId: 'Dua puluh satu hari perikop penghiburan dari Perjanjian Lama dan Baru — janji-janji penyembuhan dan harapan.',
    descriptionEs: 'Veintiún días de pasajes de consuelo del Antiguo y Nuevo Testamento — promesas de sanidad y esperanza.',
    descriptionPt: 'Vinte e um dias de passagens de consolo do Antigo e do Novo Testamento — promessas de cura e esperança.',
    totalDays: 21,
    category: 'comfort',
    passages: ['Isaiah 41', 'Isaiah 43', 'Isaiah 49', 'Isaiah 54', 'Isaiah 61', 'Psalm 23', 'Psalm 27', 'Psalm 91', 'Psalm 103', 'Psalm 121', 'Psalm 139', 'Lamentations 3', 'Matthew 11', 'John 14', 'John 16', 'Romans 8', '2 Corinthians 1', '2 Corinthians 4', 'Philippians 4', '1 Peter 5', 'Revelation 21'],
  },
  {
    id: 'hope-darkness',
    title: 'Finding Hope in the Darkness — 30 Days',
    titleId: 'Menemukan Harapan di Tengah Kegelapan — 30 Hari',
    titleEs: 'Encontrando Esperanza en la Oscuridad — 30 Días',
    titlePt: 'Encontrando Esperança na Escuridão — 30 Dias',
    description: 'Thirty days through hope-themed passages from Scripture — walking toward light, one day at a time.',
    descriptionId: 'Tiga puluh hari melalui perikop bertema harapan dari Alkitab — melangkah menuju terang, satu hari pada satu waktu.',
    descriptionEs: 'Treinta días a través de pasajes bíblicos sobre la esperanza — caminando hacia la luz, un día a la vez.',
    descriptionPt: 'Trinta dias através de passagens bíblicas sobre esperança — caminhando em direção à luz, um dia de cada vez.',
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
