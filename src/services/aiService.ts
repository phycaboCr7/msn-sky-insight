/**
 * aiService.ts
 *
 * Provides a resilient AI query helper with a Gemini → Groq fallback chain.
 * Use `smartQuery(prompt, messages?)` wherever you need a best-effort AI response
 * without worrying about individual API failures.
 */

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/** Generic fetch wrapper that returns the parsed JSON body or null on any error. */
export async function safeFetch(url: string, options: RequestInit): Promise<unknown> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
}

/** Call Google Gemini (requires VITE_GEMINI_API_KEY env var). Returns null on failure. */
export async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const data = await safeFetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text : null;
}

/** Call Groq (requires VITE_GROQ_API_KEY env var). Returns null on failure. */
export async function callGroq(
  messages: ConversationMessage[]
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const data = await safeFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages,
    }),
  });

  const content = (data as any)?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

/**
 * Smart query with automatic fallback:
 * 1. Tries Gemini (with full conversation as a single text prompt)
 * 2. Falls back to Groq (with full message history for proper context)
 * 3. Returns a friendly message if both fail
 *
 * @param lastUserMessage - The latest user message (used as Gemini prompt)
 * @param history         - Full conversation history (used by Groq for context)
 */
export async function smartQuery(
  lastUserMessage: string,
  history: ConversationMessage[] = []
): Promise<string> {
  // Build a single text prompt that includes conversation context for Gemini
  const contextualPrompt =
    history.length > 0
      ? history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") +
        `\nUser: ${lastUserMessage}`
      : lastUserMessage;

  let res = await callGemini(contextualPrompt);
  if (res) return res;

  console.warn("Gemini failed → falling back to Groq");

  // Pass the full history (including latest message) to Groq
  const groqMessages: ConversationMessage[] =
    history.length > 0
      ? [...history, { role: "user", content: lastUserMessage }]
      : [{ role: "user", content: lastUserMessage }];

  res = await callGroq(groqMessages);
  if (res) return res;

  return "⚠️ AI is busy. Please try again in a moment.";
}
