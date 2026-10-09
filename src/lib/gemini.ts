export function parseGeminiResponse(text: string): any {
  if (!text) throw new Error("Empty Gemini response");

  // Try to extract JSON from markdown if it exists anywhere in the text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let cleaned = jsonMatch ? jsonMatch[1] : text;

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse Gemini JSON. Raw text:", text);
    throw new Error("Invalid JSON format from Gemini");
  }
}

export async function callGemini(prompt: string, retries = 1): Promise<any | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("No GEMINI_API_KEY configured.");
    return null;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }, // Fixed camelCase
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return parseGeminiResponse(text);
    } catch (err: any) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, err.message);
      lastError = err;
      // Wait a bit before retrying (if we have retries left)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return null;
}
