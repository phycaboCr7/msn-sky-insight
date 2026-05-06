import { useEffect, useState, lazy, Suspense } from "react";
import { WeatherData, getForecastWeather } from "@/lib/weather";
import { Loader2 } from "lucide-react";
import logoSrc from "@/assets/logo.png";

const WeatherzaAI = lazy(() => import("@/components/WeatherzaAI").then(m => ({ default: m.WeatherzaAI })));

const AIWindow = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    document.title = "Weatherza AI";
    let loc = "auto:ip";
    try {
      const last = localStorage.getItem("weatherza-last-location");
      if (last) loc = last;
    } catch {}
    getForecastWeather(loc, 7).then(setWeather).catch(() => {
      getForecastWeather("auto:ip", 7).then(setWeather).catch(() => {});
    });
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
        background: "radial-gradient(ellipse at top, #2d2350 0%, #0a0a14 55%, #000 100%)",
      }}
    >
      {/* macOS-style window chrome */}
      <div className="sticky top-0 z-50 backdrop-blur-2xl bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <img src={logoSrc} alt="Weatherza" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,140,0,0.6)]" />
            <span className="text-white/85 text-[13px] font-medium tracking-tight">Weatherza AI</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-6xl mx-auto">
        {weather ? (
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading AI…
            </div>
          }>
            <WeatherzaAI weather={weather} />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center py-20 text-white/60">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Fetching weather…
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWindow;
