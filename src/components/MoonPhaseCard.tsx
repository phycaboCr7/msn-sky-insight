import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Moon } from "lucide-react";

interface MoonPhaseCardProps {
  weather: WeatherData;
}

// Moon phase emoji/icon based on phase name
const getMoonPhaseIcon = (phase: string) => {
  const phaseMap: { [key: string]: string } = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Third Quarter": "🌗",
    "Waning Crescent": "🌘",
  };
  return phaseMap[phase] || "🌙";
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
        <div className="text-6xl animate-pulse-slow">
          {getMoonPhaseIcon(moon_phase)}
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
