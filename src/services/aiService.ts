/**
 * AI Service Layer
 *
 * All AI calls are routed through the weatherza-chat Supabase edge function,
 * which securely holds API keys (GROQ_API_KEY, GEMINI_API_KEY, LOVABLE_API_KEY)
 * server-side. No API keys are ever exposed to the browser.
 */

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weatherza-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Calls the weatherza-chat edge function (non-streaming).
 * Returns the AI's text response.
 */
export async function smartQuery(prompt: string): Promise<string> {
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        weatherContext: {},
        mode: "conversation",
        isPro: false,
      }),
    });

    if (!res.ok) throw new Error(`Edge function error: ${res.status}`);

    const contentType = res.headers.get("Content-Type") || "";

    // Non-streaming path (Gemini / Lovable returns JSON {answer})
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return data?.answer || data?.text || "No response";
    }

    // Streaming path – read full SSE stream and concatenate
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const data = JSON.parse(jsonStr);
          fullText += data.choices?.[0]?.delta?.content || "";
        } catch {
          // ignore malformed SSE lines
        }
      }
    }

    return fullText || "No response";
  } catch (e) {
    console.error("smartQuery failed", e);
    return "⚠️ AI is temporarily unavailable. Please try again.";
  }
}
