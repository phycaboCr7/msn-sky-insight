import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Cloud, Moon, CloudRain, CloudSnow, Snowflake, Sun } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HourlyForecastProps {
  weather: WeatherData;
}

const getWeatherIcon = (condition: string, isDay: boolean, temp?: number) => {
  const iconSize = 32;
  
  if (temp && temp < 5) {
    return <Snowflake size={iconSize} color="#e2e8f0" />;
  } else if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
    if (isDay) {
      return <Sun size={iconSize} color="#fb923c" />;
    } else {
      return <Moon size={iconSize} color="#60a5fa" />;
    }
  } else if (condition.toLowerCase().includes('rain')) {
    return <CloudRain size={iconSize} color="#60a5fa" />;
  } else if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow size={iconSize} color="#e2e8f0" />;
  } else if (condition.toLowerCase().includes('cloud')) {
    return <Cloud size={iconSize} color="#94a3b8" />;
  }
  
  if (isDay) {
    return <Sun size={iconSize} color="#fb923c" />;
  } else {
    return <Moon size={iconSize} color="#60a5fa" />;
  }
};

export const HourlyForecast = ({ weather }: HourlyForecastProps) => {
  if (!weather.forecast?.forecastday[0]?.hour) return null;

  const currentHour = new Date().getHours();
  const hourlyData = weather.forecast.forecastday[0].hour
    .slice(currentHour, currentHour + 12)
    .concat(
      weather.forecast.forecastday[1]?.hour?.slice(0, Math.max(0, 12 - (24 - currentHour))) || []
    );

  return (
    <WeatherCard className="p-6 col-span-full animate-slide-left">
      <h3 className="text-lg font-semibold text-foreground mb-4">Hourly Forecast</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4 w-max min-w-full">
          {hourlyData.map((hour, index) => {
            const time = new Date(hour.time);
            const isNow = index === 0;
            
            return (
              <div
                key={hour.time}
                className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:scale-105 ${
                  isNow 
                    ? 'bg-primary/20 border border-primary/30 shadow-glow' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="text-sm text-muted-foreground font-medium">
                  {isNow ? 'Now' : time.toLocaleTimeString('en-US', { 
                    hour: 'numeric',
                    hour12: true 
                  })}
                </div>
                <div className="my-2">
                  {getWeatherIcon(hour.condition.text, hour.is_day === 1, hour.temp_c)}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {Math.round(hour.temp_c)}°
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {hour.chance_of_rain > 0 && (
                    <div className="text-blue-400">
                      {hour.chance_of_rain}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </WeatherCard>
  );
};