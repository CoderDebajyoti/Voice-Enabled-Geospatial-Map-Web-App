export const parseVoiceCommand = async (text) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('PASTE_YOUR')) {
    return { action: 'error', message: 'Gemini API key not configured. Please paste your key in .env and restart dev server.' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `You are an AI assistant for a 3D Geospatial Map application. 
Convert the following natural language command into a JSON object.
The output MUST be a valid JSON with the following structure:
{
  "action": "navigate" | "zoom" | "switch_view" | "locate_me" | "unknown",
  "location": "string (optional, the place name to navigate to)",
  "zoom": "in" | "out" (optional),
  "view_mode": "2D" | "3D" (optional)
}

Instructions:
- Be robust to different languages (English, Hindi, Bengali). Extract meaning and populate the English JSON correctly.
- If user says "zoom in", action is "zoom", zoom is "in".
- If user says "fly to Mumbai", action is "navigate", location is "Mumbai".
- If user says "switch to 3D", action is "switch_view", view_mode is "3D".
- If user asks where they are or says "my location", action is "locate_me".

User Command: "${text}"

Reply with ONLY raw JSON. Do not include markdown formatting like \`\`\`json.` }] }
        ]
      })
    });

    const data = await res.json();
    console.log("Gemini Native Response:", data);

    if (!res.ok) {
       console.error("API returned an error:", data);
       return { action: 'error', message: data.error?.message || `API Error: ${res.status}. Check API Key.` };
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let rawText = data.candidates[0].content.parts[0].text;
      // Safety: strip markdown json ticks if the model returns them
      rawText = rawText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(rawText);
    } else {
      console.error("Unexpected API response", data);
      return { action: 'error', message: 'Unexpected response format from API' };
    }

  } catch (err) {
    console.error("AI Fetch Error:", err);
    return { action: 'error', message: 'Failed to process command via AI API' };
  }
};
