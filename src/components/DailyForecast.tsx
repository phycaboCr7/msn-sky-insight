import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Cloud, Moon, CloudRain, CloudSnow, Snowflake, Sun } from "lucide-react";

interface DailyForecastProps {
  weather: WeatherData;
}

const getWeatherIcon = (condition: string, temp?: number) => {
  const iconSize = 40;
  
  if (temp && temp < 5) {
    return <Snowflake size={iconSize} color="#e2e8f0" />;
  } else if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
    return <Sun size={iconSize} color="#fb923c" />;
  } else if (condition.toLowerCase().includes('rain')) {
    return <CloudRain size={iconSize} color="#60a5fa" />;
  } else if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow size={iconSize} color="#e2e8f0" />;
  } else if (condition.toLowerCase().includes('cloud')) {
    return <Cloud size={iconSize} color="#94a3b8" />;
  }
  
  return <Sun size={iconSize} color="#fb923c" />;
};

const getDayName = (dateString: string, index: number) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export const DailyForecast = ({ weather }: DailyForecastProps) => {
  if (!weather.forecast?.forecastday) return null;

  const dailyData = weather.forecast.forecastday;
  const daysCount = dailyData.length;

  return (
    <WeatherCard className="p-6 col-span-full lg:col-span-1">
      <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: '1.25rem' }}>
        {daysCount}-Day Forecast
      </h3>
      <div className="space-y-3">
        {dailyData.map((day, index) => {
          const dayName = getDayName(day.date, index);
          const isToday = index === 0;
          
          return (
            <div
              key={day.date}
              className={`flex items-center justify-between p-3 rounded-lg transition-all hover:bg-muted/20 ${
                isToday ? 'bg-primary/10 border border-primary/20' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-16 text-sm font-medium text-foreground">
                  {dayName}
                </div>
                <div className="flex-shrink-0">
                  {getWeatherIcon(day.day.condition.text, day.day.avgtemp_c)}
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {day.day.condition.text}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {day.day.daily_chance_of_rain > 0 && (
                  <div className="text-xs text-blue-400 font-medium">
                    {day.day.daily_chance_of_rain}%
                  </div>
                )}
                <div className="flex items-center gap-2 text-right">
                  <span className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                    {Math.round(day.day.maxtemp_c)}°
                  </span>
                  <span className="text-muted-foreground" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                    {Math.round(day.day.mintemp_c)}°
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WeatherCard>
  );
};