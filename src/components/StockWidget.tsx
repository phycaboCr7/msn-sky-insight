import { useState, useEffect } from "react";
import { getStockQuote, getIntradayData, getRandomTopStock, StockQuote, IntradayPoint } from "@/services/stockService";
import { WeatherCard } from "./WeatherCard";
import { TrendingUp, TrendingDown, Search, Loader2, BarChart3 } from "lucide-react";

export const StockWidget = () => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [intraday, setIntraday] = useState<IntradayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("1D");

  const fetchStock = async (sym: string) => {
    setLoading(true);
    setError("");
    try {
      const [q, chart] = await Promise.all([getStockQuote(sym), getIntradayData(sym)]);
      setQuote(q);
      setIntraday(chart);
    } catch {
      setError("Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(getRandomTopStock());
  }, []);

  const handleSearch = () => {
    if (searchInput.trim()) fetchStock(searchInput.trim().toUpperCase());
  };

  const isPositive = quote ? quote.change >= 0 : true;
  const tabs = ["1D", "5D", "1M", "1Y", "5Y", "Max"];

  // Build mini SVG sparkline
  const buildSparkline = () => {
    if (intraday.length < 2) return null;
    const prices = intraday.map(p => p.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 320;
    const h = 100;
    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");

    const fillPoints = `0,${h} ${points} ${w},${h}`;
    const color = isPositive ? "#22c55e" : "#ef4444";
    const gradId = "stockGrad";

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-2">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(#${gradId})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        {/* Previous close line */}
        {quote && (() => {
          const prevY = h - ((quote.previousClose - min) / range) * h;
          return (
            <>
              <line x1="0" y1={prevY} x2={w} y2={prevY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
              <text x={w - 2} y={prevY - 4} fill="#94a3b8" fontSize="8" textAnchor="end">
                Previous Close {quote.previousClose.toFixed(1)}
              </text>
            </>
          );
        })()}
      </svg>
    );
  };

  return (
    <WeatherCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground/80">Stock Market</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Symbol..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground w-24 placeholder:text-foreground/40 focus:outline-none focus:border-primary/50"
          />
          <button onClick={handleSearch} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <Search className="w-3.5 h-3.5 text-foreground/70" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 text-center py-6">{error}</p>
      ) : quote ? (
        <>
          {/* Price */}
          <div className="mb-1">
            <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
              {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-foreground/50 ml-1">{quote.symbol.includes(".BSE") ? "INR" : "USD"}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? "▲" : "▼"} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%) today
            </div>
          </div>
          <p className="text-[10px] text-foreground/40 mb-3">{quote.latestDay} · Market Data</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-2">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                  activeTab === t ? "bg-primary/30 text-primary" : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Chart */}
          {buildSparkline()}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-xs">
            {[
              ["Open", quote.open.toFixed(2)],
              ["Vol", Number(quote.volume).toLocaleString()],
              ["High", quote.high.toFixed(2)],
              ["Prev Close", quote.previousClose.toFixed(2)],
              ["Low", quote.low.toFixed(2)],
              ["Change", `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-foreground/40">{label}</span>
                <span className="text-foreground/80 font-medium">{val}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </WeatherCard>
  );
};
