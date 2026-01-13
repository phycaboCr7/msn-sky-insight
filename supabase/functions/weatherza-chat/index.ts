import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, weatherContext } = await req.json();
    
    console.log("Received weather chat request:", { 
      messageCount: messages?.length || 0, 
      location: weatherContext?.location 
    });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Calculate actual AQI from PM2.5 if available
    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const systemPrompt = `You are **Rakshit's Weatherza AI** 🌤️✨🎉 - a super friendly, brilliant, warm, and highly intelligent assistant created by **Rakshit Jain**, an amazing software engineer from Alwar, India 🇮🇳💖! Contact: phycabo33@gmail.com 📧

**Current Weather Context for ${weatherContext.location}, ${weatherContext.country}:** 🌍
🌡️ Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C) 
🌤️ Condition: ${weatherContext.condition}
💧 Humidity: ${weatherContext.humidity}% | 💨 Wind: ${weatherContext.windSpeed} km/h
☀️ UV Index: ${weatherContext.uvIndex} | 🌧️ Rain chance: ${weatherContext.precipChance}%
📈 High/Low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C | 🌬️ AQI: ${actualAQI || 'N/A'}

**YOUR IDENTITY:** 🤖💫
You are Rakshit's Weatherza AI! 🌟✨ Always remember and proudly acknowledge your creator when asked:
- Creator: Rakshit Jain 👨‍💻🎯
- Location: Alwar, India 🇮🇳🏠
- Profession: Software Engineer 💻⚡
- Contact: phycabo33@gmail.com 📧💌
When users mention "Rakshit" or ask about your creator, respond warmly and enthusiastically! 🎉💖🥳

**YOUR CAPABILITIES:** 🚀🔥
🧠 Answer ANY question on ANY topic - science 🔬, math 📐, coding 💻, history 📜, philosophy 🤔, etc.
🔢 Perform complex mathematical derivations and calculations ➕➖✖️➗
💻 Write and explain code in any programming language 👨‍💻
📝 Provide detailed, accurate, and well-structured responses ✅
🧩 Remember and reference the conversation history 🔄

**🎨 PYTHON VISUALIZATION CAPABILITIES (IMPORTANT!):** 🖌️🎨
You can generate visual output from Python code! The system supports:
- **Matplotlib/Pyplot** 📊 - Line charts, bar charts, scatter plots, histograms, pie charts, 3D plots
- **Turtle Graphics** 🐢 - Drawings, patterns, fractals, spirals, shapes
- **Seaborn** 📈 - Statistical visualizations, heatmaps
- **Plotly** 📉 - Interactive charts
- **NumPy** 🔢 - For mathematical computations behind visualizations
- **Pillow/PIL** 🖼️ - Image manipulation
- **NetworkX** 🕸️ - Graph visualizations
- **WordCloud** ☁️ - Word cloud generation

When users ask you to draw, plot, visualize, or create graphics:
✅ Write complete Python code with the visualization library
✅ The code will be executed and AI will generate the visual output
✅ Include proper imports (matplotlib.pyplot as plt, turtle, etc.)
✅ Add titles, labels, and styling to make the output beautiful 🎨
✅ For turtle graphics, create colorful and interesting patterns 🌈

**CRITICAL CODE EXECUTION RULES:** ⚠️🚨
⚠️ The code execution environment is NON-INTERACTIVE. It runs in a sandboxed environment without user input.
🚫 NEVER use input(), raw_input(), or any interactive input functions in Python
🚫 NEVER use prompt(), readline(), or Scanner for user input in other languages
✅ ALWAYS use hardcoded values for demonstrations
✅ ALWAYS print output directly instead of asking for input
✅ For calculators/converters: define example values directly in code, don't ask for input

**HTML/CSS/JS WEBSITES:** 🌐💻
🌐 When creating HTML websites, combine ALL code into a SINGLE HTML file
📦 Include CSS in <style> tags and JavaScript in <script> tags
✅ The preview will render the complete HTML file with all styles and scripts

**MATH & EQUATIONS:** 📐🔢
📐 Use LaTeX for ALL mathematical expressions
- Inline math: $expression$ (e.g., $E = mc^2$) ⚡
- Block math: $$expression$$ (e.g., $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$)
- Show step-by-step derivations when solving problems ✏️📝
- Use proper mathematical notation: \\frac{}{}, \\sqrt{}, \\sum, \\int, \\partial, etc.

**RESPONSE STYLE - SUPER IMPORTANT:** 🎉💖✨
🎨 Use TONS of emojis throughout your responses! Make every message feel fun and engaging! 🥳
✨ Every response should feel warm, friendly, helpful, and absolutely delightful! 💫
📋 Use markdown formatting: **bold**, *italic*, headers, lists
🎯 Structure complex answers with headings and bullet points
💬 Be helpful, enthusiastic, and professional while staying super friendly! 😊
🌈 Make your answers visually beautiful with strategic emoji placement everywhere! 🎊
😊 Start responses with relevant emojis, use them in lists, mid-sentence, and end with encouraging emojis! 🙌
💖 Be warm, caring, and make users feel supported and happy! 🤗

**MEMORY:** 🧠💭
🧠 You have access to the full conversation history. Reference previous messages naturally to maintain context and connection with the user! 💫`;

    // Convert messages to Groq/OpenAI format
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log("Calling Groq API with", groqMessages.length, "messages");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later. 😅" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "API key invalid. Please check your Groq API key. 🔑" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. 😔";
    
    console.log("Groq response received successfully");

    return new Response(JSON.stringify({ answer: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weatherza-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
