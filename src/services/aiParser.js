// Fallback rule-based parser for when API key is not configured or network fails
const parseLocally = (text) => {
  const clean = text.toLowerCase().trim();

  // Locate me
  if (
    clean.includes('locate me') ||
    clean.includes('my location') ||
    clean.includes('where am i') ||
    clean.includes('find me') ||
    clean.includes('मेरी स्थिति') ||
    clean.includes('আমার অবস্থান')
  ) {
    return { action: 'locate_me' };
  }

  // Nearby / Explore
  if (
    clean.includes('nearby') ||
    clean.includes('around me') ||
    clean.includes('places near') ||
    clean.includes('explore') ||
    clean.includes('आस-पास') ||
    clean.includes('কাছাকাছি')
  ) {
    return { action: 'nearby' };
  }

  // Zoom
  if (clean.includes('zoom in') || clean.includes('ज़ूम इन') || clean.includes('কাছে')) {
    return { action: 'zoom', zoom: 'in' };
  }
  if (clean.includes('zoom out') || clean.includes('ज़ूम आउट') || clean.includes('দূরে')) {
    return { action: 'zoom', zoom: 'out' };
  }

  // Switch View
  if (clean.includes('3d') || clean.includes('globe') || clean.includes('ग्लोब')) {
    return { action: 'switch_view', view_mode: '3D' };
  }
  if (clean.includes('2d') || clean.includes('flat') || clean.includes('नक्शा')) {
    return { action: 'switch_view', view_mode: '2D' };
  }

  // Navigation (e.g. "go to Paris", "fly to Tokyo", "search London", "show New York", "Delhi")
  const navPatterns = [
    /(?:go to|fly to|navigate to|search|show|find|take me to|travel to)\s+(.+)/i,
    /(?:जाओ|दिखाओ)\s+(.+)/i,
    /(?:যাও|খুঁজুন)\s+(.+)/i
  ];

  for (const pattern of navPatterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      return { action: 'navigate', location: match[1].trim() };
    }
  }

  // If text is short and looks like a place name (e.g. "Paris", "New York", "London")
  if (clean.length > 2 && clean.length < 35 && !clean.includes('hello') && !clean.includes('help')) {
    return { action: 'navigate', location: text.trim() };
  }

  return { action: 'unknown' };
};

export const parseVoiceCommand = async (text) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // If no API key or default placeholder, use smart local rule parser
  if (!apiKey || apiKey.includes('PASTE_YOUR') || apiKey.trim() === '') {
    console.log("Using local command parser (No API Key provided)");
    const localResult = parseLocally(text);
    if (localResult.action !== 'unknown') {
      return localResult;
    }
    return {
      action: 'unknown',
      message: 'Command not recognized. Try "Go to London", "Locate me", "Zoom in", or "Switch to 3D".'
    };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `You are an AI assistant for a Geospatial Map application. 
Convert the following natural language command into a JSON object.
The output MUST be a valid JSON with the following structure:
{
  "action": "navigate" | "zoom" | "switch_view" | "locate_me" | "nearby" | "unknown",
  "location": "string (optional, the place name to navigate to)",
  "zoom": "in" | "out" (optional),
  "view_mode": "2D" | "3D" (optional)
}

Instructions:
- Be robust to multiple languages (English, Hindi, Bengali). Extract semantic meaning.
- "zoom in" -> action: "zoom", zoom: "in"
- "fly to Mumbai" -> action: "navigate", location: "Mumbai"
- "switch to 3D" -> action: "switch_view", view_mode: "3D"
- "where am I", "my location", "locate me" -> action: "locate_me"
- "what is near me", "show nearby places", "nearby restaurants" -> action: "nearby"

User Command: "${text}"

Reply with ONLY raw JSON. Do not include markdown formatting like \`\`\`json.` }] }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("API returned an error, falling back to local parser:", data);
      return parseLocally(text);
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let rawText = data.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(rawText);
    } else {
      return parseLocally(text);
    }

  } catch (err) {
    console.warn("AI Fetch Error, fallback to local:", err);
    return parseLocally(text);
  }
};
