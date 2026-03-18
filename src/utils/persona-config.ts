/**
 * Persona Pathway Configuration â V7
 * Drives all feature gating, section ordering, and AI personalization.
 */

export type Persona = 'new_to_faith' | 'congregation' | 'deeper_study' | 'pastor_leader' | 'comfort';

export interface PersonaConfig {
  persona: Persona;
  label: string;
  description: string;
  icon: string;

  /** Ordered list of home screen section IDs â only listed sections render */
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

// âââ Greeting helpers ââââââââââââââââââââââââââââââââââââââââââââââ

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getGreeting(persona: Persona, name: string, streak: number): string {
  const first = capitalize(name) || 'friend';
  switch (persona) {
    case 'new_to_faith':
      return `Welcome, ${first}. We're glad you're here.`;
    case 'congregation':
      return streak > 7
        ? `Good ${timeOfDay()}, ${first}. ${streak} days strong!`
        : streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak} â keep going.`
        : `Good ${timeOfDay()}, ${first}. Glad you're here.`;
    case 'deeper_study':
      return streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak}.`
        : `Good ${timeOfDay()}, ${first}.`;
    case 'pastor_leader':
      return streak > 30
        ? `Good ${timeOfDay()}, ${first}. ${streak} days. You're leading from a full cup.`
        : streak > 7
        ? `Good ${timeOfDay()}, ${first}. Day ${streak}. This time matters.`
        : streak > 1
        ? `Good ${timeOfDay()}, ${first}. Day ${streak}. Glad you're here.`
        : `Good ${timeOfDay()}, ${first}. This is your time â not ministry, just you and God.`;
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

// âââ Persona Configs âââââââââââââââââââââââââââââââââââââââââââââââ

export const PERSONA_CONFIGS: Record<Persona, PersonaConfig> = {

  // ââ 1. NEW TO FAITH âââââââââââââââââââââââââââââââââââââââââââââ
  new_to_faith: {
    persona: 'new_to_faith',
    label: "I'm New to This",
    description: 'Starting or reigniting my faith journey',
    icon: 'Sprout',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'ai_prompt',
      'faith_pathway',
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
    },
  },

  // ââ 2. CONGREGATION MEMBER ââââââââââââââââââââââââââââââââââââââ
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
      'devotion_scripture',
      'ai_prompt',
      'campus_count',
      'daily_quote',
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
    },
  },

  // ââ 3. DEEPER BIBLE STUDY âââââââââââââââââââââââââââââââââââââââ
  deeper_study: {
    persona: 'deeper_study',
    label: 'Deep Bible Study',
    description: 'Original languages, commentary, depth',
    icon: 'BookOpen',
    sectionOrder: [
      'greeting',
      'hero_audio',
      'plan_scripture',
      'commentary',
      'word_of_day',
      'ai_prompt',
      'daily_quote',
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
        'The user wants deep Bible study. Include Greek/Hebrew context when relevant. Provide cross-references. Reference scholarly perspectives. Give depth â they can handle it and they want it.',
    },
  },

  // ââ 4. LEADER / PASTOR ââââââââââââââââââââââââââââââââââââââââââ
  pastor_leader: {
    persona: 'pastor_leader',
    label: 'Leader / Pastor',
    description: 'For leaders who serve and shepherd others',
    icon: 'Shield',
    sectionOrder: [
      'greeting',
      'comfort_verse_banner',
      'hero_audio',
      'poll_banner',
      'devotion',
      'devotion_scripture',
      'plan_scripture',
      'comfort_scripture',
      'pastoral_prompt',
      'commentary',
      'word_of_day',
      'faith_pathway',
      'ai_prompt',
      'campus_count',
      'congregation_stats',
      'comfort_card',
      'book_cards',
      'daily_quote',
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
      comfortCard: true,
      faithPathway: true,
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
        'Something stood out to you in today\'s reading. What was it â and how does it connect to what you\'re leading right now?',
        'You already know the area of ministry that needs fresh direction. What is it?',
        'Who on your staff have you already been thinking about developing? What\'s the first move?',
        'What has God been saying to you about the vision for your church? Write it down.',
        'If God moved in one thing this week, you already know what it would be. Name it.',
        'You\'re either making disciple-makers or running programs. Which one is it right now â and what needs to shift?',
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
        'This person is a pastor or church leader. Think like a sharp, experienced ministry partner â not a counselor. When they ask about passages, offer teaching angles, sermon illustrations, and application points for their congregation. When they share what\'s on their mind, engage with vision, strategy, and direction â not feelings. Ask about their church, their team, their next steps. Over time, notice patterns in the decisions they\'re making, the people they\'re praying for, and the vision they\'re pursuing â and ask follow-up questions that show you\'re tracking with them. Help them connect their Bible reading to the actual work of ministry. Be the companion who thinks with them about what God is building through their church.',
    },
  },

  // ââ 5. COMFORT / DIFFICULT SEASON ââââââââââââââââââââââââââââââ
  comfort: {
    persona: 'comfort',
    label: 'I Need Comfort Right Now',
    description: 'Encouragement for a difficult season',
    icon: 'Heart',
    sectionOrder: [
      'greeting',
      'comfort_verse_banner',
      'hero_audio',
      'comfort_scripture',
      'ai_prompt',
      'comfort_card',
      'book_cards',
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

// âââ Migration map from old persona values âââââââââââââââââââââââââ

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

// âââ Helper ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
