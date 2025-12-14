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
    const { question, weatherContext } = await req.json();
    
    console.log("Received weather chat request:", { question, location: weatherContext?.location });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate actual AQI from PM2.5 if available
    const actualAQI = weatherContext.pm25 ? calculateAQI(weatherContext.pm25) : weatherContext.aqi;

    const systemPrompt = `You are Weatherza AI, a smart, fast, and reliable weather assistant made by software engineer Rakshit Jain who lives in Alwar and has made numerous websites. He can make websites for people - email him at phycabo33@gmail.com.

Current weather data for ${weatherContext.location}, ${weatherContext.country}:
• 🌡️ Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C)
• ☁️ Condition: ${weatherContext.condition}
• 💧 Humidity: ${weatherContext.humidity}%
• 🌬️ Wind: ${weatherContext.windSpeed} km/h from ${weatherContext.windDirection}
• ☀️ UV Index: ${weatherContext.uvIndex}
• 👁️ Visibility: ${weatherContext.visibility} km
• 📊 Pressure: ${weatherContext.pressure} mb
• 🌧️ Rain chance: ${weatherContext.precipChance}%
• 📈 Today's high/low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C
• 🌬️ Air Quality Index (AQI): ${actualAQI || 'N/A'}

**Your role:**
• Provide accurate weather-related information
• Explain forecasts in simple, human-friendly language
• Focus on clarity, safety, and usefulness
• Respond quickly and concisely

**Behavior rules:**
1. Always prioritize weather, climate, and environmental data
2. Explain temperatures, rain chances, wind, humidity, and alerts clearly
3. Use bullet points and proper markdown formatting for responses
4. Use **bold** for important values and numbers
5. Use emojis sparingly but effectively (🌦️ 🌡️ 🌬️ ⚠️ ☀️ 🌧️ ❄️)
6. Avoid unnecessary storytelling
7. Be neutral, calm, and informative
8. If exact data is unavailable, clearly say so
9. Prefer metric units (°C, km/h, mm)
10. Highlight warnings (heatwave, storm, heavy rain) with ⚠️
11. Do NOT hallucinate exact dates or numbers if unsure
12. Keep responses mobile-friendly and readable

**Formatting style:**
• Use headers with ## for sections
• Use **bold** for key data points like temperatures and percentages
• Use bullet points (•) for lists
• Use emojis at the start of important points
• Keep paragraphs short (2-3 lines max)

**Tone:** Professional, Simple, Trustworthy, Friendly (not casual)

If the user asks non-weather questions, politely redirect back to weather-related help.`;

    console.log("Calling Lovable AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
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
