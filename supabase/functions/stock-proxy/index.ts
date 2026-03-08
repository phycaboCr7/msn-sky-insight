import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_KEY = Deno.env.get("EULERPOOL_API_KEY") || "";
const BASE = "https://api.eulerpool.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, identifier, timeframe, from, to } = await req.json();

    let url: string;
    let headers: Record<string, string> = {};

    switch (action) {
      case "search": {
        // Use the api/1 search or v1 search
        url = `${BASE}/v1/equities/search?query=${encodeURIComponent(symbol)}&limit=10`;
        headers = { "Authorization": `Bearer ${API_KEY}` };
        break;
      }
      case "quote": {
        url = `${BASE}/api/1/equity/quotes/${encodeURIComponent(identifier || symbol)}?token=${API_KEY}`;
        break;
      }
      case "profile": {
        url = `${BASE}/api/1/equity/profile/${encodeURIComponent(identifier || symbol)}?token=${API_KEY}`;
        break;
      }
      case "history": {
        // Use v1 history endpoint with from/to/interval
        const interval = timeframe || "1d";
        let queryParams = `interval=${interval}`;
        if (from) queryParams += `&from=${from}`;
        if (to) queryParams += `&to=${to}`;
        url = `${BASE}/v1/equities/${encodeURIComponent(symbol)}/history?${queryParams}`;
        headers = { "Authorization": `Bearer ${API_KEY}` };
        break;
      }
      case "price": {
        url = `${BASE}/v1/equities/${encodeURIComponent(symbol)}/price`;
        headers = { "Authorization": `Bearer ${API_KEY}` };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`Stock proxy: ${action} -> ${url}`);

    const response = await fetch(url, {
      headers: {
        ...headers,
        "Accept": "application/json",
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.ok ? 200 : response.status,
    });
  } catch (error) {
    console.error("Stock proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
