/**
 * Multilingual Semantic, Phonetic & Intent Engine
 * 
 * Supports:
 * - English, Bengali, Hindi, and code-switching (Banglish, Hinglish, Bengali + English, Hindi + English)
 * - Broken English, grammatically incorrect sentences, incomplete queries
 * - Approximate pronunciations, phonetic variations, and transliteration
 * - Semantic category/type extraction (distinguishing categories from place names)
 * - Conversational context ("Which one is closest?", "How far is the first one?")
 * - Category extraction for 14+ geospatial entity types
 * - Intelligent clarification generation for ambiguous inputs
 */

// 1. Language & Script Detection
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return { code: 'en', label: 'English', isMixed: false };
  const str = text.trim();

  const bengaliRegex = /[\u0980-\u09FF]/;
  const devanagariRegex = /[\u0900-\u097F]/;
  const latinRegex = /[a-zA-Z]/;

  const hasBengaliScript = bengaliRegex.test(str);
  const hasDevanagariScript = devanagariRegex.test(str);
  const hasLatinScript = latinRegex.test(str);

  // Check for common Romanized Bengali (Banglish) words
  const banglishLexicon = [
    'amar', 'amr', 'kache', 'kacher', 'kachakachi', 'kothay', 'kuthe', 'dekhao', 'dhekhao',
    'haspatal', 'daktar', 'osudh', 'oshudh', 'khabar', 'khawa', 'restura', 'shouchalay',
    'paykhana', 'bari', 'ghar', 'thana', 'biman', 'bondor', 'rel', 'taka', 'jabo', 'jete',
    'lagbe', 'chai', 'hobe', 'eta', 'oita', 'kontar', 'prothom', 'ekta', 'niye', 'cholo'
  ];

  // Check for common Romanized Hindi (Hinglish) words
  const hinglishLexicon = [
    'mere', 'paas', 'pass', 'kahan', 'kidhar', 'dikhao', 'batao', 'dhundo', 'aspatal',
    'dawai', 'khana', 'shauchalay', 'ghar', 'jana', 'chahiye', 'kareeb', 'najdeek',
    'pehla', 'kaun', 'sa', 'kitni', 'door', 'hai', 'h', 'le', 'chalo', 'sabse'
  ];

  const lowerTokens = str.toLowerCase().split(/\s+/);
  const hasBanglishWord = lowerTokens.some(t => banglishLexicon.includes(t));
  const hasHinglishWord = lowerTokens.some(t => hinglishLexicon.includes(t));

  if (hasBengaliScript && hasLatinScript) {
    return { code: 'bn-en', label: 'বাংলা + English', isMixed: true };
  }
  if (hasDevanagariScript && hasLatinScript) {
    return { code: 'hi-en', label: 'हिंदी + English', isMixed: true };
  }
  if (hasBengaliScript) {
    return { code: 'bn', label: 'বাংলা (Bengali)', isMixed: false };
  }
  if (hasDevanagariScript) {
    return { code: 'hi', label: 'हिंदी (Hindi)', isMixed: false };
  }
  if (hasBanglishWord) {
    return { code: 'bn-en', label: 'Banglish (বাংলা)', isMixed: true };
  }
  if (hasHinglishWord) {
    return { code: 'hi-en', label: 'Hinglish (हिंदी)', isMixed: true };
  }

  return { code: 'en', label: 'English', isMixed: false };
};

// 2. Levenshtein Distance for fuzzy phonetic tolerance
export const levenshteinDistance = (a, b) => {
  if (!a || !b) return (a || '').length + (b || '').length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

// Fuzzy match word against candidate list
export const fuzzyMatchWord = (word, candidates, threshold = 2) => {
  const cleanWord = word.toLowerCase().trim();
  if (cleanWord.length < 3) return candidates.includes(cleanWord) ? cleanWord : null;

  for (const candidate of candidates) {
    if (candidate === cleanWord) return candidate;
    if (Math.abs(cleanWord.length - candidate.length) <= threshold) {
      if (levenshteinDistance(cleanWord, candidate) <= threshold) {
        return candidate;
      }
    }
  }
  return null;
};

// 3. Category Registry (Multi-language & Phonetic Romanized Tokens)
export const CATEGORIES = {
  CAFE: {
    id: 'CAFE',
    label: 'Cafe & Coffee Shop',
    osmSearch: 'amenity=cafe',
    color: '#d97706', // warm amber/brown
    keywords: [
      'coffee shop', 'coffee-shop', 'coffeeshop', 'coffee house', 'coffee place', 'coffee bar',
      'coffee', 'cafe', 'cafes', 'espresso', 'roaster', 'roasters', 'bakery', 'tea corner',
      'tea shop', 'chai point', 'chai stall', 'tea stall', 'chai', 'cha', 'kofi', 'coffe',
      'কফি শপ', 'কফি হাউস', 'কফি দোকান', 'কফি', 'ক্যাফে', 'চা দোকান', 'চা স্টল', 'চা',
      'कॉफी शॉप', 'कॉफ़ी शॉप', 'कॉफी हाउस', 'कॉफी', 'कॉफ़ी', 'कैफ़े', 'कैफे', 'चाय की दुकान', 'चाय'
    ],
    brokenPhrases: ['need coffee', 'want coffee', 'tea break', 'কফি খাব', 'চা খাব', 'कॉफी पीनी है', 'चाय पीनी है']
  },
  HOSPITAL: {
    id: 'HOSPITAL',
    label: 'Hospital & Clinic',
    osmSearch: 'amenity=hospital',
    color: '#ef4444', // red
    keywords: [
      'hospital', 'hospitals', 'clinic', 'clinics', 'doctor', 'doctors', 'emergency',
      'medical', 'healthcare', 'infirmary', 'dispensary', 'aspatal', 'aspataal',
      'haspatal', 'haspatale', 'daktar', 'chikitsalay', 'hopital', 'hospitl',
      'হাসপাতাল', 'হাসপাতালটা', 'হাসপাতালে', 'ডাক্তার', 'ক্লিনিক', 'চিকিৎসালয়', 'জরুরী',
      'अस्पताल', 'डॉक्टर', 'चिकित्सालय', 'क्लिनिक', 'हॉस्पिटल'
    ],
    brokenPhrases: ['feeling bad', 'sick', 'hurt', 'illness', 'emergency medical', 'অসুস্থ', 'শরীর খারাপ', 'तबीयत खराब', 'बीमार']
  },
  PHARMACY: {
    id: 'PHARMACY',
    label: 'Pharmacy & Medical Store',
    osmSearch: 'amenity=pharmacy',
    color: '#10b981', // emerald
    keywords: [
      'pharmacy', 'chemist', 'drugstore', 'medicine store', 'medicine', 'medicines', 'meds', 'medical store',
      'dawai', 'davai', 'osudh', 'oshudh', 'oshudher dokan', 'chemst', 'farmacy',
      'ফার্মেসি', 'ঔষধ', 'ওষুধ', 'ঔষধের দোকান', 'মেডিসিন',
      'फार्मेसी', 'दवा', 'दवाई', 'केमिस्ट', 'दवाखाना', 'दवा की दुकान'
    ]
  },
  RESTAURANT: {
    id: 'RESTAURANT',
    label: 'Restaurant & Food',
    osmSearch: 'amenity=restaurant',
    color: '#f59e0b', // amber
    keywords: [
      'restaurant', 'restaurants', 'resturent', 'resturant', 'food eatery', 'eatery', 'dining',
      'food', 'dinner', 'lunch', 'breakfast', 'meal', 'dhaba', 'hotel to eat', 'bhojanalay',
      'khana', 'khabar', 'khabar dokan', 'khawa', 'restura', 'biryani',
      'রেস্তোরাঁ', 'খাবার', 'খাবারের দোকান', 'রেস্টুরেন্ট', 'বিরিয়ানি',
      'रेस्तरां', 'रेस्टोरेंट', 'खाना', 'भोजनालय', 'ढाबा'
    ],
    brokenPhrases: ['hungry', 'want food', 'need food', 'ক্ষিদে পেয়েছে', 'भूख लगी']
  },
  HOTEL: {
    id: 'HOTEL',
    label: 'Hotel & Lodging',
    osmSearch: 'tourism=hotel',
    color: '#8b5cf6', // purple
    keywords: [
      'hotel', 'hotels', 'lodging', 'lodge', 'guest house', 'motel', 'resort', 'stay',
      'thakar jaiga', 'thakbo', 'staying',
      'হোটেল', 'থাকার জায়গা', 'লজ', 'রিসর্ট',
      'होटल', 'लॉज', 'ठहरने की जगह', 'रिज़ॉर्ट'
    ]
  },
  RESTROOM: {
    id: 'RESTROOM',
    label: 'Restroom & Toilet',
    osmSearch: 'amenity=toilets',
    color: '#06b6d4', // cyan
    keywords: [
      'restroom', 'toilet', 'toilets', 'washroom', 'washrooms', 'bathroom', 'lavatory',
      'latrine', 'shauchalay', 'sauchalay', 'paykhana', 'tolet', 'loo', 'wc',
      'টয়লেট', 'শৌচাগার', 'পায়খানা', 'ওয়াশরুম', 'বাথরুম',
      'शौचालय', 'टॉयलेट', 'वॉशरूम', 'बाथरूम'
    ],
    brokenPhrases: ['pee', 'urgent pee', 'potty', 'পায়খানা পেয়েছে', 'টয়লেট লাগবে', 'सुसु']
  },
  ATM: {
    id: 'ATM',
    label: 'ATM & Cash Machine',
    osmSearch: 'amenity=atm',
    color: '#3b82f6', // blue
    keywords: [
      'atm', 'cash machine', 'cash dispenser', 'money machine', 'taka tolar', 'paisa nikalna',
      'এটিএম', 'টাকা তোলার মেশিন',
      'एटीएम', 'कैश मशीन'
    ]
  },
  BANK: {
    id: 'BANK',
    label: 'Bank',
    osmSearch: 'amenity=bank',
    color: '#6366f1', // indigo
    keywords: [
      'bank', 'banks', 'benk',
      'ব্যাংক', 'ব্যাংক শাখা',
      'बैंक'
    ]
  },
  PETROL_PUMP: {
    id: 'PETROL_PUMP',
    label: 'Petrol Pump & Fuel',
    osmSearch: 'amenity=fuel',
    color: '#f97316', // orange
    keywords: [
      'petrol pump', 'gas station', 'fuel station', 'petrol', 'fuel', 'diesel', 'cng', 'tel pump', 'oil',
      'পেট্রোল পাম্প', 'তেল পাম্প', 'পেট্রোল', 'জ্বালানি',
      'पेट्रोल पंप', 'गैस स्टेशन', 'फ्यूल', 'डीजल'
    ]
  },
  POLICE_STATION: {
    id: 'POLICE_STATION',
    label: 'Police Station',
    osmSearch: 'amenity=police',
    color: '#1e40af', // dark blue
    keywords: [
      'police station', 'police outpost', 'police chowki', 'police', 'cop', 'thana', 'kotwali',
      'থানা', 'পুলিশ স্টেশন', 'পুলিশ', 'ফাঁড়ি',
      'थाना', 'पुलिस स्टेशन', 'पुलिस', 'चौकी'
    ]
  },
  BUS_STOP: {
    id: 'BUS_STOP',
    label: 'Bus Stop & Stand',
    osmSearch: 'highway=bus_stop',
    color: '#e11d48', // rose
    keywords: [
      'bus stop', 'bus stand', 'bus station', 'bus depot', 'bus',
      'বাস স্টপ', 'বাস স্ট্যান্ড', 'বাস ডিপো',
      'बस स्टॉप', 'बस स्टैंड', 'बस स्टेशन'
    ]
  },
  RAILWAY_STATION: {
    id: 'RAILWAY_STATION',
    label: 'Railway Station',
    osmSearch: 'railway=station',
    color: '#0284c7', // light blue
    keywords: [
      'railway station', 'train station', 'metro station', 'train', 'railway', 'metro', 'subway',
      'রেলওয়ে স্টেশন', 'ট্রেন স্টেশন', 'মেট্রো স্টেশন', 'রেল স্টেশন',
      'रेलवे स्टेशन', 'ट्रेन स्टेशन', 'मेट्रो स्टेशन'
    ]
  },
  AIRPORT: {
    id: 'AIRPORT',
    label: 'Airport',
    osmSearch: 'aeroway=aerodrome',
    color: '#0d9488', // teal
    keywords: [
      'airport', 'aerodrome', 'flight', 'airfield', 'biman bondor', 'aeroport',
      'বিমানবন্দর', 'বিমান বন্দর', 'এয়ারপোর্ট',
      'हवाई अड्डा', 'एयरपोर्ट', 'विमानक्षेत्र'
    ]
  },
  HOME: {
    id: 'HOME',
    label: 'Home',
    osmSearch: 'place=house',
    color: '#3b82f6',
    keywords: [
      'home', 'my home', 'house', 'bari', 'baari', 'ghar', 'badi',
      'বাড়ি', 'বাসা', 'ঘর',
      'घर', 'मकान'
    ],
    brokenPhrases: ['want go home', 'take me home', 'বাড়ি যাব', 'বাড়ি যেতে হবে', 'বাড়ি যেতে চাই', 'ghar jana hai']
  }
};

// 4. Extract Category from Normalized Text
export const extractCategory = (text) => {
  const clean = text.toLowerCase();
  const tokens = clean.split(/[\s,?.!।]+/);

  // Collect all category keywords sorted by length descending so multi-word phrases match first
  const allKeywords = [];
  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    for (const kw of catDef.keywords) {
      allKeywords.push({ kw: kw.toLowerCase(), catKey, len: kw.length });
    }
  }
  allKeywords.sort((a, b) => b.len - a.len);

  // 1. Direct phrase check (longer phrases take precedence)
  for (const item of allKeywords) {
    if (clean.includes(item.kw)) {
      return item.catKey;
    }
  }

  // 2. Broken phrase context
  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    if (catDef.brokenPhrases) {
      for (const phrase of catDef.brokenPhrases) {
        if (clean.includes(phrase.toLowerCase())) {
          return catKey;
        }
      }
    }
  }

  // 3. Token-level fuzzy check
  for (const token of tokens) {
    if (token.length >= 4) {
      for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
        for (const kw of catDef.keywords) {
          if (!kw.includes(' ') && kw.length >= 4) {
            if (levenshteinDistance(token, kw.toLowerCase()) <= 1) {
              return catKey;
            }
          }
        }
      }
    }
  }

  return null;
};

// 5. Detect "Near Me" / Nearby Location references
export const isNearbyQuery = (text) => {
  const clean = text.toLowerCase();
  const nearbyPatterns = [
    'near me', 'nearby', 'near', 'around me', 'closest', 'nearest', 'close to me',
    'around here', 'close by', 'in vicinity', 'here',
    'আমার কাছে', 'কাছে', 'কাছাকাছি', 'কাছের', 'পাশে', 'আশেপাশে', 'এখানে',
    'amar kache', 'amr kache', 'kache', 'kacher', 'kachakachi', 'ashepash',
    'मेरे पास', 'पास में', 'पास', 'आस पास', 'आस-पास', 'नजदीक', 'करीब', 'यहीं',
    'mere paas', 'mere pass', 'paas mein', 'pass me', 'najdeek', 'kareeb', 'aas paas'
  ];
  return nearbyPatterns.some(p => clean.includes(p));
};

// Detect Navigation action verbs
export const isNavActionQuery = (text) => {
  const clean = text.toLowerCase();
  const navActionPhrases = [
    'take me to', 'take me', 'navigate to', 'navigate me to', 'drive me to', 'drive to',
    'lead me to', 'bring me to', 'guide me to', 'head to', 'go to',
    'নিয়ে চলো', 'নিয়ে যাও', 'পৌঁছে দাও', 'যেতে চাই', 'যেতে হবে', 'চলো',
    'লে चलो', 'ले जाओ', 'पहुंचा दो', 'जाना है', 'चलें'
  ];
  return navActionPhrases.some(p => clean.includes(p));
};

// Detect "Nearest" / "Closest" intent
export const isNearestQuery = (text) => {
  const clean = text.toLowerCase();
  const nearestPhrases = [
    'nearest', 'closest', 'most nearby',
    'সবচেয়ে কাছের', 'সবথেকে কাছের', 'কাছের', 'সবচেয়ে কাছে', 'সবথেকে কাছে',
    'kacher', 'shobcheye kacher', 'sobcheye kacher',
    'सबसे नज़दीकी', 'सबसे नजदीकी', 'सबसे पास', 'नज़दीकी', 'नजदीकी',
    'sabse paas', 'sabse najdeeki', 'paas wala'
  ];
  return nearestPhrases.some(p => clean.includes(p));
};

// 6. Conversational Context Resolver
export const resolveConversationalContext = (text, lastContext) => {
  const clean = text.toLowerCase().trim();

  // Contextual follow-up 1: "Which one is closest?"
  const closestPatterns = [
    'which one is closest', 'which is closest', 'which is nearest', 'closest one', 'nearest one',
    'সবচেয়ে কাছের কোনটা', 'কাছেরটা কোনটা', 'সবথেকে কাছেরটা', 'কোনটা কাছে',
    'shobcheye kacher konta', 'konta kache', 'konta closest',
    'सबसे पास कौन सा है', 'पास वाला कौन सा है', 'नजदीकी कौन सा है',
    'sabse paas kaun sa', 'kaun sa paas hai'
  ];

  for (const p of closestPatterns) {
    if (clean.includes(p)) {
      return {
        intent: 'FIND_NEARBY',
        context_reference: 'closest',
        resolvedCategory: lastContext?.category || 'HOSPITAL',
        handled: true
      };
    }
  }

  // Contextual follow-up 2: "How far is the first one?"
  const ordinalPatterns = [
    { pattern: /(?:how far is the|how far is|distance of|distance to)\s+(first|1st|second|2nd|third|3rd)/i, indexMap: { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2 } },
    { pattern: /(প্রথমটা|দ্বিতীয়টা|তৃতীয়টা)\s*(কত দূর|দূরত্ব কত)/i, indexMap: { 'প্রথমটা': 0, 'দ্বিতীয়টা': 1, 'তৃতীয়টা': 2 } },
    { pattern: /(prothomta|dwitiyota)\s*(koto dur)/i, indexMap: { prothomta: 0, dwitiyota: 1 } },
    { pattern: /(पहला|दूसरा)\s*(वाला)?\s*(कितनी दूर|दूरी कितनी)/i, indexMap: { 'पहला': 0, 'दूसरा': 1 } },
    { pattern: /(pehla|dusra)\s*(kitni door)/i, indexMap: { pehla: 0, dusra: 1 } }
  ];

  for (const op of ordinalPatterns) {
    const m = clean.match(op.pattern);
    if (m) {
      const key = m[1].toLowerCase();
      const idx = op.indexMap[key] ?? 0;
      return {
        intent: 'GET_LOCATION_INFORMATION',
        context_reference: 'ordinal',
        targetIndex: idx,
        handled: true
      };
    }
  }

  // Contextual follow-up 3: "Take me there" / "Route to it"
  const routePatterns = [
    'take me there', 'route to it', 'how do i get there', 'navigate there', 'go there',
    'ওখানে যাব', 'রাস্তা দেখাও', 'কীভাবে যাব', 'okhane jabo', 'rasta dekhao',
    'वहाँ का रास्ता दिखाओ', 'वहाँ कैसे जाऊं', 'रास्ता बताओ', 'wahan kaise jaun'
  ];

  for (const rp of routePatterns) {
    if (clean.includes(rp)) {
      return {
        intent: 'FIND_ROUTE',
        context_reference: 'selected_or_first',
        handled: true
      };
    }
  }

  return { handled: false };
};

// 7. Generate Conversational Clarification Question
export const generateClarification = (categoryKey, detectedLang) => {
  const cat = CATEGORIES[categoryKey];
  const catLabelEn = cat ? cat.label.toLowerCase() : 'place';

  if (detectedLang === 'bn' || detectedLang === 'bn-en') {
    const bnNameMap = {
      CAFE: 'কফি শপ / ক্যাফে',
      HOSPITAL: 'হাসপাতাল',
      PHARMACY: 'ঔষধের দোকান',
      RESTAURANT: 'রেস্তোরাঁ / খাবার দোকান',
      RESTROOM: 'শৌচাগার / টয়লেট',
      ATM: 'এটিএম',
      BANK: 'ব্যাংক',
      PETROL_PUMP: 'পেট্রোল পাম্প',
      POLICE_STATION: 'থানা / পুলিশ স্টেশন',
      BUS_STOP: 'বাস স্টপ',
      RAILWAY_STATION: 'রেলওয়ে স্টেশন',
      AIRPORT: 'বিমানবন্দর',
      HOME: 'বাড়ি'
    };
    const bnName = bnNameMap[categoryKey] || 'জায়গা';
    return `আপনি কি আপনার কাছাকাছি ${bnName} খুঁজছেন?`;
  }

  if (detectedLang === 'hi' || detectedLang === 'hi-en') {
    const hiNameMap = {
      CAFE: 'कैफे / कॉफी शॉप',
      HOSPITAL: 'अस्पताल',
      PHARMACY: 'दवा की दुकान',
      RESTAURANT: 'रेस्टोरेंट / खाना',
      RESTROOM: 'शौचालय / टॉयलेट',
      ATM: 'एटीएम',
      BANK: 'बैंक',
      PETROL_PUMP: 'पेट्रोल पंप',
      POLICE_STATION: 'थाना / पुलिस',
      BUS_STOP: 'बस स्टॉप',
      RAILWAY_STATION: 'रेलवे स्टेशन',
      AIRPORT: 'हवाई अड्डा',
      HOME: 'घर'
    };
    const hiName = hiNameMap[categoryKey] || 'जगह';
    return `क्या आप अपने पास ${hiName} ढूंढ रहे हैं?`;
  }

  return `Did you mean a ${catLabelEn} near you?`;
};

// 8. Main Multilingual Semantic Intent Parser
export const parseMultilingualQuery = (rawText, lastContext = null) => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      intent: 'CLEAR_MAP',
      category: null,
      location: null,
      language: 'en',
      confidence: 0,
      original_query: ''
    };
  }

  const query = rawText.trim();
  const langInfo = detectLanguage(query);
  const detectedLang = langInfo.code;
  const clean = query.toLowerCase();

  // Step 1: Check Conversational Context first
  if (lastContext) {
    const contextResult = resolveConversationalContext(query, lastContext);
    if (contextResult.handled) {
      return {
        intent: contextResult.intent,
        category: contextResult.resolvedCategory || lastContext.category,
        location: 'CURRENT_LOCATION',
        context_reference: contextResult.context_reference,
        targetIndex: contextResult.targetIndex ?? 0,
        language: detectedLang,
        confidence: 0.95,
        original_query: query
      };
    }
  }

  // Step 2: Extract Category
  const category = extractCategory(query);

  // Step 3: Check for "Locate Me" / "Where am I" / Current Location
  const locateMePatterns = [
    'locate me', 'my location', 'where am i', 'find me', 'find my location', 'center me',
    'show current location', 'where i am', 'am i here',
    'আমার অবস্থান', 'আমি কোথায়', 'আমাকে দেখাও', 'লোকেট মি', 'আমার লোকেশন',
    'amar obosthan', 'ami kothay', 'amake dekhao', 'amar location',
    'मेरी स्थिति', 'मेरी लोकेशन', 'मैं कहाँ हूँ', 'मुझे ढूंढो', 'मेरी जगह',
    'meri location', 'main kahan hoon', 'meri sthiti'
  ];

  const isLocateMe = locateMePatterns.some(p => clean.includes(p));
  if (isLocateMe && !category) {
    return {
      intent: 'SHOW_CURRENT_LOCATION',
      category: null,
      location: 'CURRENT_LOCATION',
      language: detectedLang,
      confidence: 0.98,
      original_query: query
    };
  }

  // Step 4: Check for Route Keywords
  const routeKeywords = [
    'route to', 'directions to', 'how to reach', 'path to', 'way to', 'how do i go to',
    'রাস্তা দেখাও', 'যাওয়ার রাস্তা', 'পথ দেখাও',
    'rasta dekhao', 'jaoar rasta', 'path dekhao',
    'रास्ता दिखाओ', 'रास्ता बताओ', 'कैसे जाएं',
    'raasta dikhao', 'kaise jaye'
  ];
  const isRouteQuery = routeKeywords.some(rk => clean.includes(rk));

  // Step 5: Check Map Controls (Zoom, Layers, Clear)
  if (
    clean.includes('zoom in') || clean.includes('কাছে আনো') || clean.includes('बड़ा करो') ||
    clean.includes('ज़ूम इन') || clean.includes('zoom koro')
  ) {
    return {
      intent: 'ZOOM_IN',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  if (
    clean.includes('zoom out') || clean.includes('দূরে নাও') || clean.includes('छोटा करो') ||
    clean.includes('ज़ूम आउट') || clean.includes('zoom out koro')
  ) {
    return {
      intent: 'ZOOM_OUT',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  if (
    clean.includes('switch to 3d') || clean.includes('3d view') || clean.includes('globe view') ||
    clean.includes('3d globe') || clean.includes('থ্রিডি') || clean.includes('3d mod')
  ) {
    return {
      intent: 'CHANGE_MAP_LAYER',
      layer: '3D',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  if (
    clean.includes('switch to 2d') || clean.includes('2d view') || clean.includes('flat map') ||
    clean.includes('টুডি')
  ) {
    return {
      intent: 'CHANGE_MAP_LAYER',
      layer: '2D',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  if (clean.includes('satellite') || clean.includes('স্যাটেলাইট') || clean.includes('सैटेलाइट')) {
    return {
      intent: 'CHANGE_MAP_LAYER',
      layer: 'satellite',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  if (clean.includes('clear map') || clean.includes('reset map') || clean.includes('পরিষ্কার করো') || clean.includes('সাফ করো')) {
    return {
      intent: 'CLEAR_MAP',
      category: null,
      location: null,
      language: detectedLang,
      confidence: 0.95,
      original_query: query
    };
  }

  // Step 6: Category-focused queries (NAVIGATE_TO or FIND_NEARBY)
  if (category) {
    // Check if category is HOME
    if (category === 'HOME') {
      return {
        intent: 'NAVIGATE_TO',
        category: 'HOME',
        target_selection: 'home',
        location: 'HOME',
        language: detectedLang,
        confidence: 0.95,
        original_query: query
      };
    }

    const isNav = isNavActionQuery(query);
    const isNearest = isNearestQuery(query);
    const isNearby = isNearbyQuery(query);

    // If query asks to navigate, take me there, or asks for the nearest/closest place:
    // Examples:
    // - "Take me to the nearest coffee shop."
    // - "কাছের কফি শপে নিয়ে চলো"
    // - "मेरे पास सबसे नज़दीकी कैफे पर ले चलो"
    // - "take me to a cafe"
    // - "nearest coffee shop"
    if (isNav || isRouteQuery || (isNearest && !clean.includes('show') && !clean.includes('দেখাও') && !clean.includes('दिखाओ'))) {
      return {
        intent: isRouteQuery ? 'FIND_ROUTE' : 'NAVIGATE_TO',
        category: category,
        target_selection: 'nearest',
        location: 'CURRENT_LOCATION',
        language: detectedLang,
        confidence: 0.96,
        original_query: query
      };
    }

    // Default nearby category discovery:
    // Examples:
    // - "Show coffee shops near me"
    // - "find a cafe nearby"
    // - "আমার কাছাকাছি হাসপাতাল কোথায়?"
    // - "मेरे पास toilet कहाँ है?"
    return {
      intent: 'FIND_NEARBY',
      category: category,
      target_selection: isNearest ? 'nearest' : 'all',
      location: 'CURRENT_LOCATION',
      language: detectedLang,
      confidence: (isNearby || isNearest) ? 0.96 : 0.90,
      original_query: query
    };
  }

  // Step 7: General Location Navigation / Search for SPECIFIC NAMED PLACES (e.g., "Go to Tokyo", "দিল্লি দেখাও", "Kolkata")
  // Only executed when NO category was identified
  const navPatterns = [
    /(?:go to|fly to|navigate to|search|show|find|take me to|travel to|where is)\s+(.+)/i,
    /(?:যাও|খুঁজুন|দেখাও|নিয়ে চলো|নিয়ে যাও)\s+(.+)/i,
    /(?:जाओ|दिखाओ|खोजो|ले चलो|ले जाओ)\s+(.+)/i,
    /(.+?)\s*(?:দেখাও|যাব|जाओ|दिखाओ|dekhao|chalo)/i
  ];

  for (const pattern of navPatterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const loc = match[1].replace(/[?.!।]/g, '').trim();
      if (loc.length > 1) {
        return {
          intent: isRouteQuery ? 'FIND_ROUTE' : 'SEARCH_LOCATION',
          category: null,
          location: loc,
          language: detectedLang,
          confidence: 0.9,
          original_query: query
        };
      }
    }
  }

  // If text is short and looks like a named place (e.g. "Paris", "Kolkata", "London")
  if (
    clean.length >= 2 &&
    clean.length <= 40 &&
    !['hello', 'hi', 'hey', 'test', 'map'].includes(clean)
  ) {
    return {
      intent: 'SEARCH_LOCATION',
      category: null,
      location: query.trim(),
      language: detectedLang,
      confidence: 0.75,
      original_query: query
    };
  }

  // Step 8: Ambiguous / Unclear query -> Clarification
  if (clean.includes('emergency') || clean.includes('জরুরী') || clean.includes('मदद') || clean.includes('help')) {
    return {
      intent: 'FIND_NEARBY',
      category: 'HOSPITAL',
      location: 'CURRENT_LOCATION',
      language: detectedLang,
      confidence: 0.6,
      needs_clarification: true,
      clarification_question: generateClarification('HOSPITAL', detectedLang),
      original_query: query
    };
  }

  return {
    intent: 'UNKNOWN',
    category: null,
    location: null,
    language: detectedLang,
    confidence: 0.2,
    needs_clarification: true,
    clarification_question: detectedLang === 'bn' || detectedLang === 'bn-en'
      ? 'আপনি কি কাছাকাছি কোনো ক্যাফে, হাসপাতাল বা রেস্তোরাঁ খুঁজছেন?'
      : detectedLang === 'hi' || detectedLang === 'hi-en'
      ? 'क्या आप आस-पास कोई कैफे, अस्पताल या रेस्टोरेंट ढूंढ रहे हैं?'
      : 'Did you mean to find a nearby place or navigate to a destination?',
    original_query: query
  };
};
