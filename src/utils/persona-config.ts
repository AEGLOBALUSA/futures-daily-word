/**
 * Persona Pathway Configuration — V7
 * Drives all feature gating, section ordering, and AI personalization.
 */

export type Persona = 'new_to_faith' | 'congregation' | 'deeper_study' | 'pastor_leader' | 'comfort';

export interface PersonaConfig {
  persona: Persona;
  label: string;
  labelId?: string;
  description: string;
  descriptionId?: string;
  icon: string;

  /** Ordered list of home screen section IDs — only listed sections render */
  sectionOrder: string[];

  /** Feature visibility */
  features: {
    commentary: 'hidden' | 'collapsed' | 'expanded';
    greekHebrew: 'hidden' | 'simplified' | 'full';
    highlighting: 'none' | 'basic' | 'full';
    verseSelection: boolean;
    wordOfDay: 'hidden' | 'simplified' | 'full';
    campusCount: 'hidden' | 'simple' | 'detailed';
    weeklyReview: boolean;
    pollBanner: boolean;
    searchEnabled: boolean;
    videoRecording: boolean;
    sermonNotes: boolean;
    wordStudies: boolean;
    adminTools: boolean;
    comfortCard: boolean;
    faithPathway: boolean;
    bookCards: string[];
  };

  /** Plan filtering */
  plans: {
    showFullCatalog: boolean;
    featuredCategories: string[];
    autoSuggest?: string;
  };

  /** Journal config */
  journal: {
    entryTypes: string[];
    tags: string[];
    prompts: string[];
  };

  /** Library sections to show */
  library: {
    sections: string[];
  };

  /** AI system prompt addition */
  ai: {
    systemPromptAddition: string;
    systemPromptAdditionId?: string;
  };
}

// ─── Greeting helpers ──────────────────────────────────────────────

function timeOfDay(lang?: string): string {
  const h = new Date().getHours();
  if (lang === 'id') {
    if (h < 12) return 'pagi';
    if (h < 17) return 'siang';
    return 'sore';
  }
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getGreeting(persona: Persona, name: string, streak: number, lang?: string): string {
  const first = capitalize(name) || (lang === 'id' ? 'teman' : 'friend');
  const tod = timeOfDay(lang);

  if (lang === 'id') {
    switch (persona) {
      case 'new_to_faith':
        return `Selamat datang, ${first}. Kami senang Anda di sini.`;
      case 'congregation':
        return streak > 7
          ? `Selamat ${tod}, ${first}. ${streak} hari kuat!`
          : streak > 1
          ? `Selamat ${tod}, ${first}. Hari ${streak} — terus semangat.`
          : `Selamat ${tod}, ${first}. Senang Anda di sini.`;
      case 'deeper_study':
        return streak > 1
          ? `Selamat ${tod}, ${first}. Hari ${streak}.`
          : `Selamat ${tod}, ${first}.`;
      case 'pastor_leader':
        return streak > 30
          ? `Selamat ${tod}, ${first}. ${streak} hari. Anda memimpin dari cawan yang penuh.`
          : streak > 7
          ? `Selamat ${tod}, ${first}. Hari ${streak}. Waktu ini penting.`
          : streak > 1
          ? `Selamat ${tod}, ${first}. Hari ${streak}. Senang Anda di sini.`
          : `Selamat ${tod}, ${first}. Ini waktumu — bukan pelayanan, hanya kamu dan Tuhan.`;
      case 'comfort': {
        const comfortGreetings = [
          `Tuhan bersamamu hari ini, ${first}.`,
          `Kamu tidak sendirian, ${first}.`,
          `Dia memelukmu erat, ${first}.`,
          `Damai bersamamu, ${first}.`,
          `Kamu dikasihi, ${first}.`,
        ];
        return comfortGreetings[new Date().getDate() % comfortGreetings.length];
      }
      default:
        return `Selamat ${tod}, ${first}.`;
    }
  }

  switch (persona) {
    case 'new_to_faith':
      return `Welcome, ${first}. We're glad you're here.`;
    case 'congregation':
      return streak > 7
        ? `Good ${tod}, ${first}. ${streak} days strong!`
        : streak > 1
        ? `Good ${tod}, ${first}. Day ${streak} — keep going.`
        : `Good ${tod}, ${first}. Glad you're here.`;
    case 'deeper_study':
      return streak > 1
        ? `Good ${tod}, ${first}. Day ${streak}.`
        : `Good ${tod}, ${first}.`;
    case 'pastor_leader':
      return streak > 30
        ? `Good ${tod}, ${first}. ${streak} days. You're leading from a full cup.`
        : streak > 7
        ? `Good ${tod}, ${first}. Day ${streak}. This time matters.`
        : streak > 1
        ? `Good ${tod}, ${first}. Day ${streak}. Glad you're here.`
        : `Good ${tod}, ${first}. This is your time — not ministry, just you and God.`;
    case 'comfort': {
      const comfortGreetings = [
        `God is with you today, ${first}.`,
        `You are not alone, ${first}.`,
        `He holds you close, ${first}.`,
        `Peace be with you, ${first}.`,
        `You are loved, ${first}.`,
      ];
      return comfortGreetings[new Date().getDate() % comfortGreetings.length];
    }
    default:
      return `Good ${tod}, ${first}.`;
  }
}

// ─── Persona Configs ───────────────────────────────────────────────

export const PERSONA_CONFIGS: Record<Persona, PersonaConfig> = {

  // ── 1. NEW TO FAITH ─────────────────────────────────────────────
  new_to_faith: {
    persona: 'new_to_faith',
    label: "I'm New to This",
    labelId: 'Saya Baru',
    description: 'Starting or reigniting my faith journey',
    descriptionId: 'Memulai atau menghidupkan kembali perjalanan iman saya',
    icon: 'Sprout',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'plan_scripture',
      'scripture',
      'ai_prompt',
      'faith_pathway',
    ],
    features: {
      commentary: 'hidden',
      greekHebrew: 'hidden',
      highlighting: 'basic',
      verseSelection: false,
      wordOfDay: 'hidden',
      campusCount: 'hidden',
      weeklyReview: false,
      pollBanner: false,
      searchEnabled: true,
      videoRecording: false,
      sermonNotes: false,
      wordStudies: false,
      adminTools: false,
      comfortCard: false,
      faithPathway: true,
      bookCards: [],
    },
    plans: {
      showFullCatalog: false,
      featuredCategories: ['beginner', 'devotional'],
      autoSuggest: 'faith-pathway',
    },
    journal: {
      entryTypes: ['journal', 'prayer'],
      tags: ['reflection', 'prayer'],
      prompts: ['What stood out to you today?', 'Write a prayer about what you read.'],
    },
    library: {
      sections: ['characters', 'timeline', 'essays'],
    },
    ai: {
      systemPromptAddition:
        'The user is new to Christianity. Use simple, warm language. No theological jargon. No Greek or Hebrew. Explain concepts like you\'re talking to a curious friend who just started exploring faith. Always be encouraging. If they ask a hard question, be honest but gentle.',
      systemPromptAdditionId:
        'Pengguna ini baru mengenal Kekristenan. Gunakan bahasa yang sederhana dan hangat. Tidak ada jargon teologis. Tidak ada bahasa Yunani atau Ibrani. Jelaskan konsep seperti Anda berbicara kepada teman yang penasaran dan baru mulai mengeksplorasi iman. Selalu beri semangat. Jika mereka bertanya pertanyaan yang sulit, jujurlah tapi lembut.',
    },
  },

  // ── 2. CONGREGATION MEMBER ──────────────────────────────────────
  congregation: {
    persona: 'congregation',
    label: 'Church Member',
    labelId: 'Anggota Gereja',
    description: 'Growing in my daily walk with God',
    descriptionId: 'Bertumbuh dalam perjalanan harian saya bersama Tuhan',
    icon: 'Users',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'plan_scripture',
      'scripture',
      'poll_banner',
      'devotion',
      'devotion_scripture',
      'ai_prompt',
      'campus_count',
    ],
    features: {
      commentary: 'collapsed',
      greekHebrew: 'hidden',
      highlighting: 'basic',
      verseSelection: true,
      wordOfDay: 'hidden',
      campusCount: 'simple',
      weeklyReview: false,
      pollBanner: true,
      searchEnabled: true,
      videoRecording: true,
      sermonNotes: true,
      wordStudies: false,
      adminTools: false,
      comfortCard: false,
      faithPathway: false,
      bookCards: [],
    },
    plans: {
      showFullCatalog: true,
      featuredCategories: ['topical', 'devotional'],
    },
    journal: {
      entryTypes: ['journal', 'sermon', 'saved'],
      tags: ['reflection', 'prayer', 'gratitude', 'sermon', 'study'],
      prompts: [],
    },
    library: {
      sections: ['essays', 'characters', 'locations', 'timeline'],
    },
    ai: {
      systemPromptAddition:
        'The user is a church member growing in their faith. Give thorough but accessible answers. Avoid heavy academic language unless they specifically ask. Focus on practical application and daily life.',
      systemPromptAdditionId:
        'Pengguna ini adalah anggota gereja yang bertumbuh dalam imannya. Berikan jawaban yang menyeluruh tapi mudah diakses. Hindari bahasa akademis yang berat kecuali mereka secara khusus memintanya. Fokus pada penerapan praktis dan kehidupan sehari-hari.',
    },
  },

  // ── 3. DEEPER BIBLE STUDY ───────────────────────────────────────
  deeper_study: {
    persona: 'deeper_study',
    label: 'Deep Bible Study',
    labelId: 'Studi Alkitab Mendalam',
    description: 'Original languages, commentary, depth',
    descriptionId: 'Bahasa asli, komentar, kedalaman',
    icon: 'BookOpen',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'plan_scripture',
      'scripture',
      'commentary',
      'ai_prompt',
    ],
    features: {
      commentary: 'expanded',
      greekHebrew: 'full',
      highlighting: 'full',
      verseSelection: true,
      wordOfDay: 'full',
      campusCount: 'hidden',
      weeklyReview: false,
      pollBanner: false,
      searchEnabled: true,
      videoRecording: true,
      sermonNotes: true,
      wordStudies: true,
      adminTools: false,
      comfortCard: false,
      faithPathway: false,
      bookCards: [],
    },
    plans: {
      showFullCatalog: true,
      featuredCategories: ['deep-study', 'book-study', 'topical'],
    },
    journal: {
      entryTypes: ['journal', 'sermon', 'saved'],
      tags: ['reflection', 'prayer', 'gratitude', 'sermon', 'study', 'exegesis', 'word-study', 'cross-reference'],
      prompts: [],
    },
    library: {
      sections: ['essays', 'characters', 'locations', 'timeline', 'word-studies'],
    },
    ai: {
      systemPromptAddition:
        'The user wants deep Bible study. Include Greek/Hebrew context when relevant. Provide cross-references. Reference scholarly perspectives. Give depth — they can handle it and they want it.',
      systemPromptAdditionId:
        'Pengguna ini menginginkan studi Alkitab yang mendalam. Sertakan konteks Yunani/Ibrani jika relevan. Berikan referensi silang. Rujuk perspektif akademis. Berikan kedalaman — mereka bisa menanganinya dan mereka menginginkannya.',
    },
  },

  // ── 4. LEADER / PASTOR ──────────────────────────────────────────
  pastor_leader: {
    persona: 'pastor_leader',
    label: 'Leader / Pastor',
    labelId: 'Pemimpin / Pendeta',
    description: 'For leaders who serve and shepherd others',
    descriptionId: 'Untuk pemimpin yang melayani dan menggembalakan orang lain',
    icon: 'Shield',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'poll_banner',
      'devotion',
      'plan_scripture',
      'scripture',
      'pastoral_prompt',
      'commentary',
      'ai_prompt',
      'campus_count',
      'congregation_stats',
      'book_cards',
    ],
    features: {
      commentary: 'expanded',
      greekHebrew: 'full',
      highlighting: 'full',
      verseSelection: true,
      wordOfDay: 'full',
      campusCount: 'detailed',
      weeklyReview: true,
      pollBanner: true,
      searchEnabled: true,
      videoRecording: true,
      sermonNotes: true,
      wordStudies: true,
      adminTools: true,
      comfortCard: false,
      faithPathway: false,
      bookCards: ['grace-and-truth', 'no-more-fear'],
    },
    plans: {
      showFullCatalog: true,
      featuredCategories: ['leadership', 'deep-study', 'book-study', 'topical', 'devotional', 'beginner', 'comfort'],
    },
    journal: {
      entryTypes: ['journal', 'sermon', 'saved', 'teaching-notes'],
      tags: ['reflection', 'prayer', 'gratitude', 'sermon', 'study', 'exegesis', 'word-study', 'cross-reference', 'teaching'],
      prompts: [
        'You already know the big decision you need God to confirm. What is it?',
        'Who has God put on your mind today that needs prayer? Name them.',
        'What have you already been believing God for this Sunday?',
        'You know what God is building through your church. What\'s the next step you need to take?',
        'Who has God already put on your heart to reach out to this week?',
        'What\'s the one thing you\'ve been asking God to move on in your church?',
        'Something stood out to you in today\'s reading. What was it — and how does it connect to what you\'re leading right now?',
        'You already know the area of ministry that needs fresh direction. What is it?',
        'Who on your staff have you already been thinking about developing? What\'s the first move?',
        'What has God been saying to you about the vision for your church? Write it down.',
        'If God moved in one thing this week, you already know what it would be. Name it.',
        'You\'re either making disciple-makers or running programs. Which one is it right now — and what needs to shift?',
        'There\'s a conversation you\'ve been putting off. Who is it with and what\'s it about?',
        'Think back to what God originally called you to. How does today connect to that?',
        'Name one person on your staff team. What are you praying over them this week?',
      ],
    },
    library: {
      sections: ['essays', 'characters', 'locations', 'timeline', 'word-studies'],
    },
    ai: {
      systemPromptAddition:
        'This person is a pastor or church leader. Think like a sharp, experienced ministry partner — not a counselor. When they ask about passages, offer teaching angles, sermon illustrations, and application points for their congregation. When they share what\'s on their mind, engage with vision, strategy, and direction — not feelings. Ask about their church, their team, their next steps. Over time, notice patterns in the decisions they\'re making, the people they\'re praying for, and the vision they\'re pursuing — and ask follow-up questions that show you\'re tracking with them. Help them connect their Bible reading to the actual work of ministry. Be the companion who thinks with them about what God is building through their church.',
      systemPromptAdditionId:
        'Orang ini adalah pendeta atau pemimpin gereja. Berpikirlah seperti mitra pelayanan yang tajam dan berpengalaman — bukan konselor. Ketika mereka bertanya tentang bagian Alkitab, tawarkan sudut pandang pengajaran, ilustrasi khotbah, dan poin penerapan untuk jemaat mereka. Ketika mereka berbagi apa yang ada di pikiran mereka, terlibatlah dengan visi, strategi, dan arah — bukan perasaan. Tanyakan tentang gereja mereka, tim mereka, langkah selanjutnya. Seiring waktu, perhatikan pola dalam keputusan yang mereka buat, orang yang mereka doakan, dan visi yang mereka kejar — dan ajukan pertanyaan lanjutan yang menunjukkan Anda mengikuti mereka. Bantu mereka menghubungkan bacaan Alkitab dengan pekerjaan pelayanan yang sebenarnya. Jadilah rekan yang berpikir bersama mereka tentang apa yang Tuhan bangun melalui gereja mereka.',
    },
  },

  // ── 5. COMFORT / DIFFICULT SEASON ──────────────────────────────
  comfort: {
    persona: 'comfort',
    label: 'I Need Comfort Right Now',
    labelId: 'Saya Butuh Penghiburan Sekarang',
    description: 'Encouragement for a difficult season',
    descriptionId: 'Dorongan untuk musim yang sulit',
    icon: 'Heart',
    sectionOrder: [
      'greeting',
      'comfort_verse_banner',
      'hero_audio',
      'plan_scripture',
      'scripture',
      'comfort_scripture',
      'ai_prompt',
      'comfort_card',
      'book_cards',
    ],
    features: {
      commentary: 'hidden',
      greekHebrew: 'hidden',
      highlighting: 'basic',
      verseSelection: false,
      wordOfDay: 'hidden',
      campusCount: 'hidden',
      weeklyReview: false,
      pollBanner: false,
      searchEnabled: true,
      videoRecording: false,
      sermonNotes: false,
      wordStudies: false,
      adminTools: false,
      comfortCard: true,
      faithPathway: false,
      bookCards: ['grace-and-truth', 'no-more-fear'],
    },
    plans: {
      showFullCatalog: false,
      featuredCategories: ['comfort', 'devotional'],
      autoSuggest: 'psalms-brokenhearted',
    },
    journal: {
      entryTypes: ['journal', 'prayer'],
      tags: ['reflection', 'prayer'],
      prompts: ["What's on your heart today?", 'Write a prayer to God about what you\'re feeling.'],
    },
    library: {
      sections: ['essays', 'characters', 'timeline'],
    },
    ai: {
      systemPromptAddition:
        'This person is going through a difficult time. Be warm, compassionate, and encouraging above all. Lead with comfort before teaching. Use scripture to bring hope, not to lecture. Keep responses shorter and gentler. If they express deep distress, gently encourage them to talk to their pastor or a trusted friend.',
      systemPromptAdditionId:
        'Orang ini sedang melewati masa yang sulit. Bersikaplah hangat, penuh kasih, dan memberi semangat di atas segalanya. Dahulukan penghiburan sebelum pengajaran. Gunakan Kitab Suci untuk membawa harapan, bukan untuk menggurui. Buat respons lebih pendek dan lebih lembut. Jika mereka mengungkapkan kesedihan yang mendalam, dengan lembut dorong mereka untuk berbicara dengan pendeta atau teman yang dipercaya.',
    },
  },
};

// ─── Migration map from old persona values ─────────────────────────

export const PERSONA_MIGRATION: Record<string, Persona> = {
  new_returning: 'new_to_faith',
  pastor: 'pastor_leader',
  deeper: 'deeper_study',
  difficult: 'comfort',
  // New values map to themselves
  new_to_faith: 'new_to_faith',
  congregation: 'congregation',
  deeper_study: 'deeper_study',
  pastor_leader: 'pastor_leader',
  comfort: 'comfort',
};

// ─── Helper ────────────────────────────────────────────────────────

export function getPersonaConfig(persona?: string | null): PersonaConfig {
  if (!persona) return PERSONA_CONFIGS.congregation;
  const migrated = PERSONA_MIGRATION[persona];
  if (migrated) return PERSONA_CONFIGS[migrated];
  return PERSONA_CONFIGS.congregation;
}

export const ALL_PERSONAS: Persona[] = [
  'new_to_faith',
  'congregation',
  'deeper_study',
  'pastor_leader',
  'comfort',
];
