/**
 * Multilingual Semantic, Phonetic & Intent Engine
 * 
 * Supports:
 * - English, Bengali, Hindi, and code-switching (Banglish, Hinglish, Bengali + English, Hindi + English)
 * - Broken English, grammatically incorrect sentences, incomplete queries
 * - Approximate pronunciations, phonetic variations, and transliteration
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
    'lagbe', 'chai', 'hobe', 'eta', 'oita', 'kontar', 'prothom', 'ekta'
  ];

  // Check for common Romanized Hindi (Hinglish) words
  const hinglishLexicon = [
    'mere', 'paas', 'pass', 'kahan', 'kidhar', 'dikhao', 'batao', 'dhundo', 'aspatal',
    'dawai', 'khana', 'shauchalay', 'ghar', 'jana', 'chahiye', 'kareeb', 'najdeek',
    'pehla', 'kaun', 'sa', 'kitni', 'door', 'hai', 'h'
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
    // Length tolerance
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
  HOSPITAL: {
    id: 'HOSPITAL',
    label: 'Hospital & Clinic',
    osmSearch: 'hospital clinic doctor',
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
    osmSearch: 'pharmacy chemist medicine',
    color: '#10b981', // emerald
    keywords: [
      'pharmacy', 'chemist', 'drugstore', 'medicine', 'medicines', 'meds', 'medical store',
      'dawai', 'davai', 'osudh', 'oshudh', 'oshudher', 'dokan', 'chemst', 'farmacy',
      'ফার্মেসি', 'ঔষধ', 'ওষুধ', 'ঔষধের দোকান', 'মেডিসিন',
      'फार्मेसी', 'दवा', 'दवाई', 'केमिस्ट', 'दवाखाना'
    ]
  },
  RESTAURANT: {
    id: 'RESTAURANT',
    label: 'Restaurant & Food',
    osmSearch: 'restaurant cafe food fast_food eatery',
    color: '#f59e0b', // amber
    keywords: [
      'restaurant', 'restaurants', 'resturent', 'resturant', 'food', 'eatery', 'dining',
      'dinner', 'lunch', 'breakfast', 'meal', 'dhaba', 'hotel to eat', 'bhojanalay',
      'khana', 'khabar', 'khabar dokan', 'khawa', 'restura', 'biryani',
      'রেস্তোরাঁ', 'খাবার', 'খাবারের দোকান', 'হোটেল', 'রেস্টুরেন্ট', 'বিরিয়ানি',
      'रेस्तरां', 'रेस्टोरेंट', 'खाना', 'भोजनालय', 'ढाबा', 'होटल'
    ],
    brokenPhrases: ['hungry', 'want food', 'need food', 'পেট খারাপ', 'ক্ষিদে পেয়েছে', 'भूख लगी']
  },
  HOTEL: {
    id: 'HOTEL',
    label: 'Hotel & Lodging',
    osmSearch: 'hotel motel guest_house resort',
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
    osmSearch: 'toilets restroom washroom',
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
    osmSearch: 'atm cash_machine',
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
    osmSearch: 'bank',
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
    osmSearch: 'fuel gas_station petrol',
    color: '#f97316', // orange
    keywords: [
      'petrol', 'petrol pump', 'gas station', 'fuel', 'diesel', 'cng', 'tel pump', 'oil',
      'পেট্রোল', 'পেট্রোল পাম্প', 'তেল পাম্প', 'জ্বালানি',
      'पेट्रोल पंप', 'गैस स्टेशन', 'फ्यूल', 'डीजल'
    ]
  },
  POLICE_STATION: {
    id: 'POLICE_STATION',
    label: 'Police Station',
    osmSearch: 'police',
    color: '#1e40af', // dark blue
    keywords: [
      'police', 'police station', 'cop', 'thana', 'police chowki', 'kotwali',
      'থানা', 'পুলিশ', 'পুলিশ স্টেশন', 'ফাঁড়ি',
      'थाना', 'पुलिस', 'पुलिस स्टेशन', 'चौकी'
    ]
  },
  BUS_STOP: {
    id: 'BUS_STOP',
    label: 'Bus Stop & Stand',
    osmSearch: 'bus_stop bus_station platform',
    color: '#e11d48', // rose
    keywords: [
      'bus', 'bus stop', 'bus stand', 'bus station', 'bus depot',
      'বাস স্টপ', 'বাস স্ট্যান্ড', 'বাস ডিপো',
      'बस स्टॉप', 'बस स्टैंड', 'बस स्टेशन'
    ]
  },
  RAILWAY_STATION: {
    id: 'RAILWAY_STATION',
    label: 'Railway Station',
    osmSearch: 'railway station train_station',
    color: '#0284c7', // light blue
    keywords: [
      'train', 'train station', 'railway', 'railway station', 'metro', 'metro station', 'subway',
      'রেলওয়ে স্টেশন', 'ট্রেন স্টেশন', 'মেট্রো স্টেশন', 'রেল স্টেশন',
      'रेलवे स्टेशन', 'ट्रेन स्टेशन', 'मेट्रो स्टेशन'
    ]
  },
  AIRPORT: {
    id: 'AIRPORT',
    label: 'Airport',
    osmSearch: 'aerodrome airport flight',
    color: '#0d9488', // teal
    keywords: [
      'airport', 'aerodrome', 'flight', 'airfield', 'biman bondor', 'aeroport',
      'বিমানবন্দর', 'বিমান বন্দর', 'এয়ারপোর্ট',
      'हवाई अड्डा', 'एयरपोर्ट', 'विमानक्षेत्र'
    ]
  },
  CAFE: {
    id: 'CAFE',
    label: 'Cafe & Tea',
    osmSearch: 'cafe coffee tea',
    color: '#d97706',
    keywords: [
      'cafe', 'coffee', 'tea', 'coffee shop', 'chai', 'cha',
      'ক্যাফে', 'চা দোকান', 'কফি শপ',
      'कैफ़े', 'कॉफ़ी शॉप', 'चाय की दुकान'
    ]
  },
  HOME: {
    id: 'HOME',
    label: 'Home',
    osmSearch: 'residential',
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

  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    // 1. Direct phrase check
    for (const kw of catDef.keywords) {
      if (clean.includes(kw.toLowerCase())) {
        return catKey;
      }
    }

    // 2. Broken phrase context
    if (catDef.brokenPhrases) {
      for (const phrase of catDef.brokenPhrases) {
        if (clean.includes(phrase.toLowerCase())) {
          return catKey;
        }
      }
    }

    // 3. Token-level fuzzy check
    for (const token of tokens) {
      if (token.length >= 4) {
        for (const kw of catDef.keywords) {
          if (!kw.includes(' ') && kw.length >= 4) {
            if (levenshteinDistance(token, kw) <= 1) {
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
    // Bengali script & transliterated
    'আমার কাছে', 'কাছে', 'কাছাকাছি', 'কাছের', 'পাশে', 'আশেপাশে', 'এখানে',
    'amar kache', 'amr kache', 'kache', 'kacher', 'kachakachi', 'ashepash',
    // Hindi script & transliterated
    'मेरे पास', 'पास में', 'पास', 'आस पास', 'आस-पास', 'नजदीक', 'करीब', 'यहीं',
    'mere paas', 'mere pass', 'paas mein', 'pass me', 'najdeek', 'kareeb', 'aas paas'
  ];

  for (const pattern of nearbyPatterns) {
    if (clean.includes(pattern)) return true;
  }
  return false;
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

  // Contextual follow-up 2: "How far is the first one?" / "How far is the second one?"
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

  // Contextual follow-up 3: "Take me there" / "Route to it" / "Show route"
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
      CAFE: 'ক্যাফে',
      HOME: 'বাড়ি'
    };
    const bnName = bnNameMap[categoryKey] || 'জায়গা';
    return `আপনি কি আপনার কাছাকাছি ${bnName} খুঁজছেন?`;
  }

  if (detectedLang === 'hi' || detectedLang === 'hi-en') {
    const hiNameMap = {
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
      CAFE: 'कैफ़े',
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
    // Bengali
    'আমার অবস্থান', 'আমি কোথায়', 'আমাকে দেখাও', 'লোকেট মি', 'আমার লোকেশন',
    'amar obosthan', 'ami kothay', 'amake dekhao', 'amar location',
    // Hindi
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

  // Step 4: Check for Route / Navigation ("Route to airport", "How to go to Paris")
  const routeKeywords = [
    'route to', 'directions to', 'how to reach', 'path to', 'way to', 'how do i go to',
    'রাস্তা দেখাও', 'যাওয়ার রাস্তা', 'পথ দেখাও',
    'rasta dekhao', 'jaoar rasta', 'path dekhao',
    'रास्ता दिखाओ', 'रास्ता बताओ', 'कैसे जाएं',
    'raasta dikhao', 'kaise jaye'
  ];
  const isRouteQuery = routeKeywords.some(rk => clean.includes(rk));

  // Step 5: Check Map Controls (Zoom in, Zoom out, 2D, 3D, Map Layers, Clear)
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

  // Step 6: Category-focused queries (FIND_NEARBY or NAVIGATE_TO)
  if (category) {
    // Check if category is HOME (e.g. "বাড়ি যেতে চাই", "I want go home", "take me home")
    if (category === 'HOME') {
      return {
        intent: 'NAVIGATE_TO',
        category: 'HOME',
        location: 'HOME',
        language: detectedLang,
        confidence: 0.95,
        original_query: query
      };
    }

    // Check if query specifies routing
    if (isRouteQuery) {
      return {
        intent: 'FIND_ROUTE',
        category: category,
        location: 'CURRENT_LOCATION',
        language: detectedLang,
        confidence: 0.92,
        original_query: query
      };
    }

    // Check if query is nearby / near me or has broken English asking for near
    const nearby = isNearbyQuery(query);

    // Default for category requests (like "Show hospital near me", "Me need hospital near",
    // "Nearest hospital কোথায়?", "Hospital where? Near me.", "আমার একটা hospital লাগবে কাছে",
    // "Near toilet show")
    return {
      intent: 'FIND_NEARBY',
      category: category,
      location: 'CURRENT_LOCATION',
      language: detectedLang,
      confidence: nearby ? 0.95 : 0.88,
      original_query: query
    };
  }

  // Step 7: General Location Navigation / Search (e.g., "Go to Tokyo", "দিল্লি দেখাও", "Kolkata")
  const navPatterns = [
    /(?:go to|fly to|navigate to|search|show|find|take me to|travel to|where is)\s+(.+)/i,
    /(?:যাও|খুঁজুন|দেখাও|নিয়ে চলো)\s+(.+)/i,
    /(?:जाओ|दिखाओ|खोजो|ले चलो)\s+(.+)/i,
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

  // If text is short and looks like a place name (e.g. "Paris", "Kolkata", "London")
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

  // Step 8: Ambiguous / Unclear query -> Generate Clarification
  // If user says something vague like "urgent" or "help" or "emergency", recommend hospital
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
      ? 'আপনি কি কাছাকাছি কোনো জায়গা বা হাসপাতাল খুঁজছেন?'
      : detectedLang === 'hi' || detectedLang === 'hi-en'
      ? 'क्या आप आस-पास कोई जगह या अस्पताल ढूंढ रहे हैं?'
      : 'Did you mean to find a nearby place or navigate to a city?',
    original_query: query
  };
};
