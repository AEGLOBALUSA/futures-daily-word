const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:noreply@futuresdailyword.com";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("VAPID keys not configured in environment variables");
}
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

const ALL_PASSAGES = [
  "Psalms 23","Romans 8","John 3","Philippians 4","Isaiah 40","Genesis 1","Matthew 5",
  "Psalms 91","1 Corinthians 13","John 1","Proverbs 3","Ephesians 6","Hebrews 11",
  "Romans 12","Isaiah 55","Matthew 6","Psalms 119","James 1","Galatians 5","Colossians 3",
  "John 15","Revelation 1","Joshua 1","2 Timothy 1","1 Peter 5","Psalms 1","Romans 5",
  "Jeremiah 29","Matthew 7","Luke 15","Psalms 27","Ephesians 2","Isaiah 53","John 14",
  "2 Corinthians 5","Psalms 139","Deuteronomy 31","Acts 2","1 John 4","Psalm 46"
];

const VERSE_SNIPPETS = {
  en: {
    "Psalms 23": "The Lord is my shepherd — I shall not want.",
    "Romans 8": "Nothing can separate us from the love of God.",
    "John 3": "For God so loved the world that He gave His only Son.",
    "Philippians 4": "I can do all things through Christ who strengthens me.",
    "Isaiah 40": "Those who wait on the Lord shall renew their strength.",
    "Genesis 1": "In the beginning, God created the heavens and the earth.",
    "Matthew 5": "Blessed are the pure in heart, for they shall see God.",
    "Psalms 91": "He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty.",
    "1 Corinthians 13": "Love bears all things, believes all things, hopes all things.",
    "John 1": "In the beginning was the Word, and the Word was with God.",
    "Proverbs 3": "Trust in the Lord with all your heart and lean not on your own understanding.",
    "Ephesians 6": "Put on the whole armor of God, that you may stand against the schemes of the devil.",
    "Hebrews 11": "Now faith is the substance of things hoped for, the evidence of things not seen.",
    "Romans 12": "Be transformed by the renewing of your mind.",
    "Isaiah 55": "My word shall not return to me empty — it shall accomplish what I purpose.",
    "Matthew 6": "Seek first the kingdom of God and His righteousness.",
    "Psalms 119": "Your word is a lamp to my feet and a light to my path.",
    "James 1": "Every good and perfect gift is from above.",
    "Galatians 5": "The fruit of the Spirit is love, joy, peace, patience, kindness.",
    "Colossians 3": "Set your minds on things above, not on earthly things.",
    "John 15": "I am the vine; you are the branches. Remain in me.",
    "Revelation 1": "I am the Alpha and the Omega, the Beginning and the End.",
    "Joshua 1": "Be strong and courageous. The Lord your God is with you wherever you go.",
    "2 Timothy 1": "God has not given us a spirit of fear, but of power, love, and a sound mind.",
    "1 Peter 5": "Cast all your anxiety on Him, because He cares for you.",
    "Psalms 1": "Blessed is the one whose delight is in the law of the Lord.",
    "Romans 5": "We rejoice in our sufferings, because suffering produces perseverance.",
    "Jeremiah 29": "For I know the plans I have for you, declares the Lord — plans to prosper you.",
    "Matthew 7": "Ask and it will be given to you; seek and you will find.",
    "Luke 15": "There is rejoicing in heaven over one sinner who repents.",
    "Psalms 27": "The Lord is my light and my salvation — whom shall I fear?",
    "Ephesians 2": "For by grace you have been saved through faith — it is the gift of God.",
    "Isaiah 53": "He was wounded for our transgressions, bruised for our iniquities.",
    "John 14": "I am the way, the truth, and the life.",
    "2 Corinthians 5": "If anyone is in Christ, he is a new creation.",
    "Psalms 139": "I am fearfully and wonderfully made.",
    "Deuteronomy 31": "He will never leave you nor forsake you. Do not be afraid.",
    "Acts 2": "They devoted themselves to the apostles' teaching and to fellowship.",
    "1 John 4": "We love because He first loved us.",
    "Psalm 46": "Be still, and know that I am God.",
  },
  id: {
    "Psalms 23": "TUHAN adalah gembalaku — takkan kekurangan aku.",
    "Romans 8": "Tidak ada sesuatu pun yang dapat memisahkan kita dari kasih Allah.",
    "John 3": "Karena begitu besar kasih Allah akan dunia ini, sehingga Ia mengaruniakan Anak-Nya yang tunggal.",
    "Philippians 4": "Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.",
    "Isaiah 40": "Orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru.",
    "Genesis 1": "Pada mulanya Allah menciptakan langit dan bumi.",
    "Matthew 5": "Berbahagialah orang yang suci hatinya, karena mereka akan melihat Allah.",
    "Psalms 91": "Orang yang duduk dalam lindungan Yang Mahatinggi akan bermalam dalam naungan Yang Mahakuasa.",
    "1 Corinthians 13": "Kasih menutupi segala sesuatu, percaya segala sesuatu, mengharapkan segala sesuatu.",
    "John 1": "Pada mulanya adalah Firman; Firman itu bersama-sama dengan Allah.",
    "Proverbs 3": "Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri.",
    "Ephesians 6": "Kenakanlah seluruh perlengkapan senjata Allah, supaya kamu dapat bertahan melawan tipu muslihat Iblis.",
    "Hebrews 11": "Iman adalah dasar dari segala sesuatu yang kita harapkan dan bukti dari segala sesuatu yang tidak kita lihat.",
    "Romans 12": "Berubahlah oleh pembaharuan budimu.",
    "Isaiah 55": "Firman-Ku tidak akan kembali kepada-Ku dengan sia-sia — tetapi akan melaksanakan apa yang Kukehendaki.",
    "Matthew 6": "Carilah dahulu Kerajaan Allah dan kebenarannya.",
    "Psalms 119": "Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.",
    "James 1": "Setiap pemberian yang baik dan setiap anugerah yang sempurna datangnya dari atas.",
    "Galatians 5": "Buah Roh ialah kasih, sukacita, damai sejahtera, kesabaran, kemurahan.",
    "Colossians 3": "Pikirkanlah perkara yang di atas, bukan yang di bumi.",
    "John 15": "Akulah pokok anggur dan kamulah ranting-rantingnya. Tinggallah di dalam Aku.",
    "Revelation 1": "Aku adalah Alfa dan Omega, Yang Awal dan Yang Akhir.",
    "Joshua 1": "Kuatkan dan teguhkanlah hatimu. TUHAN Allahmu menyertai engkau ke mana pun engkau pergi.",
    "2 Timothy 1": "Allah memberikan kepada kita bukan roh ketakutan, melainkan roh yang memberi kekuatan, kasih, dan ketertiban.",
    "1 Peter 5": "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu.",
    "Psalms 1": "Berbahagialah orang yang kesukaannya ialah Taurat TUHAN.",
    "Romans 5": "Kita bermegah dalam kesengsaraan, karena kesengsaraan itu menimbulkan ketekunan.",
    "Jeremiah 29": "Aku ini mengetahui rancangan-rancangan yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN — rancangan damai sejahtera.",
    "Matthew 7": "Mintalah, maka akan diberikan kepadamu; carilah, maka kamu akan mendapat.",
    "Luke 15": "Ada sukacita di surga karena satu orang berdosa yang bertobat.",
    "Psalms 27": "TUHAN adalah terangku dan keselamatanku — kepada siapakah aku harus takut?",
    "Ephesians 2": "Sebab karena kasih karunia kamu diselamatkan oleh iman — itu adalah pemberian Allah.",
    "Isaiah 53": "Dia tertikam oleh karena pemberontakan kita, diremukkan oleh karena kejahatan kita.",
    "John 14": "Akulah jalan dan kebenaran dan hidup.",
    "2 Corinthians 5": "Jadi siapa yang ada di dalam Kristus, ia adalah ciptaan baru.",
    "Psalms 139": "Aku bersyukur kepada-Mu oleh karena kejadianku dahsyat dan ajaib.",
    "Deuteronomy 31": "Ia tidak akan membiarkan engkau dan tidak akan meninggalkan engkau. Janganlah takut.",
    "Acts 2": "Mereka bertekun dalam pengajaran rasul-rasul dan dalam persekutuan.",
    "1 John 4": "Kita mengasihi karena Allah lebih dahulu mengasihi kita.",
    "Psalm 46": "Diamlah dan ketahuilah bahwa Akulah Allah.",
  },
};

const TEMPLATES = {
  en: [
    { title: "Your Daily Reading", body: "{passage} — \"{verse}\"" },
    { title: "Good Morning", body: "{passage} is waiting for you — \"{verse}\"" },
    { title: "Daily Word", body: "Today's reading: {passage} — \"{verse}\"" },
    { title: "Time in the Word", body: "\"{verse}\" — {passage} is ready for you." },
    { title: "Your Reading Today", body: "{passage}. \"{verse}\"" },
    { title: "Daily Word", body: "Open your heart to {passage} today — \"{verse}\"" },
    { title: "Scripture for Today", body: "\"{verse}\" — Begin your day in {passage}." },
  ],
  id: [
    { title: "Bacaan Harianmu", body: "{passage} — \"{verse}\"" },
    { title: "Selamat Pagi", body: "{passage} menunggumu — \"{verse}\"" },
    { title: "Firman Harian", body: "Bacaan hari ini: {passage} — \"{verse}\"" },
    { title: "Waktu dalam Firman", body: "\"{verse}\" — {passage} siap untukmu." },
    { title: "Bacaanmu Hari Ini", body: "{passage}. \"{verse}\"" },
    { title: "Firman Harian", body: "Buka hatimu untuk {passage} hari ini — \"{verse}\"" },
    { title: "Ayat untuk Hari Ini", body: "\"{verse}\" — Mulai harimu di {passage}." },
  ],
};

function getVerseSnippet(passage, lang) {
  const langSnippets = VERSE_SNIPPETS[lang] || VERSE_SNIPPETS.en;
  return langSnippets[passage] || VERSE_SNIPPETS.en[passage] || (lang === 'id' ? "Bacaan harianmu sudah siap." : "Your daily reading is ready.");
}

function getTemplate(lang) {
  const langTemplates = TEMPLATES[lang] || TEMPLATES.en;
  return langTemplates[Math.floor(Math.random() * langTemplates.length)];
}

function getTodaysPassage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return ALL_PASSAGES[dayOfYear % ALL_PASSAGES.length];
}

// Pre-compute current hour for each common timezone
function buildTimezoneHourCache() {
  const cache = {};
  const now = new Date();
  const commonTZs = [
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Sao_Paulo','America/Mexico_City','America/Bogota','America/Lima',
    'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Lisbon',
    'Africa/Johannesburg','Africa/Lagos','Africa/Nairobi',
    'Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Asia/Dubai',
    'Australia/Sydney','Pacific/Auckland','UTC'
  ];
  for (const tz of commonTZs) {
    try {
      const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now));
      cache[tz] = h;
    } catch (e) {}
  }
  return cache;
}

function getCurrentHour(timezone, tzCache) {
  if (tzCache[timezone] !== undefined) return tzCache[timezone];
  try {
    const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(new Date()));
    tzCache[timezone] = h;
    return h;
  } catch (e) {
    const etHour = new Date().getUTCHours() - 5;
    return (etHour + 24) % 24;
  }
}

function buildPayload(passage, lang) {
  const verse = getVerseSnippet(passage, lang);
  const template = getTemplate(lang);
  return JSON.stringify({
    title: template.title,
    body: template.body.replace("{passage}", passage).replace("{verse}", verse),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    url: "/",
    passage: passage
  });
}

exports.handler = async (event) => {
  const db = getSupabase();
  const passage = getTodaysPassage();

  const tzCache = buildTimezoneHourCache();

  // Cache payloads per language to avoid rebuilding for each subscriber
  const payloadCache = {};
  function getPayload(lang) {
    const key = lang || 'en';
    if (!payloadCache[key]) {
      payloadCache[key] = buildPayload(passage, key);
    }
    return payloadCache[key];
  }

  try {
    // Single query to get ALL active subscriptions — includes lang field if available
    const { data: subs, error } = await db.from("push_subscriptions")
      .select("id, subscription, timezone, preferred_hour, endpoint_hash, lang")
      .eq("active", true);

    if (error) throw error;

    let sent = 0, failed = 0, skipped = 0;
    const CONCURRENCY = 10;
    const expiredIds = [];

    // Process in batches of CONCURRENCY
    for (let i = 0; i < (subs || []).length; i += CONCURRENCY) {
      const batch = subs.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const currentHour = getCurrentHour(sub.timezone, tzCache);
          if (currentHour !== sub.preferred_hour) {
            return 'skipped';
          }
          const payload = getPayload(sub.lang);
          await webpush.sendNotification(sub.subscription, payload);
          return 'sent';
        })
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'fulfilled') {
          if (r.value === 'sent') sent++;
          else skipped++;
        } else {
          const err = r.reason;
          if (err && (err.statusCode === 410 || err.statusCode === 404)) {
            expiredIds.push(batch[j].id);
          }
          failed++;
        }
      }
    }

    // Cleanup expired subscriptions in one batch delete
    if (expiredIds.length > 0) {
      await db.from("push_subscriptions").delete().in("id", expiredIds);
    }

    const result = { sent, failed, skipped, expired: expiredIds.length, passage };
    console.log("Push send complete:", result);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error("Push send error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
