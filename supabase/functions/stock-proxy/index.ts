import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YF_BASE = "https://query1.finance.yahoo.com";

async function fetchYahoo(url: string): Promise<any> {
  console.log(`Yahoo fetch: ${url}`);
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Yahoo error ${resp.status}: ${text.substring(0, 200)}`);
    throw new Error(`Yahoo API returned ${resp.status}`);
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

    let result: any;

    switch (action) {
      case "price": {
        // Use Yahoo v8 quote endpoint
        const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=false`;
        const data = await fetchYahoo(url);
        const chart = data?.chart?.result?.[0];
        if (!chart) throw new Error("No data for symbol");

        const meta = chart.meta;
        const quotes = chart.indicators?.quote?.[0];
        const timestamps = chart.timestamp || [];

        // Get OHLCV from the latest available data
        const closes = quotes?.close?.filter((c: any) => c != null) || [];
        const opens = quotes?.open?.filter((o: any) => o != null) || [];
        const highs = quotes?.high?.filter((h: any) => h != null) || [];
        const lows = quotes?.low?.filter((l: any) => l != null) || [];
        const vols = quotes?.volume?.filter((v: any) => v != null) || [];

        const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
        const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
        const change = currentPrice - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;

        result = {
          ticker: meta.symbol || symbol,
          price: currentPrice,
          open: opens[0] || meta.regularMarketOpen || 0,
          high: Math.max(...(highs.length ? highs : [0])),
          low: Math.min(...(lows.filter((l: number) => l > 0).length ? lows.filter((l: number) => l > 0) : [0])),
          volume: vols.reduce((a: number, b: number) => a + b, 0),
          change: change,
          changePct: changePct,
          previousClose: prevClose,
          date: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          currency: meta.currency || "USD",
        };
        break;
      }

      case "search": {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=10&newsCount=0&listsCount=0`;
        const data = await fetchYahoo(url);
        const quotes = data?.quotes || [];
        result = quotes.map((q: any) => ({
          ticker: q.symbol,
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          type: q.quoteType || "Equity",
          exchange: q.exchange || "",
          region: q.exchDisp || "",
          currency: q.currency || "USD",
        }));
        break;
      }

      case "history": {
        // Map interval strings
        const intervalMap: Record<string, string> = {
          "15m": "15m", "1h": "60m", "1d": "1d", "1w": "1wk", "1mo": "1mo",
        };
        const interval = intervalMap[timeframe] || "1d";

        // Calculate period timestamps
        const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : Math.floor(Date.now() / 1000) - 86400;
        const toTs = to ? Math.floor(new Date(to).getTime() / 1000) : Math.floor(Date.now() / 1000);

        const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${fromTs}&period2=${toTs}&interval=${interval}&includePrePost=false`;
        const data = await fetchYahoo(url);
        const chart = data?.chart?.result?.[0];

        if (!chart || !chart.timestamp) {
          result = { data: [] };
          break;
        }

        const quotes = chart.indicators?.quote?.[0] || {};
        const timestamps = chart.timestamp;

        result = {
          data: timestamps.map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString(),
            close: quotes.close?.[i] ?? null,
            open: quotes.open?.[i] ?? null,
            high: quotes.high?.[i] ?? null,
            low: quotes.low?.[i] ?? null,
            volume: quotes.volume?.[i] ?? 0,
          })).filter((d: any) => d.close != null),
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
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
