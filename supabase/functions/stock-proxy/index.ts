import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_KEY = Deno.env.get("EULERPOOL_API_KEY") || "";
const BASE = "https://api.eulerpool.com";

// Simple in-memory cache (per function invocation lifetime)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchJSON(url: string) {
  console.log(`Fetching: ${url.replace(API_KEY, "***")}`);
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`API error ${resp.status}: ${text}`);
    throw new Error(`API returned ${resp.status}`);
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, symbol, timeframe, from, to } = body;

    const cacheKey = JSON.stringify({ action, symbol, timeframe, from, to });
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: unknown;

    switch (action) {
      case "price": {
        // GET /v1/equities/{ticker}/price
        const url = `${BASE}/v1/equities/${encodeURIComponent(symbol)}/price?token=${API_KEY}`;
        data = await fetchJSON(url);
        break;
      }

      case "search": {
        // GET /v1/equities/search?q={keyword}
        const url = `${BASE}/v1/equities/search?q=${encodeURIComponent(symbol)}&token=${API_KEY}`;
        data = await fetchJSON(url);
        break;
      }

      case "history": {
        // GET /v1/equities/{ticker}/ohlcv?interval={interval}&from={from}&to={to}
        const interval = timeframe || "1d";
        let url = `${BASE}/v1/equities/${encodeURIComponent(symbol)}/ohlcv?interval=${interval}&token=${API_KEY}`;
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;
        data = await fetchJSON(url);
        break;
      }

      case "quote": {
        // Fallback: use /api/1/equity/quotes/{identifier}
        const identifier = body.identifier || symbol;
        let qp = `token=${API_KEY}`;
        if (from) qp += `&from=${from}`;
        if (to) qp += `&to=${to}`;
        const url = `${BASE}/api/1/equity/quotes/${encodeURIComponent(identifier)}?${qp}`;
        data = await fetchJSON(url);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    setCache(cacheKey, data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stock proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
