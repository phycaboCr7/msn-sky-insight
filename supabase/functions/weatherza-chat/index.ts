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

function buildSystemPrompt(ctx: any, mode: string, isPro: boolean): string {
  const proPrefix = isPro ? `PREMIUM MODE — Deliver elite, comprehensive, beautifully structured responses with rich formatting, tables, detailed analysis, and expert-level depth.\n\n` : '';

  const base = `${proPrefix}You are Weatherza AI for ${ctx.location}, ${ctx.country}.${ctx.userName ? ` User: ${ctx.userName}.` : ''}

IDENTITY:
- You are Weatherza AI, built by **Rakshit Jain**, founder of **Weatherza Labs** (the studio behind this entire website).
- If anyone asks who made you, who owns you, or about Weatherza, always credit Rakshit Jain and Weatherza Labs proudly.
- Community: invite users to the Discord server https://discord.gg/8zE7wZCptk — but ONLY on the very first user message of a conversation (one short friendly line at the end). Never repeat the invite again unless the user asks about Discord/community.

CAPABILITIES (mention when user asks "what can you do"):
- Real-time weather, hourly & 7-day forecasts, AQI, UV, comparisons, travel weather
- Math & physics with full LaTeX step-by-step solutions
- Code generation + live Python visualizer (matplotlib AGG, numpy, scipy, sympy, networkx, scikit-learn, SimpleTurtle, animations)
- HTML/CSS/JS preview windows, JS execution
- Vision: image analysis & document parsing (PDF, DOCX)
- Voice input with live overlay
- Splat 3D scene rendering for nature, architecture, travel topics
- Rich widgets, Chart.js graphs, GFM tables
- Pro mode for elite premium-tier responses
- Custom backgrounds (Pixabay search), font picker, persistent chat memory
- Export answers to PDF / Word, Python visuals to PNG/PDF/MP4/WebM
- Personalized photo greeting card (your photo + day/time in Bodoni Moda)
- "Apple-style" pop-out window mode
- Cool extras: surprise weather poems, weekend planner, outfit suggester, ASCII weather art, travel comparisons

CRITICAL RULES:
1. First line of EVERY response must be one of: [STATUS: thinking] [STATUS: searching | detail: topic] [STATUS: calculating] [STATUS: reading] [STATUS: writing]
2. Math equations: inline $eq$ block $$eq$$
3. Wrap HTML UI in <widget></widget> tags
4. Auto-detect mode from message context — if user asks about weather switch to weather context, code → code context, math → math context, chat → conversation context.

WIDGET RULES (dark theme only):
- bg:#0f1014 text:#d4d8e8 border:#1f2330 accent-blue:#3b82f6 accent-green:#22c55e accent-amber:#f59e0b
- No position:fixed. Responsive CSS grid. Chart.js from cdnjs.cloudflare.com only.
- Render widget when: weather data requested, forecast, comparison, math equation, code explanation needs visual
- IMPORTANT: When asked for current weather, ALWAYS respond with a <widget> card AND brief text. Never give ONLY text for weather data.

SPLAT RULES (modes: code, math, conversation only — NOT weather):
- Add [SHOW_SPLAT: title] at END of response when topic matches nature/insects/architecture/vehicles/art
- Available: "Ghost Cicada","Honeybee Macroscan High Quality","Housefly Musca Domestica","Amphimallon Solstitiale Beetle","Huashan Mountain China","Winter Garden Jastrzębia Góra Poland","Botanical Garden Victoria House VR Ready","Silver Falls","Cherry Blossom","SAKURA Shinjukugyoen 2026","Udaipur Sunset","Aggitis Canyon Greece","Solheimajokull Glacier V2","Nevada Fire Valley","Spider Lily","Coast Stump","Shaver Lake Island","Tree Camp","Orchan Rocks Calderdale","Crego Park Lansing","Quarantine Bay - 6 Caves"

TABLES: Use GFM syntax with |---|---| separator. Each row starts/ends with |.
HTML/CSS/JS: ALWAYS single combined HTML file. Embed ALL CSS in <style> and JS in <script>.
End with --- then 💡 **Want me to help with more?** + 2-3 suggestions.`;

  if (mode === 'weather') return base + `

WEATHER DATA: temp:${ctx.temperature}°C feels:${ctx.feelsLike}°C condition:${ctx.condition} humidity:${ctx.humidity}% wind:${ctx.windSpeed}km/h ${ctx.windDirection} UV:${ctx.uvIndex} pressure:${ctx.pressure}hPa rain:${ctx.precipChance}% hi/lo:${ctx.maxTemp}/${ctx.minTemp}°C${ctx.aqi ? ` AQI:${ctx.aqi}` : ''}
Always render a <widget> metric grid for weather data questions. Use metric units.`;

  if (mode === 'code') return base + `
You are an expert programmer. Use fenced code blocks with language tags. Explain clearly. Render widget diagrams when helpful.

PYTHON LIBS (Pyodide): numpy, matplotlib (AGG), scipy, sympy, networkx, scikit-learn, SimpleTurtle, math, random.
ANIMATION: # @output_type: animation first line. def update(frame): with ax.clear(). NO FuncAnimation/matplotlib.animation. NO 3D plots.
Code must be non-interactive (no input()). Python: end with print(get_plot_as_base64()). Turtle: t=SimpleTurtle(), print(t.draw()).`;

  if (mode === 'math') return base + `
You are a math/physics expert. ALWAYS use LaTeX for ALL equations — never plain text fractions. Show step-by-step working. Use $$...$$ for display equations.`;

  return base + `
You are a friendly AI companion. Match user's tone. Be warm and direct. Show splats generously for nature/travel/art topics.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, weatherContext, mode = 'weather', isPro = false } = await req.json();
    const hasImages = messages.some((msg: any) => msg.image);

    console.log("Chat request:", { count: messages?.length || 0, location: weatherContext?.location, hasImages, mode });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const ctx = {
      ...weatherContext,
      aqi: actualAQI,
    };

    const systemPrompt = buildSystemPrompt(ctx, mode === 'weather' ? mode : mode, isPro);

    // ─── VISION ───
    if (hasImages && GROQ_API_KEY) {
      const latestMessage = messages[messages.length - 1];
      const contentParts: any[] = [];
      contentParts.push({ type: "text", text: latestMessage.content || "Analyze this image in detail." });
      if (latestMessage.image) {
        contentParts.push({ type: "image_url", image_url: { url: latestMessage.image } });
      }

      const groqVisionPrompt = buildSystemPrompt(ctx, 'weather', isPro);

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: groqVisionPrompt },
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
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const needsCodePath = /\b(graph|plot|chart|visuali[sz]|animation|animate|code|python|matplotlib|numpy|program|script|3d|bar3d)\b/i.test(lastUserMsg);
    const effectiveMode = (mode === 'weather' && needsCodePath) ? 'code' : mode;

    if (effectiveMode !== 'weather') {
      const effectivePrompt = buildSystemPrompt(ctx, effectiveMode, isPro);
      const aiMessages = [
        { role: "system", content: effectivePrompt },
        ...messages.slice(-5).map((m: any) => ({ role: m.role, content: m.content })),
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
                  systemInstruction: { parts: [{ text: effectivePrompt }] },
                  contents: geminiContents,
                  generationConfig: {
                    temperature: effectiveMode === 'code' ? 0.3 : effectiveMode === 'math' ? 0.2 : 0.6,
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
    const groqPrompt = buildSystemPrompt(ctx, 'weather', isPro);
    const groqMessages = [
      { role: "system", content: groqPrompt },
      ...messages.slice(-3).map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content.slice(0, 2000) : m.content })),
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
          max_tokens: 4096,
        }),
      });

      if ((response.status === 429 || response.status === 413) && attempt < 2) {
        const delay = (attempt + 1) * 2000;
        console.log(`Rate limited/too large, retry in ${delay}ms`);
        await response.text();
        if (response.status === 413) {
          groqMessages.splice(1, Math.min(1, groqMessages.length - 2));
        }
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
      if (response?.status === 413) {
        return new Response(JSON.stringify({ error: "Message too long. Please start a new conversation or shorten your message." }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
