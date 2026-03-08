import { useState, useEffect, useRef, useCallback } from "react";
import { getStockQuote, getChartData, getRandomTopStock, searchStocks, getCurrencySymbol, StockQuote, ChartPoint, StockSearchResult } from "@/services/stockService";
import { WeatherCard } from "./WeatherCard";
import { TrendingUp, TrendingDown, Search, Loader2, BarChart3 } from "lucide-react";

const TABS = ["1D", "5D", "1M", "1Y", "5Y", "Max"];

export const StockWidget = () => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("1D");
  const [suggestions, setSuggestions] = useState<StockSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentSymbolRef = useRef("");

  const fetchStock = async (sym: string, currency?: string) => {
    setLoading(true);
    setError("");
    setSuggestions([]);
    setShowSuggestions(false);
    currentSymbolRef.current = sym;
    try {
      const [q, chart] = await Promise.all([getStockQuote(sym), getChartData(sym, "1D")]);
      if (currency) {
        q.currency = currency;
        setDetectedCurrency(currency);
      }
      setQuote(q);
      setChartData(chart);
      setActiveTab("1D");
    } catch {
      setError("Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  };

  const fetchChart = useCallback(async (tab: string) => {
    if (!currentSymbolRef.current) return;
    setChartLoading(true);
    try {
      const chart = await getChartData(currentSymbolRef.current, tab);
      setChartData(chart);
    } catch {
      setError("Failed to fetch stock data");
    } finally {
      setChartLoading(false);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchChart(tab);
  };

  useEffect(() => {
    const sym = getRandomTopStock();
    fetchStock(sym, "USD");
  }, []);

  const handleInputChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchStocks(val.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  };

  const selectSuggestion = (s: StockSearchResult) => {
    setSearchInput(s.symbol);
    setShowSuggestions(false);
    fetchStock(s.symbol, s.currency);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = async () => {
    const val = searchInput.trim();
    if (!val) return;
    // Always search first to get correct currency and handle typos
    setSearchLoading(true);
    try {
      const results = await searchStocks(val);
      if (results.length > 0) {
        selectSuggestion(results[0]);
      } else {
        fetchStock(val.toUpperCase());
      }
    } catch {
      fetchStock(val.toUpperCase());
    } finally {
      setSearchLoading(false);
    }
  };

  const isPositive = quote ? quote.change >= 0 : true;
  const currSym = quote ? getCurrencySymbol(quote.currency) : "$";

  return (
    <WeatherCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground/80">Stock Market</span>
        </div>
        <div className="relative" ref={containerRef}>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchInput}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground w-32 placeholder:text-foreground/40 focus:outline-none focus:border-primary/50"
            />
            <button onClick={handleSearch} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/70" /> : <Search className="w-3.5 h-3.5 text-foreground/70" />}
            </button>
          </div>
          {showSuggestions && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-black/90 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-[9999] max-h-64 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{s.symbol}</span>
                    <span className="text-[10px] text-foreground/40 bg-white/10 px-1.5 py-0.5 rounded">{s.currency}</span>
                  </div>
                  <div className="text-[10px] text-foreground/50 mt-0.5 truncate">{s.name}</div>
                  <div className="text-[9px] text-foreground/30 mt-0.5">{s.region} · {s.type}</div>
                </button>
              ))}
            </div>
          )}
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
          <p className="text-[10px] text-foreground/50 mb-1 font-medium">{quote.symbol}</p>
          <div className="mb-1">
            <span className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
              {currSym}{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-foreground/50 ml-1.5">{quote.currency}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? "▲" : "▼"} {currSym}{Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%) today
            </div>
          </div>
          <p className="text-[10px] text-foreground/40 mb-3">{quote.latestDay} · Market Data</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-2">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                  activeTab === t ? "bg-primary/30 text-primary" : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Chart */}
          <StockChart
            data={chartData}
            isPositive={isPositive}
            previousClose={quote.previousClose}
            currSym={currSym}
            loading={chartLoading}
          />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-xs">
            {[
              ["Open", `${currSym}${quote.open.toFixed(2)}`],
              ["Vol", Number(quote.volume).toLocaleString()],
              ["High", `${currSym}${quote.high.toFixed(2)}`],
              ["Prev Close", `${currSym}${quote.previousClose.toFixed(2)}`],
              ["Low", `${currSym}${quote.low.toFixed(2)}`],
              ["Change", `${quote.change >= 0 ? "+" : "-"}${currSym}${Math.abs(quote.change).toFixed(2)}`],
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

// Extracted chart component
const StockChart = ({
  data,
  isPositive,
  previousClose,
  currSym,
  loading,
}: {
  data: ChartPoint[];
  isPositive: boolean;
  previousClose: number;
  currSym: string;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/30" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-foreground/30 text-xs">
        No chart data available
      </div>
    );
  }

  const prices = data.map(p => p.close);
  const volumes = data.map(p => p.volume);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const maxVol = Math.max(...volumes) || 1;

  const w = 340;
  const priceH = 110;
  const volH = 30;
  const totalH = priceH + volH + 8;
  const padding = 4;

  // Build smooth price line
  const pricePoints = prices.map((p, i) => {
    const x = padding + (i / (prices.length - 1)) * (w - padding * 2);
    const y = padding + priceH - ((p - min) / range) * (priceH - padding * 2);
    return { x, y };
  });

  const linePath = pricePoints.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");
  const fillPath = `${linePath} L${pricePoints[pricePoints.length - 1].x},${priceH} L${pricePoints[0].x},${priceH} Z`;

  const color = isPositive ? "#22c55e" : "#ef4444";
  const colorDim = isPositive ? "#22c55e40" : "#ef444440";

  // Previous close line
  const prevY = padding + priceH - ((previousClose - min) / range) * (priceH - padding * 2);
  const prevInRange = prevY > padding && prevY < priceH;

  // Volume bars
  const barWidth = Math.max(1, (w - padding * 2) / volumes.length - 1);

  return (
    <svg viewBox={`0 0 ${w} ${totalH}`} className="w-full mt-1" style={{ height: "160px" }}>
      <defs>
        <linearGradient id="priceGradFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(frac => {
        const y = padding + (1 - frac) * (priceH - padding * 2);
        return (
          <line key={frac} x1={padding} y1={y} x2={w - padding} y2={y}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
        );
      })}

      {/* Price area fill */}
      <path d={fillPath} fill="url(#priceGradFill)" />

      {/* Price line */}
      <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

      {/* End dot */}
      <circle cx={pricePoints[pricePoints.length - 1].x} cy={pricePoints[pricePoints.length - 1].y} r="3" fill={color} filter="url(#glow)" />

      {/* Previous close dashed line */}
      {prevInRange && (
        <>
          <line x1={padding} y1={prevY} x2={w - padding} y2={prevY}
            stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" strokeOpacity="0.5" />
          <text x={w - padding - 2} y={prevY - 4} fill="#94a3b8" fontSize="7" textAnchor="end" opacity="0.7">
            Prev Close {currSym}{previousClose.toFixed(1)}
          </text>
        </>
      )}

      {/* Min/Max labels */}
      <text x={padding + 2} y={padding + 8} fill={color} fontSize="7" opacity="0.6">
        {currSym}{max.toFixed(1)}
      </text>
      <text x={padding + 2} y={priceH - 2} fill={color} fontSize="7" opacity="0.6">
        {currSym}{min.toFixed(1)}
      </text>

      {/* Volume section */}
      <text x={padding} y={priceH + 10} fill="currentColor" fillOpacity="0.3" fontSize="6">Vol</text>
      {volumes.map((v, i) => {
        const x = padding + (i / volumes.length) * (w - padding * 2);
        const h = (v / maxVol) * volH;
        const barColor = data[i].close >= (data[i - 1]?.close ?? data[i].close) ? color : colorDim;
        return (
          <rect key={i} x={x} y={priceH + 12 + volH - h} width={barWidth} height={h}
            fill={barColor} rx="0.5" opacity="0.6" />
        );
      })}
    </svg>
  );
};
