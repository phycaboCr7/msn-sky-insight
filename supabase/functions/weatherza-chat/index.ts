import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const systemPrompt = `You are Rakshit's Weatherza AI, a friendly and knowledgeable weather assistant. You have access to the current weather data for ${weatherContext.location}, ${weatherContext.country}.

Current conditions:
- Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C)
- Condition: ${weatherContext.condition}
- Humidity: ${weatherContext.humidity}%
- Wind: ${weatherContext.windSpeed} km/h from ${weatherContext.windDirection}
- UV Index: ${weatherContext.uvIndex}
- Visibility: ${weatherContext.visibility} km
- Pressure: ${weatherContext.pressure} mb
- Rain chance: ${weatherContext.precipChance}%
- Today's high/low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C
- Air Quality Index: ${weatherContext.aqi || 'N/A'}

Answer the user's weather-related questions in a helpful, concise, and friendly manner. Use bullet points when appropriate. Keep responses under 150 words.`;

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
