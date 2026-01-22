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

// Universal multimodal prompt for images, PDFs, and documents
const MULTIMODAL_ANALYSIS_PROMPT = `You are an advanced multimodal analysis AI.

You may receive:
• Images
• PDFs
• Documents (text extracted)
• Scanned pages
• Mixed inputs

STRICT RULES:
1. Analyze ONLY the content provided.
2. If the input is an image, describe exactly what is visible.
3. If the input is a document or PDF, read and understand its content faithfully.
4. Extract visible text exactly as written.
5. Preserve facts, numbers, headings, questions, and structure.
6. Do NOT guess missing information.
7. If something is unclear, unreadable, or missing, clearly say so.
8. Do NOT hallucinate.
9. Respond clearly, concisely, and in a structured manner.

TASK:
Carefully analyze the provided input and explain it accurately.`;

// Call Groq API for vision/image queries using Llama 4 Scout (FREE vision model)
async function callGroqVision(messages: any[], systemPrompt: string, apiKey: string) {
  const latestMessage = messages[messages.length - 1];
  
  // Build content array for vision
  const contentParts: any[] = [];
  
  // Add user's text query first
  if (latestMessage.content) {
    contentParts.push({ 
      type: "text", 
      text: latestMessage.content + "\n\n" + MULTIMODAL_ANALYSIS_PROMPT 
    });
  } else {
    contentParts.push({ 
      type: "text", 
      text: MULTIMODAL_ANALYSIS_PROMPT 
    });
  }
  
  // Handle image uploads
  if (latestMessage.image) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: latestMessage.image // base64 data URL
      }
    });
  }

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(0, -1).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })),
    { role: "user", content: contentParts }
  ];

  console.log("Calling Groq Vision API with meta-llama/llama-4-scout-17b-16e-instruct");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: groqMessages,
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq Vision API error:", response.status, errorText);
    throw new Error(`Groq Vision API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Groq Llama 4 Scout vision response received successfully");
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't analyze the image. 😔";
}

// Call Gemini API for document analysis (PDF, Word docs) - fallback
async function callGemini(messages: any[], systemPrompt: string, apiKey: string) {
  // Build parts array for the single request
  const parts: any[] = [];
  
  // Get the latest user message with media
  const latestMessage = messages[messages.length - 1];
  
  // Handle document uploads (PDF, Word docs)
  if (latestMessage.document) {
    const base64Match = latestMessage.document.data.match(/^data:([^;]+);base64,(.+)$/);
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
  
  // Add user's text query
  if (latestMessage.content) {
    parts.push({ text: latestMessage.content });
  }
  
  // Add the multimodal analysis prompt
  parts.push({ text: MULTIMODAL_ANALYSIS_PROMPT });

  console.log("Calling Gemini API for document analysis");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connection": "close"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }]
    }),
  });

  if (response.status === 429) {
    console.error("Gemini API rate limit hit (429)");
    throw new Error("429: Rate limit exceeded. Please wait 10-15 seconds before retrying.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Gemini document analysis response received");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't analyze the document. 😔";
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
    
    // Only need Gemini for documents now - images use Groq Llama 4 Scout
    if (hasDocuments && !GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured for document analysis");
      throw new Error("GEMINI_API_KEY is not configured for document analysis");
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
    
    if (hasImages) {
      // Use Groq Llama 4 Scout for image analysis (FREE vision model)
      answer = await callGroqVision(messages, systemPrompt, GROQ_API_KEY);
    } else if (hasDocuments) {
      // Use Gemini for document analysis (PDF, Word docs)
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
