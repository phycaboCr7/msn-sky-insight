import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Droplets, Wind, Eye } from "lucide-react";
import { AnimatedWeatherIcon } from "./AnimatedWeatherIcon";
import { useRef, useState } from "react";

interface HourlyForecastProps {
  weather: WeatherData;
}

export const HourlyForecast = ({ weather }: HourlyForecastProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (!weather.forecast?.forecastday[0]?.hour) return null;

  // Use the location's local time, not browser time
  const locationTime = new Date(weather.location.localtime);
  const currentHour = locationTime.getHours();
  const allHours = [
    ...(weather.forecast.forecastday[0]?.hour || []),
    ...(weather.forecast.forecastday[1]?.hour || []),
  ];
  const hourlyData = allHours
    .filter(h => new Date(h.time) >= locationTime)
    .slice(0, 12);

  // Find temp range for gradient coloring
  const temps = hourlyData.map(h => h.temp_c);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const tempRange = maxTemp - minTemp || 1;

  const getTempColor = (temp: number) => {
    const pct = (temp - minTemp) / tempRange;
    if (pct > 0.7) return 'text-orange-400';
    if (pct > 0.4) return 'text-amber-300';
    return 'text-blue-300';
  };

  // Drag to scroll
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };
  const onMouseUp = () => setIsDragging(false);

  return (
    <WeatherCard className="p-4 sm:p-6 col-span-full">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Hourly Forecast
        </h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Next 12 hours</span>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="flex gap-1.5 sm:gap-2 pb-2 overflow-x-auto scrollbar-none select-none cursor-grab active:cursor-grabbing"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {hourlyData.map((hour, index) => {
          const time = new Date(hour.time);
          const isNow = index === 0;

          return (
            <div
              key={hour.time}
              className={`
                flex-shrink-0 w-[72px] sm:w-20 flex flex-col items-center gap-1.5
                py-3 px-1.5 rounded-2xl transition-all duration-300
                ${isNow
                  ? 'bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/25 shadow-lg shadow-primary/10'
                  : 'hover:bg-white/5 border border-transparent'
                }
              `}
            >
              {/* Time */}
              <span
                className={`text-[11px] font-semibold tracking-wide ${isNow ? 'text-primary' : 'text-muted-foreground'}`}
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {isNow ? 'Now' : time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
              </span>

              {/* Rain chance - only if > 0 */}
              {hour.chance_of_rain > 0 ? (
                <div className="flex items-center gap-0.5">
                  <Droplets size={9} className="text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-400">{hour.chance_of_rain}%</span>
                </div>
              ) : (
                <div className="h-3" />
              )}

              {/* Weather icon */}
              <div className="my-0.5">
                <AnimatedWeatherIcon
                  condition={hour.condition.text}
                  isDay={hour.is_day === 1}
                  temp={hour.temp_c}
                  size="sm"
                />
              </div>

              {/* Temperature */}
              <span
                className={`text-base sm:text-lg font-bold ${getTempColor(hour.temp_c)}`}
                style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
              >
                {Math.round(hour.temp_c)}°
              </span>

              {/* Wind */}
              <div className="flex items-center gap-0.5 opacity-60">
                <Wind size={8} className="text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground">{Math.round(hour.wind_kph)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </WeatherCard>
  );
};
