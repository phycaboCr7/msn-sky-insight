/**
 * AI Service Layer
 * Provides Gemini (primary) → Groq (fallback) AI querying.
 * API keys are read from environment variables only – never hardcoded.
 */

export async function callGemini(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

export async function callGroq(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Groq failed: ${res.status}`);

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "No response";
}

/**
 * Smart query: tries Gemini first, falls back to Groq,
 * and returns a friendly message if both fail.
 */
export async function smartQuery(prompt: string): Promise<string> {
  try {
    return await callGemini(prompt);
  } catch (e) {
    console.warn("Gemini failed → switching to Groq", e);
    try {
      return await callGroq(prompt);
    } catch (e2) {
      console.error("Groq also failed", e2);
      return "⚠️ AI is temporarily unavailable. Please try again.";
    }
  }
}
