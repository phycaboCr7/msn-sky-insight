import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";

interface UVIndexChartProps {
  weather: WeatherData;
}

const getUVColor = (uv: number) => {
  if (uv <= 2) return "hsl(142 71% 45%)";
  if (uv <= 5) return "hsl(48 96% 53%)";
  if (uv <= 7) return "hsl(25 95% 53%)";
  if (uv <= 10) return "hsl(0 84% 60%)";
  return "hsl(265 75% 55%)";
};

const getUVLevel = (uv: number) => {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
};

const getUVMaxInfo = (weather: WeatherData) => {
  const hours = weather.forecast?.forecastday?.[0]?.hour;
  if (!hours) return null;
  let maxUV = 0;
  let maxHour = '';
  for (const h of hours) {
    if (h.uv > maxUV) {
      maxUV = h.uv;
      maxHour = new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  return { maxUV, maxHour, level: getUVLevel(maxUV) };
};

export const UVIndexChart = ({ weather }: UVIndexChartProps) => {
  const uvValue = weather.current.uv;
  const maxUV = 11;
  const percentage = (uvValue / maxUV) * 100;
  const color = getUVColor(uvValue);
  const uvMaxInfo = getUVMaxInfo(weather);

  // SVG gauge ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-1">
      <h3
        className="text-lg font-bold text-foreground mb-5"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        UV Index
      </h3>

      <div className="flex items-center justify-center mb-4">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background ring */}
            <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(220 15% 20%)" strokeWidth="6" />
            {/* Progress ring */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-4xl font-bold leading-none"
              style={{ color, fontFamily: "'Bodoni Moda', serif" }}
            >
              {uvValue}
            </span>
            <span className="text-sm font-medium text-muted-foreground mt-1">{getUVLevel(uvValue)}</span>
            <span className="text-[10px] text-muted-foreground/50 mt-0.5">UV Index</span>
          </div>
        </div>
      </div>

      {uvMaxInfo && (
        <div className="text-center text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          Peak UV will be <span className="text-foreground font-semibold">{getUVLevel(uvMaxInfo.maxUV)}</span>,
          expected at <span className="text-foreground font-semibold">{uvMaxInfo.maxHour}</span>.
        </div>
      )}
    </WeatherCard>
  );
};
