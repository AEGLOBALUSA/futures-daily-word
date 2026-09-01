/**
 * Today's Prayer — the short prayer that closes every Daily Word.
 *
 * Ashley's rule (1 Sep 2026): Today ends with a prayer, then one next step.
 *
 * ‼️ DRAFT STATUS: these are drafted in Ashley's voice and are awaiting his
 * sign-off. Only the days present here render a prayer block; the rest render
 * nothing rather than filler. Once the voice is approved, the remaining
 * devotional days (11–100) and pathway days (11–40) get the same treatment.
 *
 * Keys:
 *   `devotional:<n>` — n is the 1-based day into ALL_ASHLEY_JANE_DEVOTIONALS
 *   `pathway:<n>`    — n is the 1-based day of the 40-day faith pathway
 */

export interface Prayer {
  /** English */
  en: string;
  /** Indonesian — the devotional corpus is en + id only */
  id?: string;
}

const PRAYERS: Record<string, Prayer> = {
  // ── Ashley & Jane devotional, days 1–10 ──────────────────────────────────
  'devotional:1': {
    en: 'Father, I am not going to pretend I am not afraid. I am. But I am not handing fear the wheel today. You did not wire me to shrink. Walk with me into the thing I have been avoiding. Amen.',
    id: 'Bapa, aku tidak akan berpura-pura bahwa aku tidak takut. Aku takut. Tetapi hari ini aku tidak menyerahkan kemudi kepada ketakutan. Engkau tidak menciptakan aku untuk mengkeret. Berjalanlah bersamaku menuju hal yang selama ini kuhindari. Amin.',
  },
  'devotional:2': {
    en: 'Lord, You did not tell me to calm down. You told me You are with me. So I take You at Your word this morning — hold me up, strengthen me, and quiet what my mind keeps replaying. Amen.',
    id: 'Tuhan, Engkau tidak menyuruhku untuk tenang. Engkau berkata bahwa Engkau menyertaiku. Maka pagi ini aku memegang firman-Mu — topanglah aku, kuatkanlah aku, dan tenangkanlah apa yang terus diputar ulang oleh pikiranku. Amin.',
  },
  'devotional:3': {
    en: 'God, waiting is harder than working. Build in me the thing that only silence can build. And while I wait, keep me from mistaking Your quiet for Your absence. Amen.',
    id: 'Tuhan, menunggu lebih sulit daripada bekerja. Bangunlah dalam diriku apa yang hanya bisa dibangun oleh keheningan. Dan selama aku menunggu, jagalah aku agar tidak salah mengira diam-Mu sebagai ketidakhadiran-Mu. Amin.',
  },
  'devotional:4': {
    en: 'Jesus, thank You that grace does not just forgive the old story — it writes a new one. Help me live today as the person You have already made me, not the one I keep apologising for. Amen.',
    id: 'Yesus, terima kasih karena kasih karunia tidak hanya mengampuni kisah yang lama — ia menulis yang baru. Tolong aku menjalani hari ini sebagai pribadi yang telah Engkau jadikan, bukan pribadi yang terus-menerus kuminta maafkan. Amin.',
  },
  'devotional:5': {
    en: 'Father, I have been carrying things I was never asked to carry. I put them down here. Take what is Yours, and give me back the strength I have been spending on worry. Amen.',
    id: 'Bapa, aku telah memikul hal-hal yang tidak pernah diminta untuk kupikul. Aku meletakkannya di sini. Ambillah apa yang menjadi milik-Mu, dan kembalikan kekuatan yang selama ini kuhabiskan untuk kekhawatiran. Amin.',
  },
  'devotional:6': {
    en: 'Lord, You see me. Not just my situation — my heart, and the part of it nobody else has heard. Thank You that I have never once been invisible to You. Amen.',
    id: 'Tuhan, Engkau melihatku. Bukan hanya keadaanku — tetapi hatiku, dan bagian yang belum pernah didengar siapa pun. Terima kasih karena aku tidak pernah sekali pun tidak terlihat oleh-Mu. Amin.',
  },
  'devotional:7': {
    en: 'God, give me courage that is not loud. The kind that shows up, tells the truth, and stays. That is the kind I need today. Amen.',
    id: 'Tuhan, berilah aku keberanian yang tidak berisik. Keberanian yang hadir, mengatakan kebenaran, dan tetap tinggal. Itulah yang kubutuhkan hari ini. Amin.',
  },
  'devotional:8': {
    en: 'Father, keep me near the water. Not near the noise, not near the hustle — near You. Let my roots go down further today than they did yesterday. Amen.',
    id: 'Bapa, jagalah aku tetap dekat dengan sumber air. Bukan dekat dengan kebisingan, bukan dekat dengan kesibukan — tetapi dekat dengan-Mu. Biarlah akarku hari ini menghunjam lebih dalam daripada kemarin. Amin.',
  },
  'devotional:9': {
    en: 'Jesus, You had authority and You used it to serve. Teach me to carry whatever You have given me the same way — open hands, steady voice, no need to prove anything. Amen.',
    id: 'Yesus, Engkau memiliki otoritas dan Engkau menggunakannya untuk melayani. Ajarilah aku membawa apa pun yang Engkau berikan dengan cara yang sama — tangan terbuka, suara yang mantap, tanpa perlu membuktikan apa pun. Amin.',
  },
  'devotional:10': {
    en: 'Lord, I do not need the whole map. I need the next step, and I need You on it with me. Show me that, and I will take it. Amen.',
    id: 'Tuhan, aku tidak membutuhkan seluruh peta. Aku membutuhkan langkah berikutnya, dan aku membutuhkan Engkau bersamaku di dalamnya. Tunjukkan itu kepadaku, dan aku akan melangkah. Amin.',
  },

  // ── Faith Pathway (new to faith), days 1–10 ──────────────────────────────
  'pathway:1': {
    en: 'God, I am not here because I got my life together. I am here because You did not wait for me to. Thank You for grace. Teach me to live in it. Amen.',
  },
  'pathway:2': {
    en: 'Father, thank You that I am not a project to You — I am family. Help me believe that on the days it does not feel true. Amen.',
  },
  'pathway:3': {
    en: 'Jesus, I want to actually know You, not just know about You. Start that today, in whatever way I can handle. Amen.',
  },
  'pathway:4': {
    en: 'God, I do not really know how to pray. So this is it — I am talking to You. Thank You that this counts. Amen.',
  },
  'pathway:5': {
    en: 'Lord, thank You that forgiveness is finished, not pending. Help me stop re-paying a debt You already cleared. Amen.',
  },
  'pathway:6': {
    en: 'Father, when the Bible feels confusing, keep me reading anyway. Show me one thing today that I can actually use. Amen.',
  },
  'pathway:7': {
    en: 'God, You call me Yours. Let that be the loudest voice in my head today — louder than the old names I still answer to. Amen.',
  },
  'pathway:8': {
    en: 'Jesus, I do not want to do this alone. Lead me to people who will walk it with me, and make me brave enough to say yes. Amen.',
  },
  'pathway:9': {
    en: 'Lord, change happens with You, not before You. Do the work in me at the pace You know I can take. Amen.',
  },
  'pathway:10': {
    en: 'Father, ten days ago I was not sure about any of this. Thank You for meeting me. Keep me walking. Amen.',
  },
};

/** Returns the prayer for a key, localized, or null when none is drafted yet. */
export function getPrayer(key: string, lang: string): string | null {
  const p = PRAYERS[key];
  if (!p) return null;
  if (lang === 'id' && p.id) return p.id;
  return p.en;
}
