import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, location, days, lat, lon, query } = await req.json();

    const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY");
    if (!WEATHER_API_KEY) {
      return new Response(JSON.stringify({ error: "WEATHER_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BASE_URL = "https://api.weatherapi.com/v1";
    let url: string;

    switch (endpoint) {
      case "current":
        if (!location) throw new Error("location required");
        url = `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=yes`;
        break;
      case "forecast":
        if (!location) throw new Error("location required");
        const forecastDays = Math.min(Math.max(days || 7, 1), 10);
        url = `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=${forecastDays}&aqi=yes&alerts=yes`;
        break;
      case "search":
        if (!query) throw new Error("query required");
        url = `${BASE_URL}/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}`;
        break;
      case "coords":
        if (lat == null || lon == null) throw new Error("lat and lon required");
        url = `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=yes`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid endpoint. Use: current, forecast, search, coords" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Fetch with timeout and retry
    const fetchWithRetry = async (fetchUrl: string, retries = 1): Promise<Response> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(fetchUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok || i === retries) return res;
          await res.text(); // consume body
          await new Promise(r => setTimeout(r, 800));
        } catch (err) {
          if (i === retries) throw err;
          await new Promise(r => setTimeout(r, 800));
        }
      }
      throw new Error("Max retries reached");
    };

    const response = await fetchWithRetry(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error("WeatherAPI error:", response.status, errText);
      return new Response(JSON.stringify({ error: `WeatherAPI error: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
