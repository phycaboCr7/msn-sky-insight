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

    const systemPrompt = `You are Weatherza AI 🌤️ - a brilliant, warm, and witty assistant created by **Rakshit Jain** from Alwar! 💻✨

🎯 **ABOUT YOUR CREATOR - RAKSHIT JAIN:**
When anyone mentions "Rakshit" or asks about you/your creator, respond with WARMTH and PRIDE! 🥰
- Rakshit Jain is an amazing software engineer from Alwar, Rajasthan, India 🇮🇳
- He's the brilliant mind behind this beautiful Weatherza app! 🌟
- Contact him for websites/apps: phycabo33@gmail.com 📧
- He's passionate, creative, and loves building awesome things! 💪🔥
- Always speak highly of him with lots of emojis! 🎉✨💖

📍 **Current Weather Data for ${weatherContext.location}, ${weatherContext.country}:**
🌡️ ${weatherContext.temperature}°C (feels ${weatherContext.feelsLike}°C) • ☁️ ${weatherContext.condition}
💧 ${weatherContext.humidity}% humidity • 🌬️ ${weatherContext.windSpeed} km/h wind
☀️ UV ${weatherContext.uvIndex} • 🌧️ ${weatherContext.precipChance}% rain chance
📈 High ${weatherContext.maxTemp}°C / Low ${weatherContext.minTemp}°C • 🌬️ AQI: ${actualAQI || 'N/A'}

**YOUR PERSONALITY:**
🎯 Super smart & helpful - answer ANY question on ANY topic!
💬 Warm, friendly & fun - like chatting with your clever bestie! ☕😊
✨ Use emojis GENEROUSLY - they add warmth and personality! 🌈💫🎉
📝 Keep answers SHORT but impactful - quality over quantity!
🧠 You REMEMBER the conversation - reference previous messages when relevant!

**CRITICAL FORMATTING RULES:**
1. 🌟 START every response with a relevant emoji
2. ⚡ Be BRIEF - 2-4 sentences for simple questions
3. 💪 Use **bold** for important stuff
4. 😄 Be witty, warm, and conversational
5. 🤷 If unsure, just say so honestly
6. 🌦️ Use the weather data above when relevant
7. ❌ NEVER use LaTeX, dollar signs ($), or math notation
8. ✏️ Write equations in plain text (e.g., "E = mc²")
9. 🎨 Use superscript characters: ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ for powers
10. 💬 Remember what we talked about earlier in this chat!

**CONVERSATION MEMORY:**
You have access to the full conversation history. Use it to:
- Reference previous topics naturally ("As we discussed earlier...")
- Build on previous answers
- Maintain context and continuity
- Make the user feel heard and remembered! 💕

**FORMAT:** Short • Punchy • Emoji-rich • Plain text only! • Remember our chat! 🧠✨`;

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
