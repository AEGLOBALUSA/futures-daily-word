/**
 * Persona Pathway Configuration — V7
 * Drives all feature gating, section ordering, and AI personalization.
 */

export type Persona = 'new_to_faith' | 'congregation' | 'deeper_study' | 'pastor_leader' | 'comfort';

export interface PersonaConfig {
  persona: Persona;
  label: string;
  description: string;
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
  };
}

// ─── Greeting helpers ──────────────────────────────────────────────

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function getGreeting(persona: Persona, name: string, streak: number): string {
  const first = name || 'friend';
  switch (persona) {
    case 'new_to_faith':
      return `Welcome, ${first}. We're glad you're here.`;
    case 'congregation':
      return streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak} streak!`
        : `Good ${timeOfDay()}, ${first}.`;
    case 'deeper_study':
      return streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak}.`
        : `Good ${timeOfDay()}, ${first}.`;
    case 'pastor_leader':
      return streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak}.`
        : `Good ${timeOfDay()}, Pastor ${first}.`;
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
      return `Good ${timeOfDay()}, ${first}.`;
  }
}

// ─── Persona Configs ───────────────────────────────────────────────

export const PERSONA_CONFIGS: Record<Persona, PersonaConfig> = {

  // ── 1. NEW TO FAITH ─────────────────────────────────────────────
  new_to_faith: {
    persona: 'new_to_faith',
    label: "I'm New to This",
    description: 'Starting or reigniting my faith journey',
    icon: 'Sprout',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'devotion',
      'ai_prompt',
      'faith_pathway',
      'scripture',
      'daily_quote',
    ],
    features: {
      commentary: 'hidden',
      greekHebrew: 'hidden',
      highlighting: 'none',
      verseSelection: false,
      wordOfDay: 'hidden',
      campusCount: 'hidden',
      weeklyReview: false,
      pollBanner: false,
      searchEnabled: false,
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
    },
  },

  // ── 2. CONGREGATION MEMBER ──────────────────────────────────────
  congregation: {
    persona: 'congregation',
    label: 'Church Member',
    description: 'Growing in my daily walk with God',
    icon: 'Users',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'poll_banner',
      'devotion',
      'ai_prompt',
      'campus_count',
      'scripture',
      'word_of_day',
      'daily_quote',
      'weekly_review',
      'plans_preview',
      'commentary',
    ],
    features: {
      commentary: 'collapsed',
      greekHebrew: 'simplified',
      highlighting: 'basic',
      verseSelection: true,
      wordOfDay: 'simplified',
      campusCount: 'simple',
      weeklyReview: true,
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
    },
  },

  // ── 3. DEEPER BIBLE STUDY ───────────────────────────────────────
  deeper_study: {
    persona: 'deeper_study',
    label: 'Deep Bible Study',
    description: 'Original languages, commentary, depth',
    icon: 'BookOpen',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'poll_banner',
      'devotion',
      'ai_prompt',
      'scripture',
      'commentary',
      'word_of_day',
      'daily_quote',
      'weekly_review',
      'plans_preview',
    ],
    features: {
      commentary: 'expanded',
      greekHebrew: 'full',
      highlighting: 'full',
      verseSelection: true,
      wordOfDay: 'full',
      campusCount: 'simple',
      weeklyReview: true,
      pollBanner: true,
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
    },
  },

  // ── 4. LEADER / PASTOR ──────────────────────────────────────────
  pastor_leader: {
    persona: 'pastor_leader',
    label: 'Leader / Pastor',
    description: 'For leaders who serve and shepherd others',
    icon: 'Shield',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'poll_banner',
      'devotion',
      'ai_prompt',
      'scripture',
      'commentary',
      'word_of_day',
      'daily_quote',
      'weekly_review',
      'plans_preview',
      'congregation_stats',
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
      bookCards: [],
    },
    plans: {
      showFullCatalog: true,
      featuredCategories: ['leadership', 'deep-study', 'book-study'],
    },
    journal: {
      entryTypes: ['journal', 'sermon', 'saved', 'teaching-notes'],
      tags: ['reflection', 'prayer', 'gratitude', 'sermon', 'study', 'exegesis', 'word-study', 'cross-reference', 'teaching'],
      prompts: [],
    },
    library: {
      sections: ['essays', 'characters', 'locations', 'timeline', 'word-studies'],
    },
    ai: {
      systemPromptAddition:
        'This person is a church leader or pastor. When they ask about passages, also suggest teaching angles, sermon illustration ideas, and practical application points for a congregation. Think like a pastoral study companion.',
    },
  },

  // ── 5. COMFORT / DIFFICULT SEASON ──────────────────────────────
  comfort: {
    persona: 'comfort',
    label: 'I Need Comfort Right Now',
    description: 'Encouragement for a difficult season',
    icon: 'Heart',
    sectionOrder: [
      'greeting',
      'comfort_verse_banner',
      'hero_audio',
      'devotion',
      'ai_prompt',
      'comfort_card',
      'book_cards',
      'scripture',
      'daily_quote',
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
