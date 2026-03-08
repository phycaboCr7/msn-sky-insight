import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Moon } from "lucide-react";

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

export const MoonPhaseCard = ({ weather }: MoonPhaseCardProps) => {
  const todayForecast = weather.forecast?.forecastday?.[0];
  const astro = todayForecast?.astro;
  
  if (!astro) return null;

  const { moon_phase, moon_illumination, moonrise, moonset } = astro;

  return (
    <WeatherCard className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Moon className="w-5 h-5 text-primary" />
        <h3 
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Moon Phase
        </h3>
      </div>
      
      <div className="flex flex-col items-center gap-4">
        {/* Large Moon Icon */}
        <div>
          <MoonPhaseSVG phase={moon_phase} size={80} />
        </div>
        
        {/* Phase Name */}
        <div 
          className="text-xl font-semibold text-foreground text-center"
          style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
        >
          {moon_phase}
        </div>
        
        {/* Illumination */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Illumination</div>
          <div 
            className="text-2xl font-bold text-primary"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {moon_illumination}%
          </div>
        </div>
        
        {/* Moonrise & Moonset Times */}
        <div className="w-full grid grid-cols-2 gap-4 mt-2">
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <div className="text-xs text-muted-foreground mb-1">Moonrise</div>
            <div 
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
            >
              {moonrise}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <div className="text-xs text-muted-foreground mb-1">Moonset</div>
            <div 
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
            >
              {moonset}
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};
