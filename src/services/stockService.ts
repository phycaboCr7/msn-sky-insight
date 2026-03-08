import { supabase } from "@/integrations/supabase/client";

export interface StockQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  change: number;
  changePercent: number;
  previousClose: number;
  latestDay: string;
  currency: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export interface ChartPoint {
  time: string;
  close: number;
  volume: number;
}

async function callStockProxy(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("stock-proxy", {
    body,
  });
  if (error) throw new Error(error.message || "Stock proxy error");
  return data;
}

// Normalize string for fuzzy matching
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Levenshtein distance for typo tolerance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
  return dp[m][n];
}

function matchScore(s: StockSearchResult, norm: string): number {
  const ns = normalize(s.symbol);
  const nn = normalize(s.name);
  if (ns === norm || nn === norm) return 0;
  if (ns.startsWith(norm) || nn.startsWith(norm)) return 1;
  if (ns.includes(norm) || nn.includes(norm)) return 2;
  return 3 + Math.min(levenshtein(ns, norm), levenshtein(nn, norm));
}

// Search stocks using Eulerpool API
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  try {
    const data = await callStockProxy({ action: "search", symbol: keyword });

    // Handle different response formats
    let results: StockSearchResult[] = [];

    if (Array.isArray(data)) {
      results = data.slice(0, 10).map((item: any) => ({
        symbol: item.ticker || item.symbol || "",
        name: item.name || item.companyName || "",
        type: item.type || "Equity",
        region: item.exchange || item.region || "",
        currency: item.currency || "USD",
      }));
    } else if (data?.results && Array.isArray(data.results)) {
      results = data.results.slice(0, 10).map((item: any) => ({
        symbol: item.ticker || item.symbol || "",
        name: item.name || item.companyName || "",
        type: item.type || "Equity",
        region: item.exchange || item.region || "",
        currency: item.currency || "USD",
      }));
    }

    if (results.length === 0) return [];

    // Sort by relevance
    const norm = normalize(keyword);
    results.sort((a, b) => matchScore(a, norm) - matchScore(b, norm));

    return results;
  } catch (err) {
    console.error("Search stocks error:", err);
    return [];
  }
}

// Get stock quote using Eulerpool API
export async function getStockQuote(symbol: string): Promise<StockQuote> {
  try {
    // Try the v1 price endpoint first
    const data = await callStockProxy({ action: "price", symbol });

    if (data && (data.price !== undefined || data.ticker)) {
      return {
        symbol: data.ticker || symbol,
        price: parseFloat(data.price) || 0,
        open: parseFloat(data.open) || 0,
        high: parseFloat(data.high) || 0,
        low: parseFloat(data.low) || 0,
        volume: String(data.volume || "0"),
        change: parseFloat(data.change) || 0,
        changePercent: parseFloat(data.changePct || data.changePercent) || 0,
        previousClose: parseFloat(data.previousClose || data.prevClose) || 0,
        latestDay: data.date || data.latestDay || new Date().toISOString().split("T")[0],
        currency: data.currency || "USD",
      };
    }

    // Fallback: try the api/1 quote endpoint
    const quoteData = await callStockProxy({ action: "quote", identifier: symbol });

    if (quoteData && Array.isArray(quoteData) && quoteData.length > 0) {
      const latest = quoteData[quoteData.length - 1];
      const prev = quoteData.length > 1 ? quoteData[quoteData.length - 2] : latest;
      const change = (latest.price || latest.close || 0) - (prev.price || prev.close || 0);
      const prevPrice = prev.price || prev.close || 1;

      return {
        symbol,
        price: latest.price || latest.close || 0,
        open: latest.open || 0,
        high: latest.high || 0,
        low: latest.low || 0,
        volume: String(latest.volume || "0"),
        change,
        changePercent: (change / prevPrice) * 100,
        previousClose: prevPrice,
        latestDay: latest.date || new Date().toISOString().split("T")[0],
        currency: "USD",
      };
    }

    throw new Error("No data found");
  } catch (err) {
    console.error("Get stock quote error:", err);
    throw new Error("Failed to fetch stock data");
  }
}

// Fetch chart data based on timeframe
export async function getChartData(symbol: string, timeframe: string): Promise<ChartPoint[]> {
  try {
    const now = new Date();
    let from: string;
    let interval: string;

    switch (timeframe) {
      case "1D": {
        from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "15m";
        break;
      }
      case "5D": {
        from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "1h";
        break;
      }
      case "1M": {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "1d";
        break;
      }
      case "1Y": {
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "1d";
        break;
      }
      case "5Y": {
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "1w";
        break;
      }
      case "Max": {
        from = "1990-01-01";
        interval = "1mo";
        break;
      }
      default: {
        from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        interval = "15m";
      }
    }

    const to = now.toISOString().split("T")[0];
    const data = await callStockProxy({ action: "history", symbol, timeframe: interval, from, to });

    let entries: ChartPoint[] = [];

    // Handle response - could be { data: [...] } or direct array
    const items = data?.data || data?.history || (Array.isArray(data) ? data : []);

    if (Array.isArray(items)) {
      entries = items.map((item: any) => ({
        time: item.date || item.time || item.datetime || "",
        close: parseFloat(item.close) || parseFloat(item.price) || 0,
        volume: parseInt(item.volume || "0"),
      }));
    }

    return entries;
  } catch (err) {
    console.error("Get chart data error:", err);
    return [];
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", INR: "₹", GBP: "£", EUR: "€", JPY: "¥", AUD: "A$", CAD: "C$",
  CHF: "CHF ", HKD: "HK$", SGD: "S$", KRW: "₩", CNY: "¥", BRL: "R$",
  ZAR: "R", SEK: "kr", NOK: "kr", DKK: "kr", MXN: "MX$", TWD: "NT$",
  THB: "฿", MYR: "RM", IDR: "Rp", PHP: "₱", PLN: "zł", TRY: "₺",
  RUB: "₽", SAR: "﷼", AED: "د.إ", ILS: "₪", EGP: "E£", NGN: "₦",
  KES: "KSh", PKR: "₨", BDT: "৳", LKR: "Rs", NPR: "Rs",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency + " ";
}

const TOP_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"];

export function getRandomTopStock(): string {
  return TOP_STOCKS[Math.floor(Math.random() * TOP_STOCKS.length)];
}
