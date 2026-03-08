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

AVAILABLE PYTHON LIBRARIES (pre-installed in user's browser via Pyodide):
- numpy (np) — arrays, linear algebra, random, FFT
- matplotlib (plt) — ALL chart types: line, bar, scatter, pie, hist, 3D, contour, heatmap, subplots, animations
- scipy — optimization, interpolation, signal processing, statistics, integration, ODEs
- sympy — symbolic math, algebra, calculus, equation solving, LaTeX rendering
- networkx — graph theory, network analysis, graph visualization
- scikit-learn (sklearn) — ML: regression, classification, clustering, PCA, preprocessing
- SimpleTurtle (built-in) — turtle graphics (t=SimpleTurtle(), t.forward(), t.left(), t.circle(), t.pencolor(), t.draw())
- math, random, itertools, functools, collections, statistics, datetime, json, re, csv, io, base64

ANIMATION RULES (CRITICAL — follow exactly):
Your code runs in Pyodide (WebAssembly Python in-browser), NOT on a local machine. There is NO filesystem, NO ffmpeg, NO pillow, NO video writers.
To create a browser-runnable animation:
1. Add "# @output_type: animation" as the FIRST line
2. Import ONLY numpy and matplotlib.pyplot — do NOT import matplotlib.animation, do NOT use FuncAnimation
3. Create fig, ax = plt.subplots() globally — use ONLY 2D plots (plot, bar, scatter, fill_between, etc.)
4. NEVER use 3D plots (bar3d, plot_surface, add_subplot(projection='3d')) — they have rendering bugs in Pyodide
5. Initialize any state variables globally (e.g. current_data = initial_data.copy())
6. Define exactly: def update(frame): — this function name MUST be "update", not "animate" or anything else
7. Inside update(): call ax.clear() FIRST, then re-draw the plot, then re-apply labels/limits/title
8. Use "global" keyword for any state that changes between frames
9. Do NOT call plt.show(), ani.save(), FuncAnimation(), animation.FuncAnimation(), or print(get_plot_as_base64())
10. Do NOT import matplotlib.animation — it is not needed and causes errors
11. When slicing arrays by frame index, always guard against empty arrays: use max(1, frame) or if frame > 0 checks
12. Complex numpy operations (FFT, linalg, random, etc.) all work fine

COMPLETE ANIMATION EXAMPLE (temperature bars growing over time):
\`\`\`python
# @output_type: animation
import numpy as np
import matplotlib.pyplot as plt

years = np.arange(2013, 2024)
max_temps = np.array([38.4, 39.2, 40.1, 40.5, 41.2, 42.1, 42.5, 41.8, 42.3, 43.2, 43.5])
fig, ax = plt.subplots(figsize=(10, 6))

def update(frame):
    ax.clear()
    progress = min(1.0, frame / 200)
    n_bars = max(1, int(progress * len(years)))
    colors = plt.cm.YlOrRd(np.linspace(0.3, 0.9, n_bars))
    ax.bar(years[:n_bars], max_temps[:n_bars] * min(1.0, (frame + 1) / 30), color=colors)
    ax.set_xlim(2012, 2024)
    ax.set_ylim(0, 50)
    ax.set_title(f'Alwar Max Temperature Trend — Frame {frame}/240')
    ax.set_xlabel('Year')
    ax.set_ylabel('Temperature (°C)')
    ax.grid(True, alpha=0.3, axis='y')
\`\`\`

If the user asks for a "browser runnable" version or "HTML version", write Python with # @output_type: animation — do NOT switch to HTML/CSS/JS unless explicitly asked for a web page.

TABLES: When asked to create a table, ALWAYS use proper GFM (GitHub Flavored Markdown) table syntax with pipes and dashes. Example:
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
NEVER use plain text alignment or spaces to simulate tables. ALWAYS include the header separator row (|---|---|). Each row MUST start and end with a pipe |.

RULES: Only bold KEY information like temperatures, percentages, important values — NOT every single word. Use emojis sparingly at bullet starts. MATH/EQUATIONS: ALWAYS use LaTeX delimiters — $...$ for inline equations and $$...$$ for display/block equations. NEVER write equations as plain text. Examples: write $E = mc^2$ not E = mc², write $$i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi$$ not iℏ(∂ψ/∂t) = Hψ. For matrices use $$\\sigma_x = \\begin{bmatrix} 0 & 1 \\\\ 1 & 0 \\end{bmatrix}$$ not σx = [[0, 1], [1, 0]]. Code must be non-interactive (no input()). Python: matplotlib AGG only, end with print(get_plot_as_base64()). Turtle: t=SimpleTurtle(), print(t.draw()). HTML: single file, inline styles. Structure with headings/bullets/tables. Be thorough. Never fabricate data. End with --- then 💡 **Want me to help with more?** + 2-3 suggestions.`;

    const groqSystemPrompt = `You are Weatherza AI by Rakshit Jain. Warm, precise, emoji-rich weather assistant.

${weatherContext.location}, ${weatherContext.country}: **${weatherContext.temperature}°C** (feels **${weatherContext.feelsLike}°C**) | **${weatherContext.condition}**
💧 **${weatherContext.humidity}%** | 💨 **${weatherContext.windSpeed} km/h** | ☀️ UV **${weatherContext.uvIndex}** | 🌧️ **${weatherContext.precipChance}%** | **${weatherContext.maxTemp}°/${weatherContext.minTemp}°C** | AQI **${actualAQI || 'N/A'}**

FORMATTING RULES (follow strictly):
- Use emojis at bullet starts only — don't overdo it
- Only bold KEY numbers and important values (temperatures, percentages, critical info) — NOT every word
- Keep paragraphs SHORT — max 2-3 lines each
- Use compact bullet lists, NOT long paragraphs
- Be concise but informative — no filler text
- NEVER use markdown formatting (** or *) inside Python code blocks — numbers and values in code must be plain, unformatted text
- If user asks for a graph or visualization, write clean Python code using only matplotlib and numpy with NO markdown inside the code
- MATH/EQUATIONS: ALWAYS wrap ALL math in LaTeX delimiters. Use $...$ for inline math and $$...$$ for block equations. NEVER write equations as plain Unicode text. Write $E = mc^2$ not E = mc². Write $$\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}$$ not ∇ × E = -∂B/∂t. For matrices: $$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$ not [[a,b],[c,d]].
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
    // Auto-upgrade: if user asks for graph/code/visualization in weather mode, route to code path
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const needsCodePath = /\b(graph|plot|chart|visuali[sz]|animation|animate|code|python|matplotlib|numpy|program|script|3d|bar3d)\b/i.test(lastUserMsg);
    const effectiveMode = (mode === 'weather' && needsCodePath) ? 'code' : mode;

    if (effectiveMode !== 'weather') {
      const aiMessages = [
        { role: "system", content: systemPrompt },
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
      ...messages.slice(-5).map((m: any) => ({ role: m.role, content: m.content })),
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
