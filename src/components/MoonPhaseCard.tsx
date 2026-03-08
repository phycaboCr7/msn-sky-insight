import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Moon } from "lucide-react";

interface MoonPhaseCardProps {
  weather: WeatherData;
}

// Realistic SVG moon phase renderer
const MoonPhaseSVG = ({ phase, size = 80 }: { phase: string; size?: number }) => {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  // Moon surface details (warm tan patches on lit side)
  const craters = (
    <g opacity="0.45">
      <ellipse cx={cx - r * 0.15} cy={cy - r * 0.2} rx={r * 0.18} ry={r * 0.14} fill="#d4b896" />
      <ellipse cx={cx + r * 0.2} cy={cy + r * 0.15} rx={r * 0.22} ry={r * 0.16} fill="#c9a87a" />
      <ellipse cx={cx - r * 0.05} cy={cy + r * 0.4} rx={r * 0.13} ry={r * 0.09} fill="#d4b896" />
      <ellipse cx={cx + r * 0.3} cy={cy - r * 0.35} rx={r * 0.1} ry={r * 0.12} fill="#c9a87a" />
      <ellipse cx={cx - r * 0.35} cy={cy + r * 0.15} rx={r * 0.09} ry={r * 0.07} fill="#d4b896" />
      <ellipse cx={cx + r * 0.1} cy={cy - r * 0.5} rx={r * 0.08} ry={r * 0.06} fill="#c9a87a" />
    </g>
  );

  const litColor = "#f0e6c8";       // warm cream
  const darkColor = "#2d4a4e";      // dark teal
  const darkCraters = (
    <g opacity="0.3">
      <ellipse cx={cx - r * 0.2} cy={cy - r * 0.25} rx={r * 0.14} ry={r * 0.1} fill="#1e3538" />
      <ellipse cx={cx + r * 0.15} cy={cy + r * 0.2} rx={r * 0.18} ry={r * 0.12} fill="#1e3538" />
      <ellipse cx={cx - r * 0.1} cy={cy + r * 0.4} rx={r * 0.1} ry={r * 0.07} fill="#1e3538" />
      <ellipse cx={cx + r * 0.3} cy={cy - r * 0.15} rx={r * 0.08} ry={r * 0.06} fill="#1e3538" />
    </g>
  );

  // Get illumination shape based on phase
  const getPhaseClip = () => {
    switch (phase) {
      case "New Moon":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={darkColor} />
            {darkCraters}
          </>
        );
      case "Full Moon":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={litColor} />
            {craters}
          </>
        );
      case "Waxing Crescent":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={darkColor} />
            {darkCraters}
            <clipPath id="waxCres"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <ellipse cx={cx + r * 0.3} cy={cy} rx={r * 0.7} ry={r} fill={litColor} clipPath="url(#waxCres)" />
            <ellipse cx={cx + r * 0.3} cy={cy} rx={r * 0.7} ry={r} fill={litColor} clipPath="url(#waxCres)" opacity="0" />
          </>
        );
      case "First Quarter":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={darkColor} />
            {darkCraters}
            <clipPath id="firstQ"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <rect x={cx} y={cy - r} width={r} height={r * 2} fill={litColor} clipPath="url(#firstQ)" />
          </>
        );
      case "Waxing Gibbous":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={litColor} />
            {craters}
            <clipPath id="waxGib"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <ellipse cx={cx - r * 0.3} cy={cy} rx={r * 0.7} ry={r} fill={darkColor} clipPath="url(#waxGib)" />
          </>
        );
      case "Waning Gibbous":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={litColor} />
            {craters}
            <clipPath id="wanGib"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <ellipse cx={cx + r * 0.3} cy={cy} rx={r * 0.7} ry={r} fill={darkColor} clipPath="url(#wanGib)" />
          </>
        );
      case "Last Quarter":
      case "Third Quarter":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={darkColor} />
            {darkCraters}
            <clipPath id="lastQ"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <rect x={cx - r} y={cy - r} width={r} height={r * 2} fill={litColor} clipPath="url(#lastQ)" />
          </>
        );
      case "Waning Crescent":
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={darkColor} />
            {darkCraters}
            <clipPath id="wanCres"><circle cx={cx} cy={cy} r={r} /></clipPath>
            <ellipse cx={cx - r * 0.3} cy={cy} rx={r * 0.7} ry={r} fill={litColor} clipPath="url(#wanCres)" />
          </>
        );
      default:
        return (
          <>
            <circle cx={cx} cy={cy} r={r} fill={litColor} />
            {craters}
          </>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="85%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(232,220,160,0.15)" />
        </radialGradient>
      </defs>
      {getPhaseClip()}
      <circle cx={cx} cy={cy} r={r} fill="url(#moonGlow)" />
    </svg>
  );
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
