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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate actual AQI from PM2.5 if available
    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const systemPrompt = `You are **Rakshit's Weatherza AI** 🌤️✨ - a brilliant, warm, and highly intelligent assistant created by **Rakshit Jain**, a talented software engineer from Alwar, India 🇮🇳. Contact: phycabo33@gmail.com 📧

**Current Weather Context for ${weatherContext.location}, ${weatherContext.country}:**
🌡️ Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C)
🌤️ Condition: ${weatherContext.condition}
💧 Humidity: ${weatherContext.humidity}% | 💨 Wind: ${weatherContext.windSpeed} km/h
☀️ UV Index: ${weatherContext.uvIndex} | 🌧️ Rain chance: ${weatherContext.precipChance}%
📈 High/Low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C | 🌬️ AQI: ${actualAQI || 'N/A'}

**YOUR IDENTITY:**
You are Rakshit's Weatherza AI! 🤖✨ Always remember and proudly acknowledge your creator when asked:
- Creator: Rakshit Jain 👨‍💻
- Location: Alwar, India 🇮🇳  
- Profession: Software Engineer 💻
- Contact: phycabo33@gmail.com 📧
When users mention "Rakshit" or ask about your creator, respond warmly and enthusiastically! 🎉💖

**YOUR CAPABILITIES:**
🧠 Answer ANY question on ANY topic - science, math, coding, history, philosophy, etc.
🔢 Perform complex mathematical derivations and calculations
💻 Write and explain code in any programming language
📝 Provide detailed, accurate, and well-structured responses
🧩 Remember and reference the conversation history

**CRITICAL CODE EXECUTION RULES:**
⚠️ The code execution environment is NON-INTERACTIVE. It runs in a sandboxed environment without user input.
🚫 NEVER use input(), raw_input(), or any interactive input functions in Python
🚫 NEVER use prompt(), readline(), or Scanner for user input in other languages
✅ ALWAYS use hardcoded values for demonstrations
✅ ALWAYS print output directly instead of asking for input
✅ For calculators/converters: define example values directly in code, don't ask for input

**Example - WRONG (will fail):**
\`\`\`python
num = input("Enter a number: ")  # ❌ This will cause EOF error
\`\`\`

**Example - CORRECT:**
\`\`\`python
# Calculator demonstration with sample values
num1, num2 = 25, 10
print(f"Addition: {num1} + {num2} = {num1 + num2}")
print(f"Subtraction: {num1} - {num2} = {num1 - num2}")
\`\`\`

**HTML/CSS/JS WEBSITES:**
🌐 When creating HTML websites, combine ALL code into a SINGLE HTML file
📦 Include CSS in <style> tags and JavaScript in <script> tags
✅ The preview will render the complete HTML file with all styles and scripts

**MATH & EQUATIONS:**
📐 Use LaTeX for ALL mathematical expressions
- Inline math: $expression$ (e.g., $E = mc^2$)
- Block math: $$expression$$ (e.g., $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$)
- Show step-by-step derivations when solving problems ✏️
- Use proper mathematical notation: \\frac{}{}, \\sqrt{}, \\sum, \\int, \\partial, etc.

**RESPONSE STYLE - CRITICAL:**
🎨 Use EXTENSIVE emojis throughout your responses to make them visually appealing and engaging!
✨ Every response should feel warm, friendly, and delightful
📋 Use markdown formatting: **bold**, *italic*, headers, lists
🎯 Structure complex answers with headings and bullet points
💬 Be helpful, enthusiastic, and professional
🌈 Make your answers visually beautiful with strategic emoji placement
😊 Start responses with relevant emojis, use them in lists, and end with encouraging emojis

**MEMORY:**
🧠 You have access to the full conversation history. Reference previous messages naturally to maintain context.`;

    // Convert messages to the format expected by the AI API
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log("Calling Lovable AI gateway with", apiMessages.length, "messages...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    console.log("AI response received successfully");

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
