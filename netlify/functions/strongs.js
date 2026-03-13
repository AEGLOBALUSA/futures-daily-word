// Strongs concordance lookup
// Uses a compact inline dataset for the most common NT Greek & OT Hebrew words.
// For words not in the inline set, falls back to the Open Scriptures API.

const COMMON_NT = {
  G25:  { word: 'ἀγαπάω', tr: 'agapaō', def: 'to love', full: 'To love in a moral sense; the highest form of love, unconditional and self-sacrificing. Distinct from phileo (friendship love) or eros (romantic love).', usage: 'Used 143 times in NT' },
  G26:  { word: 'ἀγάπη', tr: 'agapē', def: 'love (unconditional)', full: 'The noun form of agapaō. Describes the love of God for humanity and the love believers are called to show one another. The defining characteristic of Christian life (John 13:35).', usage: 'Used 116 times in NT' },
  G3056: { word: 'λόγος', tr: 'logos', def: 'word, message, reason', full: 'From legō (to speak). Can mean a spoken word, a message, a topic, an account, or reason/logic. In John 1:1, refers to the pre-existent Christ as the divine Word.', usage: 'Used 330 times in NT' },
  G4102: { word: 'πίστις', tr: 'pistis', def: 'faith, trust, belief', full: 'From peitho (to persuade). Denotes trust, confidence, faithfulness. In Paul, saving faith is the means by which righteousness is received (Romans 3:22).', usage: 'Used 243 times in NT' },
  G5485: { word: 'χάρις', tr: 'charis', def: 'grace, favour', full: 'Unmerited divine favour. The free and undeserved gift of God to humanity. Related to chara (joy) — grace produces joy. Central to Pauline theology.', usage: 'Used 155 times in NT' },
  G1515: { word: 'εἰρήνη', tr: 'eirēnē', def: 'peace, wholeness', full: 'More than absence of conflict — the Hebrew concept of shalom expressed in Greek: completeness, well-being, harmony with God and others.', usage: 'Used 92 times in NT' },
  G2316: { word: 'θεός', tr: 'theos', def: 'God, deity', full: 'The standard Greek word for God. Used of the God of Israel and of Jesus (John 1:1, 20:28). Can also refer to false gods in some contexts.', usage: 'Used 1,317 times in NT' },
  G2962: { word: 'κύριος', tr: 'kyrios', def: 'Lord, master, owner', full: 'Used as a title of respect, ownership, or divine authority. Applied to Jesus as Lord (Acts 2:36) and as the equivalent of the OT divine name YHWH.', usage: 'Used 717 times in NT' },
  G4983: { word: 'σῶμα', tr: 'sōma', def: 'body', full: 'Physical body, but in Paul also the whole person in their physical existence. The body is the temple of the Holy Spirit (1 Cor 6:19).', usage: 'Used 142 times in NT' },
  G4151: { word: 'πνεῦμα', tr: 'pneuma', def: 'spirit, breath, wind', full: 'Breath or wind (literal), but most often the spirit — human spirit, angelic beings, or the Holy Spirit. Context determines which meaning is intended.', usage: 'Used 379 times in NT' },
  G5590: { word: 'ψυχή', tr: 'psychē', def: 'soul, life, self', full: 'The inner life, the self, or the eternal soul. Jesus distinguishes psychē (soul) from sōma (body) in Matthew 10:28. Source of the English word "psychology".', usage: 'Used 103 times in NT' },
};

const COMMON_OT = {
  H157:  { word: 'אָהַב', tr: 'ahav', def: 'to love', full: 'The primary Hebrew word for love, encompassing affection, loyalty, and covenant faithfulness. Used of God\'s love for Israel (Deuteronomy 7:8) and human love.', usage: 'Used 208 times in OT' },
  H2617: { word: 'חֶסֶד', tr: 'hesed', def: 'steadfast love, kindness, mercy', full: 'One of the most significant OT theological words. Combines love, loyalty, faithfulness, and covenant commitment. Often translated "lovingkindness" or "steadfast love". Describes God\'s covenant character (Psalm 136).', usage: 'Used 248 times in OT' },
  H7965: { word: 'שָׁלוֹם', tr: 'shalom', def: 'peace, wholeness, well-being', full: 'Far richer than just "no conflict" — encompasses health, prosperity, completeness, harmony, and right relationship with God. Used as a greeting and as a description of God\'s kingdom.', usage: 'Used 237 times in OT' },
  H3068: { word: 'יְהוָה', tr: 'YHWH', def: 'The LORD (divine name)', full: 'The personal name of God revealed to Moses (Exodus 3:14). Traditionally not spoken aloud; replaced in reading with Adonai (Lord). Related to the verb "to be" — I AM WHO I AM.', usage: 'Used 6,828 times in OT' },
  H571:  { word: 'אֶמֶת', tr: 'emet', def: 'truth, faithfulness, reliability', full: 'Truth as something solid and dependable, not merely factually correct. God\'s emet means his word can be trusted absolutely. Related to amen.', usage: 'Used 127 times in OT' },
  H8416: { word: 'תְּהִלָּה', tr: 'tehillah', def: 'praise, song of praise', full: 'Spontaneous praise arising from the heart. The plural tehillim gives us the title of the Psalms. Distinguished from todah (thanksgiving) by its more spontaneous, celebratory character.', usage: 'Used 57 times in OT' },
  H539:  { word: 'אָמַן', tr: 'aman', def: 'to confirm, support, be faithful', full: 'The root behind "amen." Means to be firm, established, reliable. When applied to God, it speaks of his absolute faithfulness. The amen at the end of prayer affirms this truth.', usage: 'Used 97 times in OT' },
  H1288: { word: 'בָּרַךְ', tr: 'barak', def: 'to bless, kneel', full: 'To bestow favour, prosperity, or divine power. God blesses humans (Genesis 1:28); humans bless God (Psalm 103:1) meaning to praise or honour him. Source of "Baruch" (blessed).', usage: 'Used 330 times in OT' },
};

export const handler = async (event) => {
  const params = event.queryStringParameters || {};
  const num = (params.num || '').toUpperCase();
  const testament = (params.testament || 'NT').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  };

  // Check inline dataset first
  const dataset = testament === 'OT' ? COMMON_OT : COMMON_NT;
  if (dataset[num]) {
    const e = dataset[num];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        word: e.word,
        transliteration: e.tr,
        definition: e.def,
        fullDefinition: e.full,
        usage: e.usage,
      }),
    };
  }

  // Fallback: try Open Scriptures Strongs API
  try {
    const lang = testament === 'OT' ? 'hebrew' : 'greek';
    const numOnly = num.replace(/^[GH]/, '');
    const resp = await fetch(`https://openscriptures.github.io/strongs/entries/${lang}/${numOnly}.json`);
    if (resp.ok) {
      const data = await resp.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          word: data.lemma || data.unicode || num,
          transliteration: data.translit || '',
          definition: data.strongs_def || data.kjv_def || 'See full entry',
          fullDefinition: data.derivation || '',
          usage: '',
        }),
      };
    }
  } catch {}

  // Final fallback
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      word: num,
      transliteration: '',
      definition: 'Definition not available offline',
      fullDefinition: 'For a full definition, search this word in a Strongs concordance.',
      usage: '',
    }),
  };
};
