import { parseMultilingualQuery } from './multilingualEngine';

/**
 * AI & Semantic Voice Command Parser
 * 
 * Pipeline:
 * 1. Multilingual Semantic, Phonetic & Grammar Parser (Local, Zero-latency, Offline-capable)
 * 2. Optional Gemini Generative AI enhancement when API key is available
 * 
 * Generates structured internal representation:
 * {
 *   intent: "FIND_NEARBY" | "SEARCH_LOCATION" | "NAVIGATE_TO" | "SHOW_CURRENT_LOCATION" |
 *           "CHANGE_MAP_LAYER" | "ZOOM_IN" | "ZOOM_OUT" | "GET_LOCATION_INFORMATION" |
 *           "FIND_ROUTE" | "CLEAR_MAP",
 *   category: "HOSPITAL" | "PHARMACY" | "RESTAURANT" | "RESTROOM" | ... | null,
 *   location: "CURRENT_LOCATION" | string | null,
 *   language: "en" | "bn" | "hi" | "bn-en" | "hi-en",
 *   confidence: number,
 *   needs_clarification: boolean,
 *   clarification_question: string | null,
 *   original_query: string
 * }
 */

export const parseVoiceCommand = async (text, lastContext = null) => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      intent: 'CLEAR_MAP',
      category: null,
      location: null,
      language: 'en',
      confidence: 0,
      original_query: ''
    };
  }

  // 1. Run our multilingual semantic and phonetic engine
  const localSemanticResult = parseMultilingualQuery(text, lastContext);

  // If local semantic engine is confident or it's a context/category/control command, use it directly
  if (localSemanticResult && localSemanticResult.confidence >= 0.75) {
    return localSemanticResult;
  }

  // 2. Check if Gemini API Key is configured for cloud enhancement
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('PASTE_YOUR') || apiKey.trim() === '') {
    return localSemanticResult;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an AI assistant for a Geospatial Map application.
Convert the natural language query into a JSON object. Understand broken English, Bengali, Hindi, or mixed code-switching.
Return JSON ONLY with this schema:
{
  "intent": "FIND_NEARBY" | "SEARCH_LOCATION" | "NAVIGATE_TO" | "SHOW_CURRENT_LOCATION" | "CHANGE_MAP_LAYER" | "ZOOM_IN" | "ZOOM_OUT" | "GET_LOCATION_INFORMATION" | "FIND_ROUTE" | "CLEAR_MAP",
  "category": "HOSPITAL" | "PHARMACY" | "RESTAURANT" | "HOTEL" | "RESTROOM" | "ATM" | "BANK" | "PETROL_PUMP" | "POLICE_STATION" | "BUS_STOP" | "RAILWAY_STATION" | "AIRPORT" | "CAFE" | "HOME" | null,
  "location": "CURRENT_LOCATION" | string | null,
  "language": "en" | "bn" | "hi" | "bn-en" | "hi-en",
  "confidence": number,
  "original_query": "${text}"
}

User query: "${text}"`
                }
              ]
            }
          ]
        })
      }
    );

    if (!res.ok) {
      return localSemanticResult;
    }

    const data = await res.json();
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(rawText);
      return {
        ...parsed,
        original_query: text
      };
    }
  } catch (e) {
    console.warn('Gemini parser fallback to local:', e);
  }

  return localSemanticResult;
};
