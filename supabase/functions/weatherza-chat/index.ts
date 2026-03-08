import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const calculateAQI = (pm25: number): number => {
  const breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, weatherContext, mode = 'weather' } = await req.json();
    const hasImages = messages.some((msg: any) => msg.image);

    console.log("Chat request:", { count: messages?.length || 0, location: weatherContext?.location, hasImages, mode });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const systemPrompt = `You are Weatherza AI by Rakshit Jain (Weatherza Labs). Contact: phycabo33@gmail.com

WEATHER: ${weatherContext.location}, ${weatherContext.country} | ${weatherContext.temperature}°C (feels ${weatherContext.feelsLike}°C) | ${weatherContext.condition} | 💧${weatherContext.humidity}% | 💨${weatherContext.windSpeed}km/h | UV ${weatherContext.uvIndex} | Rain ${weatherContext.precipChance}% | Hi/Lo ${weatherContext.maxTemp}°/${weatherContext.minTemp}°C | AQI ${actualAQI || 'N/A'}

RULES: Only bold KEY information like temperatures, percentages, important values — NOT every single word. Use emojis sparingly at bullet starts. LaTeX for math ($inline$, $$block$$). Code must be non-interactive (no input()). Python: matplotlib AGG only, end with print(get_plot_as_base64()). Turtle: t=SimpleTurtle(), print(t.draw()). HTML: single file, inline styles. Structure with headings/bullets/tables. Be thorough. Never fabricate data. End with --- then 💡 **Want me to help with more?** + 2-3 suggestions.`;

    const groqSystemPrompt = `You are Weatherza AI by Rakshit Jain. Warm, precise, emoji-rich weather assistant.

${weatherContext.location}, ${weatherContext.country}: **${weatherContext.temperature}°C** (feels **${weatherContext.feelsLike}°C**) | **${weatherContext.condition}**
💧 **${weatherContext.humidity}%** | 💨 **${weatherContext.windSpeed} km/h** | ☀️ UV **${weatherContext.uvIndex}** | 🌧️ **${weatherContext.precipChance}%** | **${weatherContext.maxTemp}°/${weatherContext.minTemp}°C** | AQI **${actualAQI || 'N/A'}**

FORMATTING RULES (follow strictly):
- Use emojis at bullet starts only — don't overdo it
- Only bold KEY numbers and important values (temperatures, percentages, critical info) — NOT every word
- Keep paragraphs SHORT — max 2-3 lines each
- Use compact bullet lists, NOT long paragraphs
- Be concise but informative — no filler text
- ALWAYS end with --- then 💡 **Want me to help with more?** + 2-3 suggestions`;

    // ─── VISION ───
    if (hasImages && GROQ_API_KEY) {
      const latestMessage = messages[messages.length - 1];
      const contentParts: any[] = [];
      contentParts.push({ type: "text", text: latestMessage.content || "Analyze this image in detail." });
      if (latestMessage.image) {
        contentParts.push({ type: "image_url", image_url: { url: latestMessage.image } });
      }

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: groqSystemPrompt },
            ...messages.slice(-3).map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: contentParts }
          ],
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (!resp.ok) throw new Error(`Vision API error: ${resp.status}`);
      const data = await resp.json();
      return new Response(JSON.stringify({ answer: data.choices?.[0]?.message?.content || "Sorry, I couldn't analyze the image." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE ROUTING ───
    // code/math/conversation → Lovable AI Gateway (primary) → Gemini (fallback) → Groq (last resort)
    // weather → Groq (fast streaming)

    if (mode !== 'weather') {
      const aiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-4).map((m: any) => ({ role: m.role, content: m.content })),
      ];

      // Try Lovable AI Gateway first
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log(`Mode "${mode}" → Lovable AI Gateway`);
        try {
          const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: aiMessages,
              stream: true,
              max_tokens: 16384,
            }),
          });

          if (gatewayResp.ok && gatewayResp.body) {
            console.log("Lovable AI Gateway streaming response");
            return new Response(gatewayResp.body, {
              headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
            });
          }

          // Handle rate limits
          if (gatewayResp.status === 429) {
            console.warn("Lovable AI rate limited, falling back to Gemini");
          } else if (gatewayResp.status === 402) {
            console.warn("Lovable AI payment required, falling back to Gemini");
          } else {
            const errText = await gatewayResp.text();
            console.error(`Lovable AI error ${gatewayResp.status}:`, errText);
          }
        } catch (e) {
          console.error("Lovable AI Gateway fetch error:", e);
        }
      }

      // Fallback: Gemini
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (GEMINI_API_KEY) {
        console.log(`Falling back to Gemini for mode "${mode}"`);
        const geminiContents = aiMessages
          .filter(m => m.role !== "system")
          .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

        const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash"];
        for (const model of geminiModels) {
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  contents: geminiContents,
                  generationConfig: {
                    temperature: mode === 'code' ? 0.3 : mode === 'math' ? 0.2 : 0.6,
                    maxOutputTokens: 16384,
                  },
                }),
              }
            );
            if (resp.ok) {
              const data = await resp.json();
              const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (answer) {
                console.log(`Gemini ${model} success`);
                return new Response(JSON.stringify({ answer }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
            } else {
              console.error(`Gemini ${model} error ${resp.status}`);
              await new Promise(r => setTimeout(r, 500));
            }
          } catch (e) {
            console.error(`Gemini ${model} error:`, e);
          }
        }
        console.error("All Gemini models failed, falling back to Groq");
      }
    }

    // ─── GROQ WEATHER (fast streaming) ───
    const groqMessages = [
      { role: "system", content: groqSystemPrompt },
      ...messages.slice(-4).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: groqMessages,
          stream: true,
          temperature: 0.5,
          max_tokens: 8192,
        }),
      });

      if (response.status === 429 && attempt < 2) {
        const delay = (attempt + 1) * 2000;
        console.log(`Rate limited, retry in ${delay}ms`);
        await response.text();
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = response ? await response.text() : "No response";
      console.error("Groq error:", response?.status, t);
      throw new Error(`Groq API error: ${response?.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("weatherza-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
