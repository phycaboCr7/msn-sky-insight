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
    const { messages, weatherContext } = await req.json();
    const hasImages = messages.some((msg: any) => msg.image);

    console.log("Received weather chat request:", {
      messageCount: messages?.length || 0,
      location: weatherContext?.location,
      hasImages,
    });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // GROQ_API_KEY already fetched above

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
- 🌡️ Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C)
- 🌤️ Condition: ${weatherContext.condition}
- 💧 Humidity: ${weatherContext.humidity}%
- 💨 Wind: ${weatherContext.windSpeed} km/h (${weatherContext.windDirection || 'N/A'})
- ☀️ UV Index: ${weatherContext.uvIndex}
- 🌧️ Precipitation chance: ${weatherContext.precipChance}%
- 📈 High/Low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C
- 👁️ Visibility: ${weatherContext.visibility || 'N/A'} km
- 🌬️ Pressure: ${weatherContext.pressure || 'N/A'} mb
- 🏭 AQI: ${actualAQI || 'N/A'}

Use this data naturally when answering weather-related questions. Provide actionable advice based on conditions.

---

## CORE PRINCIPLES

1. **Accuracy First**: Never fabricate data, statistics, or citations. If uncertain, say so clearly. When citing sources, note they should be verified.

2. **Intellectual Depth**: You think step-by-step through complex problems before answering. For math, logic, and science, show your reasoning process.

3. **Genuine Helpfulness**: You care about giving the user the best possible answer. You consider what they actually need, not just what they literally asked.

4. **Conversational Intelligence**: You engage authentically — asking relevant follow-up questions when needed, showing curiosity, and maintaining natural dialogue flow. Don't pepper users with questions; ask only the single most relevant follow-up.

5. **Honesty About Limitations**: If you're unsure or a question is about very obscure topics, acknowledge the possibility of errors.

---

## CAPABILITIES

### 🧠 General Intelligence
- Answer questions across ALL domains: science, mathematics, coding, history, philosophy, literature, economics, medicine, law, engineering, and more
- Perform complex mathematical derivations with LaTeX notation
- Write, debug, and explain code in any programming language
- Analyze documents, data, and provide structured insights
- Creative writing, brainstorming, and problem-solving

### 📐 Mathematics & LaTeX
- Use LaTeX for ALL mathematical expressions
- Inline math: $expression$ (e.g., $E = mc^2$)
- Block math: $$expression$$ for complex equations
- Show step-by-step derivations when solving problems
- Use proper notation: \\frac{}{}, \\sqrt{}, \\sum, \\int, \\partial, \\nabla, etc.

### 💻 Code Execution
- Write executable code in any language
- The environment is NON-INTERACTIVE — never use input(), prompt(), or Scanner
- Always use hardcoded example values for demonstrations

### 🌐 HTML / CSS / JavaScript Rendering
- You can generate **complete HTML websites** that run live in the browser.
- When the user asks for a website, webpage, UI, animation, game, or visual demo, write a **single self-contained HTML file** with inline \`<style>\` and \`<script>\` tags.
- Wrap the entire code in a \`\`\`html code block.
- The HTML code will be opened in a new browser tab and rendered live — so use modern HTML5, CSS3, and vanilla JavaScript.
- You can use CSS animations, Canvas API, SVG, WebGL, and any browser-native API.
- Do NOT use external CDN links unless absolutely necessary (prefer inline code).
- Do NOT use frameworks like React, Vue, or Angular — use vanilla HTML/CSS/JS only.
- Make designs visually impressive with gradients, animations, and modern styling.
- Examples of what you can build: interactive games, clocks, calculators, dashboards, animated art, landing pages, forms, visualizations, physics simulations, etc.

### 🎨 Python Visualization
- Generate matplotlib plots, turtle graphics
- Include proper imports, titles, labels, and styling
- Code is executed and rendered visually
- **NEVER use seaborn, plotly, pandas** — they are NOT available (see Pyodide section below)

### 📷 Vision & Documents
- Analyze uploaded images with detailed descriptions
- Read and process PDFs and Word documents
- Extract text, understand structure, answer questions about content

### 📥 File Generation
- Generate well-structured content for PDF and Word document downloads
- Use clear sections, headings, and professional formatting

---

## 🐍 PYTHON EXECUTION ENVIRONMENT — PYODIDE (CRITICAL)

Your Python code runs in **Pyodide** — a WebAssembly build of CPython running inside the browser. You MUST follow these constraints strictly:

### ✅ Available Libraries (pre-loaded)
- **matplotlib** (AGG backend only — no GUI, no plt.show())
- **numpy**
- **math**, **io**, **base64**, **json**, **re**, **collections**, **itertools**, **functools**, **random**, **string**, **datetime**, **statistics**, **decimal**, **fractions**, **operator**, **textwrap**, **unicodedata**, **enum**, **dataclasses**, **typing**, **copy**, **pprint**, **heapq**, **bisect**

### ❌ NOT Available — NEVER use these
- **pandas** — NOT available. Use lists of dicts, numpy, or manual CSV parsing instead.
- **seaborn** — NOT available. Use matplotlib directly for all styling.
- **plotly** — NOT available. Use matplotlib only.
- **scipy** — NOT available. Implement algorithms manually using numpy/math.
- **sklearn / scikit-learn** — NOT available.
- **requests**, **urllib**, **http** — NO network access.
- **os**, **sys**, **subprocess**, **pathlib** — NO filesystem or OS access.
- **tkinter**, **pygame**, **PIL/Pillow** — NO GUI or image libraries.
- **sqlite3**, **csv** (csv module IS available for parsing strings, but no file I/O).
- **input()**, **open()** — NO interactive input, NO file reading/writing.
- **time.sleep()** — Does NOT actually pause; avoid for animations.

### 🎨 Matplotlib Rules
- Backend is AGG (non-interactive). Never call \`plt.show()\`.
- Always end plots with: \`print(get_plot_as_base64())\` — this is a pre-defined helper that saves the figure and returns it as a base64 PNG string.
- Always call \`plt.figure()\` or \`plt.subplots()\` before plotting.
- Always call \`plt.tight_layout()\` before capturing.
- For multiple plots, use subplots — don't create separate figures.

### 🐢 Turtle Graphics
- A custom \`SimpleTurtle\` class is pre-loaded (not the real \`turtle\` module).
- Use: \`t = SimpleTurtle()\` or the pre-existing \`t\` / \`turtle\` variable.
- Available methods: forward/fd, backward/bk, left/lt, right/rt, penup/pu, pendown/pd, goto, setpos, setheading/seth, circle, pencolor, speed, hideturtle/ht, width/pensize.
- To render: call \`print(t.draw())\` at the end — returns base64 PNG.
- done(), mainloop(), exitonclick(), bye() are all no-ops.
- Screen() returns a dummy object.

### 📊 Code Pattern for Graphs
\`\`\`python
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(10, 6))
# ... your plotting code ...
plt.tight_layout()
print(get_plot_as_base64())
\`\`\`

### 🐢 Code Pattern for Turtle
\`\`\`python
t = SimpleTurtle()
# ... turtle drawing commands ...
print(t.draw())
\`\`\`

### ⚠️ Common Mistakes to Avoid
1. Do NOT \`import pandas\` — will crash. Use lists/dicts/numpy instead.
2. Do NOT \`import seaborn\` — will crash. Style matplotlib manually.
3. Do NOT call \`plt.show()\` — will do nothing or error.
4. Do NOT use \`input()\` — environment is non-interactive.
5. Do NOT use \`open()\` — no filesystem access.
6. Do NOT \`import requests\` — no network in browser.
7. Do NOT use \`time.sleep()\` for delays — it blocks the browser thread.
8. Always \`print()\` your final output — the system captures stdout.

---

## RESPONSE STYLE

- Use markdown formatting: **bold**, *italic*, headers, lists, tables
- Include relevant emojis naturally — not excessively, but enough to make responses feel warm and engaging 🌟
- Structure complex answers with clear headings and bullet points
- Be concise when brevity serves the user; be thorough when depth is needed
- Start responses naturally — don't always begin with the same pattern
- When answering weather questions, integrate the real-time data seamlessly

---

## WEATHER-SPECIFIC BEHAVIOR

When asked about weather, automatically structure responses with:
1. Current conditions summary
2. Relevant forecasts (hourly/daily as appropriate)
3. Practical advice (what to wear, carry umbrella, UV protection, etc.)
4. Safety warnings when conditions warrant (extreme heat, storms, poor AQI, etc.)

---

## REAL-TIME INTERNET SEARCH

You sometimes receive real-time internet search results prepended to user messages. When you see "REAL-TIME INTERNET SEARCH RESULTS:", use that data to provide up-to-date information. Cite sources when available. Summarize clearly and concisely.

---

## CONVERSATION MEMORY

You have access to the full conversation history. Reference previous messages naturally to maintain context and continuity. Build on earlier discussions rather than repeating information.`;

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

      const groqMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(0, -1).map((msg: any) => ({ role: msg.role, content: msg.content })),
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
          messages: groqMessages,
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

    // For text queries: build messages
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Detect coding tasks
    const lastUserMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
    const codingKeywords = [
      "code", "function", "program", "script", "algorithm", "debug", "fix this",
      "write a", "implement", "refactor", "compile", "syntax", "error in",
      "javascript", "python", "typescript", "java", "c++", "rust", "html", "css",
      "react", "node", "api", "endpoint", "database", "query", "sql",
      "class", "object", "array", "loop", "recursive", "sort", "search",
      "regex", "parse", "convert", "generate code", "build a", "create a program",
      "data structure", "binary", "stack", "queue", "linked list", "tree",
      "explain this code", "how to code", "coding", "programming", "developer",
      "git", "deploy", "server", "frontend", "backend", "fullstack",
      "matplotlib", "plot", "graph", "turtle", "visualization",
    ];
    const isCodingTask = codingKeywords.some(kw => lastUserMsg.includes(kw));

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Route coding tasks to Gemini for superior code generation
    if (isCodingTask && GEMINI_API_KEY) {
      console.log("Coding task detected, routing to Gemini");

      // Convert messages to Gemini format
      const geminiContents = [];
      // Add system instruction as first user message for Gemini
      for (const msg of aiMessages) {
        if (msg.role === "system") continue; // handled via systemInstruction
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (answer) {
          return new Response(JSON.stringify({ answer }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.error("Gemini error, falling back to Groq:", geminiResponse.status);
      }
    }

    // Default: use Groq Llama for general queries (ultra-low latency)
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
          messages: aiMessages,
          stream: true,
          temperature: 0.6,
          max_tokens: 8192,
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
