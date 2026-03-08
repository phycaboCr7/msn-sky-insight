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
  };
}

export interface IntradayPoint {
  time: string;
  close: number;
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

const TOP_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "RELIANCE.BSE", "TCS.BSE"];

export function getRandomTopStock(): string {
  return TOP_STOCKS[Math.floor(Math.random() * TOP_STOCKS.length)];
}
