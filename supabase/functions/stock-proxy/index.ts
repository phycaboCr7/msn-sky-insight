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
    const { action, symbol, identifier, from, to } = await req.json();

    let url: string;

    switch (action) {
      case "profile": {
        url = `${BASE}/api/1/equity/profile/${encodeURIComponent(identifier || symbol)}?token=${API_KEY}`;
        break;
      }
      case "quote": {
        // Quotes endpoint with optional from/to as ms timestamps
        let qp = `token=${API_KEY}`;
        if (from) qp += `&from=${from}`;
        if (to) qp += `&to=${to}`;
        url = `${BASE}/api/1/equity/quotes/${encodeURIComponent(identifier || symbol)}?${qp}`;
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
      headers: { "Accept": "application/json" },
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
