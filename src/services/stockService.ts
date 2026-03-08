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

export interface IntradayPoint {
  time: string;
  close: number;
}

// Search stocks by keyword (company name, partial symbol, etc.)
export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keyword)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const matches = data["bestMatches"];
  if (!matches || !Array.isArray(matches)) return [];

  return matches.slice(0, 8).map((m: any) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
    currency: m["8. currency"],
  }));
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const q = data["Global Quote"];
  if (!q || !q["01. symbol"]) throw new Error("No data found");

  // Detect currency from symbol
  const sym = q["01. symbol"] as string;
  let currency = "USD";
  if (sym.includes(".BSE") || sym.includes(".NSE") || sym.includes(".BO")) currency = "INR";
  else if (sym.includes(".LON")) currency = "GBP";
  else if (sym.includes(".TYO")) currency = "JPY";
  else if (sym.includes(".DEX") || sym.includes(".FRK")) currency = "EUR";
  else if (sym.includes(".AX")) currency = "AUD";
  else if (sym.includes(".TSX")) currency = "CAD";

  return {
    symbol: sym,
    price: parseFloat(q["05. price"]),
    open: parseFloat(q["02. open"]),
    high: parseFloat(q["03. high"]),
    low: parseFloat(q["04. low"]),
    volume: q["06. volume"],
    change: parseFloat(q["09. change"]),
    changePercent: parseFloat(q["10. change percent"]?.replace("%", "") || "0"),
    previousClose: parseFloat(q["08. previous close"]),
    latestDay: q["07. latest trading day"],
    currency,
  };
}

export async function getIntradayData(symbol: string): Promise<IntradayPoint[]> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=15min&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const series = data["Time Series (15min)"];
  if (!series) return [];

  return Object.entries(series)
    .map(([time, val]: [string, any]) => ({
      time,
      close: parseFloat(val["4. close"]),
    }))
    .reverse()
    .slice(-30);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", INR: "₹", GBP: "£", EUR: "€", JPY: "¥", AUD: "A$", CAD: "C$",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency + " ";
}

const TOP_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "RELIANCE.BSE", "TCS.BSE"];

export function getRandomTopStock(): string {
  return TOP_STOCKS[Math.floor(Math.random() * TOP_STOCKS.length)];
}
