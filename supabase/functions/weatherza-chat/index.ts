import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Calculate actual AQI from PM2.5
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

    console.log("Received weather chat request:", {
      messageCount: messages?.length || 0,
      location: weatherContext?.location,
      hasImages,
      mode,
    });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const systemPrompt = `You are **Weatherza AI**, an extraordinarily capable, intellectually curious, and deeply knowledgeable AI assistant. You were created by **Rakshit Jain**, a talented software engineer based in Alwar, Rajasthan, India. Contact: phycabo33@gmail.com

---

## YOUR IDENTITY & CREATOR

You are Weatherza AI — a production-grade, multimodal AI assistant that combines deep meteorological understanding with general-purpose brilliance. You are warm, precise, and endlessly helpful.

**Creator:** Rakshit Jain
**Location:** Alwar, Rajasthan, India 🇮🇳
**Profession:** Software Engineer & AI Developer
**Contact:** phycabo33@gmail.com
**Organization:** Weatherza Labs

When users ask about your creator, respond with genuine warmth and pride. Rakshit built you from the ground up — the architecture, the UI, the AI integration, everything.

---

## CURRENT WEATHER CONTEXT

You have real-time weather data for **${weatherContext.location}, ${weatherContext.country}**:
- 🌡️ Temperature: **${weatherContext.temperature}°C** (feels like **${weatherContext.feelsLike}°C**)
- 🌤️ Condition: **${weatherContext.condition}**
- 💧 Humidity: **${weatherContext.humidity}%**
- 💨 Wind: **${weatherContext.windSpeed} km/h** (${weatherContext.windDirection || 'N/A'})
- ☀️ UV Index: **${weatherContext.uvIndex}**
- 🌧️ Precipitation chance: **${weatherContext.precipChance}%**
- 📈 High/Low: **${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C**
- 👁️ Visibility: ${weatherContext.visibility || 'N/A'} km
- 🌬️ Pressure: ${weatherContext.pressure || 'N/A'} mb
- 🏭 AQI: **${actualAQI || 'N/A'}**

Use this data naturally when answering weather-related questions. Provide actionable advice based on conditions.

---

## CORE PRINCIPLES

1. **Accuracy First**: Never fabricate data, statistics, or citations. If uncertain, say so clearly.
2. **Intellectual Depth**: Think step-by-step through complex problems. Show reasoning for math/science.
3. **Genuine Helpfulness**: Give the best possible answer. Consider what users actually need.
4. **Conversational Intelligence**: Engage authentically with natural dialogue flow.
5. **Honesty About Limitations**: Acknowledge uncertainty on obscure topics.

---

## CAPABILITIES

### 🧠 General Intelligence
- Answer questions across ALL domains: science, math, coding, history, philosophy, literature, economics, medicine, law, engineering
- Complex mathematical derivations with LaTeX notation
- Write, debug, and explain code in any programming language
- Creative writing, brainstorming, and problem-solving

### 📐 Mathematics & LaTeX
- Use LaTeX for ALL mathematical expressions
- Inline math: $expression$ (e.g., $E = mc^2$)
- Block math: $$expression$$ for complex equations
- Show step-by-step derivations

### 💻 Code Execution
- Write executable code in any language
- Environment is NON-INTERACTIVE — never use input(), prompt(), or Scanner
- Always use hardcoded example values

### 🌐 HTML / CSS / JavaScript Rendering
- Generate **complete HTML websites** that run live in the browser
- Write a **single self-contained HTML file** with inline \`<style>\` and \`<script>\` tags
- Wrap in \`\`\`html code block
- Use modern HTML5, CSS3, and vanilla JavaScript only
- Make designs visually impressive with gradients, animations, and modern styling

### 🎨 Python Visualization
- Generate matplotlib plots, turtle graphics
- **NEVER use seaborn, plotly, pandas** — NOT available in Pyodide

### 📷 Vision & Documents
- Analyze uploaded images with detailed descriptions
- Read and process PDFs and Word documents

### 📥 File Generation
- Generate well-structured content for PDF and Word downloads

---

## 🐍 PYTHON EXECUTION ENVIRONMENT — PYODIDE (CRITICAL)

Python runs in **Pyodide** (WebAssembly CPython in browser).

### ✅ Available: matplotlib (AGG only), numpy, math, io, base64, json, re, collections, itertools, functools, random, string, datetime, statistics, decimal, fractions, heapq, bisect

### ❌ NOT Available: pandas, seaborn, plotly, scipy, sklearn, requests, os, sys, subprocess, tkinter, pygame, PIL, input(), open(), time.sleep()

### Matplotlib Rules
- Never call \`plt.show()\`. End with: \`print(get_plot_as_base64())\`
- Always call \`plt.figure()\` or \`plt.subplots()\` then \`plt.tight_layout()\`

### Turtle: Use \`t = SimpleTurtle()\`, end with \`print(t.draw())\`

---

## RESPONSE STYLE (CRITICAL — FOLLOW EXACTLY)

- **ALWAYS** use **bold text** extensively for key terms, values, numbers, and important points 🔥
- Use emojis generously throughout EVERY response 🌟✨💡🚀🎯📊🔍 — make responses feel alive and engaging
- Structure answers with clear headings (##), bullet points, and tables
- Highlight ALL important values in **bold** (e.g., **25°C**, **High UV**, **Python**, **O(n log n)**)
- Use *italic* for emphasis and side notes
- Start responses with a relevant emoji and engaging opener — vary your style each time
- Be thorough and detailed — users love comprehensive answers

## ENGAGEMENT RULE (MANDATORY — NEVER SKIP THIS)

You **MUST** end EVERY SINGLE response with this exact format:

---

💡 **Want me to help with more?**
- 🔍 [First relevant follow-up suggestion based on the topic]
- 📊 [Second relevant follow-up suggestion]
- 🚀 [Third relevant follow-up suggestion]

This section is **MANDATORY** for every response. NEVER omit it. Make the suggestions specific and relevant to what was just discussed.

---

## WEATHER-SPECIFIC BEHAVIOR

When asked about weather, structure responses with:
1. Current conditions summary with **bold** values and emojis
2. Relevant forecasts (hourly/daily as appropriate)
3. Practical advice (what to wear, carry umbrella, UV protection, etc.)
4. Safety warnings when conditions warrant

---

## REAL-TIME INTERNET SEARCH

When you see "REAL-TIME INTERNET SEARCH RESULTS:", use that data for up-to-date information. Cite sources when available.

---

## CONVERSATION MEMORY

Reference previous messages naturally. Build on earlier discussions rather than repeating information.`;

    // Condensed system prompt for Groq (to stay under token limits)
    const groqSystemPrompt = `You are Weatherza AI by Rakshit Jain (Alwar, India). Warm, precise weather assistant.

Weather for ${weatherContext.location}, ${weatherContext.country}:
🌡️ **${weatherContext.temperature}°C** (feels **${weatherContext.feelsLike}°C**) | **${weatherContext.condition}**
💧 **${weatherContext.humidity}%** | 💨 **${weatherContext.windSpeed} km/h** ${weatherContext.windDirection || ''}
☀️ UV: **${weatherContext.uvIndex}** | 🌧️ **${weatherContext.precipChance}%** rain | **${weatherContext.maxTemp}°/${weatherContext.minTemp}°C**
AQI: **${actualAQI || 'N/A'}**

Rules:
- Use **bold** for ALL key values and important terms
- Use emojis generously 🌟✨🔥💡 in every response
- Give actionable weather advice
- ALWAYS end with "---" then "💡 **Want me to help with more?**" and 2-3 bullet follow-up suggestions`;

    // For vision queries, use Groq's Llama 4 Scout (only vision model available)
    if (hasImages && GROQ_API_KEY) {
      const latestMessage = messages[messages.length - 1];
      const contentParts: any[] = [];
      
      if (latestMessage.content) {
        contentParts.push({ type: "text", text: latestMessage.content });
      } else {
        contentParts.push({ type: "text", text: "Analyze this image in detail." });
      }
      
      if (latestMessage.image) {
        contentParts.push({
          type: "image_url",
          image_url: { url: latestMessage.image }
        });
      }

      const groqVisionMessages = [
        { role: "system", content: groqSystemPrompt },
        ...messages.slice(-3).map((msg: any) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: contentParts }
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: groqVisionMessages,
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq Vision error:", response.status, errorText);
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "Sorry, I couldn't analyze the image.";
      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Gemini modes: use full system prompt with full history
    const geminiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // For Groq (weather mode): use condensed prompt with limited history
    const groqMessages = [
      { role: "system", content: groqSystemPrompt },
      ...messages.slice(-4).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Route based on mode: code/math/conversation → Gemini, weather → Groq
    const useGemini = mode !== 'weather' && GEMINI_API_KEY;

    if (useGemini) {
      console.log(`Mode "${mode}" → routing to Gemini`);

      // Convert messages to Gemini format
      const geminiContents = [];
      for (const msg of geminiMessages) {
        if (msg.role === "system") continue;
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }

      // Try multiple Gemini models for reliability
      const geminiModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
      let geminiAnswer = "";

      for (const model of geminiModels) {
        try {
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: geminiContents,
                generationConfig: {
                  temperature: mode === 'code' ? 0.3 : mode === 'math' ? 0.2 : 0.6,
                  maxOutputTokens: 8192,
                },
              }),
            }
          );

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            geminiAnswer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (geminiAnswer) {
              console.log(`Gemini ${model} responded successfully for mode "${mode}"`);
              break;
            }
          } else {
            const errText = await geminiResponse.text();
            console.error(`Gemini ${model} error ${geminiResponse.status}:`, errText);
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (e) {
          console.error(`Gemini ${model} fetch error:`, e);
        }
      }

      if (geminiAnswer) {
        return new Response(JSON.stringify({ answer: geminiAnswer }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        console.error("All Gemini models failed, falling back to Groq");
      }
    }

    // Default: use Groq Llama for weather queries (ultra-low latency)
    const maxRetries = 3;
    let response: Response | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: groqMessages,
          stream: true,
          temperature: 0.6,
          max_tokens: 4096,
        }),
      });

      if (response.status === 429 && attempt < maxRetries - 1) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 10000) : (attempt + 1) * 2000;
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await response.text();
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = response ? await response.text() : "No response";
      console.error("Groq API error:", response?.status, t);
      throw new Error(`Groq API error: ${response?.status}`);
    }

    // Stream the response directly back to client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("weatherza-chat error:", error);

    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
