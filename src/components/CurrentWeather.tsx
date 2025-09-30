import { WeatherCard } from "./WeatherCard";
import { LocationBackground } from "./LocationBackground";
import { WeatherData } from "@/lib/weather";
import { getCountryFlag } from "@/lib/utils";
import { Cloud, Moon, CloudRain, CloudSnow, Snowflake, Sun } from "lucide-react";
interface CurrentWeatherProps {
  weather: WeatherData;
}
const getWeatherIcon = (condition: string, isDay: boolean, temp?: number) => {
  const iconSize = 80;
  
  if (temp && temp < 5) {
    return <Snowflake size={iconSize} color="#e2e8f0" className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
    if (isDay) {
      return <Sun size={iconSize} color="#fb923c" className="drop-shadow-lg" />;
    } else {
      return <Moon size={iconSize} color="#60a5fa" className="drop-shadow-lg" />;
    }
  } else if (condition.toLowerCase().includes('rain')) {
    return <CloudRain size={iconSize} color="#60a5fa" className="-bottom-0 " />;
  } else if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow size={iconSize} color="#e2e8f0" className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('cloud')) {
    return <Cloud size={iconSize} color="#94a3b8" className="drop-shadow-lg" />;
  }
  
  if (isDay) {
    return <Sun size={iconSize} color="#fb923c" className="drop-shadow-lg" />;
  } else {
    return <Moon size={iconSize} color="#60a5fa" className="drop-shadow-lg" />;
  }
};
export const CurrentWeather = ({
  weather
}: CurrentWeatherProps) => {
  const {
    current,
    location
  } = weather;
  const isDay = current.is_day === 1;
  return <WeatherCard className="p-4 sm:p-6 lg:p-8 col-span-full lg:col-span-2 relative overflow-hidden animate-slide-up">
      {/* Location background image */}
      <LocationBackground weather={weather} />
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none z-5" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none z-5" />
      
      {/* Blur separator for location image */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-5" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div className="flex-shrink-0 animate-float">
            {getWeatherIcon(current.condition.text, isDay, current.temp_c)}
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div className="text-4xl sm:text-6xl lg:text-8xl font-light text-foreground animate-scale-in bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {Math.round(current.temp_c)}°
            </div>
            <div className="text-base sm:text-xl text-muted-foreground animate-slide-up">
              {current.condition.text}
            </div>
          </div>
        </div>
        
        <div className="text-left sm:text-right space-y-2 sm:space-y-3 animate-fade-in w-full sm:w-auto">
          <div className="text-xl sm:text-2xl font-semibold text-foreground bg-gradient-to-r from-foreground via-primary/20 to-foreground bg-clip-text">
            {location.name}
          </div>
          <div className="text-muted-foreground text-base sm:text-lg">
            {location.region}, {location.country}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
              <div className="text-xs sm:text-sm text-muted-foreground">Feels like</div>
              <div className="text-base sm:text-lg font-semibold text-primary">
                {Math.round(current.feelslike_c)}°
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10 flex flex-col items-center justify-center min-w-[70px]">
              <div className="text-3xl sm:text-4xl mb-1">
                {getCountryFlag(location.country)}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">
                {location.country}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>;
};