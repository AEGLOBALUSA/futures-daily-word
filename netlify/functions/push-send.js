const webpush = require("web-push");
const { getStore } = require("@netlify/blobs");

// VAPID keys for Daily Word
const VAPID_PUBLIC = "BGCv9F84OHjOwReUpXbnO_Ctqoz5Yn3uXyFOT8QNoRZHQFE4xggkftXRDuk0vdjGZk3SskeR84Pqn41VSpBROdU";
const VAPID_PRIVATE = "rItkPW_hJr8ajUtXlrau88W4WYlHE9PMTPOvAruu2Ws";

webpush.setVapidDetails("mailto:ashleymarkevans@me.com", VAPID_PUBLIC, VAPID_PRIVATE);

// Passage pool — matches the app's PERSONA_MAP structure
const ALL_PASSAGES = [
  "Psalms 23","Romans 8","John 3","Philippians 4","Isaiah 40","Genesis 1","Matthew 5",
  "Psalms 91","1 Corinthians 13","John 1","Proverbs 3","Ephesians 6","Hebrews 11",
  "Romans 12","Isaiah 55","Matthew 6","Psalms 119","James 1","Galatians 5","Colossians 3",
  "John 15","Revelation 1","Joshua 1","2 Timothy 1","1 Peter 5","Psalms 1","Romans 5",
  "Jeremiah 29","Matthew 7","Luke 15","Psalms 27","Ephesians 2","Isaiah 53","John 14",
  "2 Corinthians 5","Psalms 139","Deuteronomy 31","Acts 2","1 John 4","Psalm 46"
];

// Key verse snippets for each passage — warm, inviting, drawn from the text
const VERSE_SNIPPETS = {
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
  "Psalm 46": "Be still, and know that I am God."
};

// Warm notification templates — {passage} and {verse} get replaced
const TEMPLATES = [
  { title: "Your Daily Reading", body: "{passage} — \"{verse}\"" },
  { title: "Good Morning", body: "{passage} is waiting for you — \"{verse}\"" },
  { title: "Daily Word", body: "Today's reading: {passage} — \"{verse}\"" },
  { title: "Time in the Word", body: "\"{verse}\" — {passage} is ready for you." },
  { title: "Your Reading Today", body: "{passage}. \"{verse}\"" },
  { title: "Daily Word", body: "Open your heart to {passage} today — \"{verse}\"" },
  { title: "Scripture for Today", body: "\"{verse}\" — Begin your day in {passage}." },
];

// Get today's passage based on day of year
function getTodaysPassage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const idx = dayOfYear % ALL_PASSAGES.length;
  return ALL_PASSAGES[idx];
}

// Check if it's roughly the right hour for a subscriber
function isTimeToNotify(timezone, preferredHour) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false
    });
    const currentHour = parseInt(formatter.format(now));
    return currentHour === preferredHour;
  } catch (e) {
    // If timezone is invalid, default to checking UTC-5 (ET)
    const etHour = new Date().getUTCHours() - 5;
    return ((etHour + 24) % 24) === preferredHour;
  }
}

// Scheduled function — runs every hour, checks who needs a notification
// Schedule: every hour at minute 0
exports.handler = async (event) => {
  const store = getStore("push-subscriptions");
  const passage = getTodaysPassage();
  const verse = VERSE_SNIPPETS[passage] || "Your daily reading is ready.";
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

  const payload = JSON.stringify({
    title: template.title,
    body: template.body.replace("{passage}", passage).replace("{verse}", verse),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    url: "/",
    passage: passage
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // List all subscriptions
    const { blobs } = await store.list();

    for (const blob of blobs) {
      try {
        const record = await store.get(blob.key, { type: "json" });
        if (!record || !record.active || !record.subscription) {
          skipped++;
          continue;
        }

        // Check if it's the right hour for this subscriber
        if (!isTimeToNotify(record.timezone, record.preferredHour)) {
          skipped++;
          continue;
        }

        // Send the notification
        await webpush.sendNotification(record.subscription, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — clean it up
          try { await store.delete(blob.key); } catch (e) {}
        }
        failed++;
      }
    }
  } catch (err) {
    console.error("Push send error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  const result = { sent, failed, skipped, passage };
  console.log("Push send complete:", result);
  return { statusCode: 200, body: JSON.stringify(result) };
};
