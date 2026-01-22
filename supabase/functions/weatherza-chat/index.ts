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

// Call Groq API for text-only queries
async function callGroq(messages: any[], systemPrompt: string, apiKey: string) {
  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  console.log("Calling Groq API with llama-3.3-70b-versatile,", groqMessages.length, "messages");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", response.status, errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Groq llama-3.3-70b-versatile response received successfully");
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. 😔";
}

// Call Gemini API for vision/image/document queries
async function callGemini(messages: any[], systemPrompt: string, apiKey: string) {
  // Build Gemini contents array
  const contents: any[] = [];
  
  for (const msg of messages) {
    const parts: any[] = [];
    
    if (msg.content) {
      parts.push({ text: msg.content });
    }
    
    // Handle image uploads
    if (msg.image) {
      const base64Match = msg.image.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      }
    }
    
    // Handle document uploads (PDF, Word docs)
    if (msg.document) {
      const base64Match = msg.document.data.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
        // Add context about the document
        parts.push({ text: `[Document uploaded: ${msg.document.name}]` });
      }
    }
    
    if (parts.length > 0) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts
      });
    }
  }

  const hasDocuments = messages.some((msg: any) => msg.document);
  console.log(`Calling Gemini API with gemini-1.5-flash-latest, ${contents.length} messages, hasDocuments: ${hasDocuments}`);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Gemini gemini-1.5-flash-latest response received successfully");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response. 😔";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, weatherContext } = await req.json();
    
    // Check if any message contains an image or document
    const hasImages = messages.some((msg: any) => msg.image);
    const hasDocuments = messages.some((msg: any) => msg.document);
    const needsGemini = hasImages || hasDocuments;
    
    console.log("Received weather chat request:", { 
      messageCount: messages?.length || 0, 
      location: weatherContext?.location,
      hasImages,
      hasDocuments
    });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not configured");
      throw new Error("GROQ_API_KEY is not configured");
    }
    
    if (needsGemini && !GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured for vision/documents");
      throw new Error("GEMINI_API_KEY is not configured for vision/document capabilities");
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
👁️ **VISION:** Analyze images, read text from photos/documents, describe visuals, and answer questions about uploaded images! 📷🖼️
📄 **DOCUMENTS:** Read and analyze PDFs, documents, and any text in images with OCR-like capabilities! 📑

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

    let answer: string;
    
    if (needsGemini) {
      // Use Gemini for vision/image/document analysis
      answer = await callGemini(messages, systemPrompt, GEMINI_API_KEY!);
    } else {
      // Use Groq for text-only queries
      answer = await callGroq(messages, systemPrompt, GROQ_API_KEY);
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weatherza-chat error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later. 😅" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error.message.includes("401")) {
        return new Response(JSON.stringify({ error: "API key invalid. Please check your API key. 🔑" }), {
          status: 401,
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
