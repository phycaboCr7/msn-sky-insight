import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Moon } from "lucide-react";

interface MoonPhaseCardProps {
  weather: WeatherData;
}

const getMoonEmoji = (phase: string): string => {
  switch (phase) {
    case "New Moon": return "🌑";
    case "Waxing Crescent": return "🌒";
    case "First Quarter": return "🌓";
    case "Waxing Gibbous": return "🌔";
    case "Full Moon": return "🌕";
    case "Waning Gibbous": return "🌖";
    case "Last Quarter":
    case "Third Quarter": return "🌗";
    case "Waning Crescent": return "🌘";
    default: return "🌕";
  }
};

const getNextPhase = (phase: string): string => {
  const cycle = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const idx = cycle.indexOf(phase);
  if (idx === -1) return "Full Moon";
  return cycle[(idx + 1) % cycle.length];
};

export const MoonPhaseCard = ({ weather }: MoonPhaseCardProps) => {
  const todayForecast = weather.forecast?.forecastday?.[0];
  const astro = todayForecast?.astro;
  if (!astro) return null;

  const { moon_phase, moon_illumination, moonrise, moonset } = astro;
  const illum = parseInt(String(moon_illumination)) || 0;
  const nextPhase = getNextPhase(moon_phase);

  // SVG ring for illumination
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (illum / 100) * circumference;

  return (
    <WeatherCard className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-5 h-5 text-primary" />
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Moon Phase
        </h3>
      </div>

      {/* Moon with illumination ring */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="url(#moonGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(220, 80%, 70%)" />
                <stop offset="100%" stopColor="hsl(260, 70%, 75%)" />
              </linearGradient>
            </defs>
          </svg>
          {/* Emoji */}
          <span className="text-6xl leading-none drop-shadow-[0_0_20px_rgba(180,200,255,0.3)]">
            {getMoonEmoji(moon_phase)}
          </span>
        </div>

        {/* Phase name */}
        <div
          className="text-xl font-bold text-foreground mt-2"
          style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
        >
          {moon_phase}
        </div>

        {/* Illumination */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
            {moon_illumination}%
          </span>
          <span className="text-xs text-muted-foreground">illuminated</span>
        </div>

        {/* Next phase */}
        <div className="text-[11px] text-muted-foreground mt-2">
          Next: <span className="text-foreground font-medium">{getMoonEmoji(nextPhase)} {nextPhase}</span>
        </div>
      </div>

      {/* Moonrise & Moonset */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 rounded-xl p-3 text-center border border-indigo-400/15">
          <div className="text-[10px] text-muted-foreground mb-0.5">🌙 Moonrise</div>
          <div
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {moonrise}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-xl p-3 text-center border border-purple-400/15">
          <div className="text-[10px] text-muted-foreground mb-0.5">🌑 Moonset</div>
          <div
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {moonset}
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};
