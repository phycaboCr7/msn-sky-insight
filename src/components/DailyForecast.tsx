import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Droplets } from "lucide-react";
import { AnimatedWeatherIcon } from "./AnimatedWeatherIcon";

interface DailyForecastProps {
  weather: WeatherData;
}

const getDayName = (dateString: string, index: number) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const getDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DailyForecast = ({ weather }: DailyForecastProps) => {
  if (!weather.forecast?.forecastday) return null;

  const dailyData = weather.forecast.forecastday;
  const daysCount = dailyData.length;
  const maxTemp = Math.max(...dailyData.map(d => d.day.maxtemp_c));
  const minTemp = Math.min(...dailyData.map(d => d.day.mintemp_c));
  const tempRange = maxTemp - minTemp || 1;

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-full lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          {daysCount}-Day Forecast
        </h3>
      </div>
      <div className="space-y-1">
        {dailyData.map((day, index) => {
          const dayName = getDayName(day.date, index);
          const dateLabel = getDateLabel(day.date);
          const isToday = index === 0;
          const highPct = ((day.day.maxtemp_c - minTemp) / tempRange) * 100;
          const lowPct = ((day.day.mintemp_c - minTemp) / tempRange) * 100;

          return (
            <div
              key={day.date}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group hover:bg-white/5 ${
                isToday ? 'bg-primary/8 border border-primary/20 shadow-sm shadow-primary/5' : ''
              }`}
            >
              {/* Day name + date */}
              <div className="w-20 flex-shrink-0">
                <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {dayName}
                </div>
                <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
              </div>

              {/* Weather icon - constrained with overflow-hidden */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden">
                <AnimatedWeatherIcon
                  condition={day.day.condition.text}
                  isDay={true}
                  temp={day.day.avgtemp_c}
                  size="sm"
                />
              </div>

              {/* Condition + rain */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{day.day.condition.text}</div>
                {day.day.daily_chance_of_rain > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Droplets className="w-2.5 h-2.5 text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-medium">{day.day.daily_chance_of_rain}%</span>
                  </div>
                )}
              </div>

              {/* Temperature bar */}
              <div className="hidden sm:flex items-center gap-2 w-32">
                <span className="text-[10px] text-blue-400 w-7 text-right font-semibold" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {Math.round(day.day.mintemp_c)}°
                </span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full rounded-full transition-all duration-500"
                    style={{
                      left: `${lowPct}%`,
                      width: `${Math.max(highPct - lowPct, 10)}%`,
                      background: `linear-gradient(90deg, hsl(215 80% 60%), hsl(30 90% 55%), hsl(15 90% 55%))`,
                      minWidth: '12px',
                    }}
                  />
                </div>
                <span className="text-[10px] text-orange-400 w-7 font-semibold" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {Math.round(day.day.maxtemp_c)}°
                </span>
              </div>

              {/* Temps (mobile fallback) */}
              <div className="flex sm:hidden items-center gap-1.5">
                <span className="text-base font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {Math.round(day.day.maxtemp_c)}°
                </span>
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {Math.round(day.day.mintemp_c)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </WeatherCard>
  );
};
