const API_KEY = "JVRYUE6VGYO01KPO";

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

// Normalize string for fuzzy matching
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Simple Levenshtein distance for typo tolerance
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

// Search stocks by keyword with typo tolerance
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keyword)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const matches = data["bestMatches"];
  if (!matches || !Array.isArray(matches)) return [];

  const results: StockSearchResult[] = matches.slice(0, 10).map((m: any) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
    currency: m["8. currency"],
  }));

  // If no results from API, return empty (API handles most fuzzy cases)
  if (results.length === 0) return [];

  // Sort by relevance: exact > starts-with > contains > fuzzy distance
  const norm = normalize(keyword);
  results.sort((a, b) => {
    const scoreA = matchScore(a, norm);
    const scoreB = matchScore(b, norm);
    return scoreA - scoreB;
  });

  return results;
}

function matchScore(s: StockSearchResult, norm: string): number {
  const ns = normalize(s.symbol);
  const nn = normalize(s.name);
  if (ns === norm || nn === norm) return 0;
  if (ns.startsWith(norm) || nn.startsWith(norm)) return 1;
  if (ns.includes(norm) || nn.includes(norm)) return 2;
  return 3 + Math.min(levenshtein(ns, norm), levenshtein(nn, norm));
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const q = data["Global Quote"];
  if (!q || !q["01. symbol"]) throw new Error("No data found");

  return {
    symbol: q["01. symbol"],
    price: parseFloat(q["05. price"]),
    open: parseFloat(q["02. open"]),
    high: parseFloat(q["03. high"]),
    low: parseFloat(q["04. low"]),
    volume: q["06. volume"],
    change: parseFloat(q["09. change"]),
    changePercent: parseFloat(q["10. change percent"]?.replace("%", "") || "0"),
    previousClose: parseFloat(q["08. previous close"]),
    latestDay: q["07. latest trading day"],
    currency: "USD", // Will be overridden by search result currency
  };
}

// Fetch chart data based on timeframe
export async function getChartData(symbol: string, timeframe: string): Promise<ChartPoint[]> {
  let url: string;
  let seriesKey: string;

  switch (timeframe) {
    case "1D":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=15min&apikey=${API_KEY}`;
      seriesKey = "Time Series (15min)";
      break;
    case "5D":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=60min&outputsize=full&apikey=${API_KEY}`;
      seriesKey = "Time Series (60min)";
      break;
    case "1M":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      seriesKey = "Time Series (Daily)";
      break;
    case "1Y":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${API_KEY}`;
      seriesKey = "Time Series (Daily)";
      break;
    case "5Y":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      seriesKey = "Weekly Time Series";
      break;
    case "Max":
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      seriesKey = "Monthly Time Series";
      break;
    default:
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=15min&apikey=${API_KEY}`;
      seriesKey = "Time Series (15min)";
  }

  const res = await fetch(url);
  const data = await res.json();
  const series = data[seriesKey];
  if (!series) return [];

  let entries = Object.entries(series).map(([time, val]: [string, any]) => ({
    time,
    close: parseFloat(val["4. close"]),
    volume: parseInt(val["5. volume"] || val["6. volume"] || "0"),
  })).reverse();

  // Limit data points based on timeframe
  switch (timeframe) {
    case "1D": return entries.slice(-30);
    case "5D": return entries.slice(-40);
    case "1M": return entries.slice(-22);
    case "1Y": return entries.slice(-252);
    case "5Y": return entries.slice(-260);
    case "Max": return entries;
    default: return entries.slice(-30);
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
