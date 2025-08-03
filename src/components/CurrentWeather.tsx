import { WeatherCard } from "./WeatherCard";
import { LocationBackground } from "./LocationBackground";
import { WeatherData } from "@/lib/weather";
import { Cloud, Sun, CloudRain, CloudSnow } from "lucide-react";
interface CurrentWeatherProps {
  weather: WeatherData;
}
const getWeatherIcon = (condition: string, isDay: boolean) => {
  const iconSize = 80;
  const iconColor = isDay ? "#fb923c" : "#60a5fa";
  if (condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear')) {
    return <Sun size={iconSize} color={iconColor} className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('rain')) {
    return <CloudRain size={iconSize} color="#60a5fa" className="-bottom-0 " />;
  } else if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow size={iconSize} color="#e2e8f0" className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('cloud')) {
    return <Cloud size={iconSize} color="#94a3b8" className="drop-shadow-lg" />;
  }
  return <Sun size={iconSize} color={iconColor} className="drop-shadow-lg" />;
};
export const CurrentWeather = ({
  weather
}: CurrentWeatherProps) => {
  const {
    current,
    location
  } = weather;
  const isDay = current.is_day === 1;
  return <WeatherCard className="p-8 col-span-full lg:col-span-2 relative overflow-hidden animate-slide-up">
      {/* Location background image */}
      <LocationBackground weather={weather} />
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none z-5" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none z-5" />
      
      {/* Blur separator for location image */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-5" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 animate-float">
            {getWeatherIcon(current.condition.text, isDay)}
          </div>
          <div className="space-y-2">
            <div className="text-6xl lg:text-8xl font-light text-foreground animate-scale-in bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {Math.round(current.temp_c)}°
            </div>
            <div className="text-xl text-muted-foreground animate-slide-up">
              {current.condition.text}
            </div>
          </div>
        </div>
        
        <div className="text-right space-y-3 animate-fade-in">
          <div className="text-2xl font-semibold text-foreground bg-gradient-to-r from-foreground via-primary/20 to-foreground bg-clip-text">
            {location.name}
          </div>
          <div className="text-muted-foreground text-lg">
            {location.region}, {location.country}
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-sm text-muted-foreground">Feels like</div>
            <div className="text-lg font-semibold text-primary">
              {Math.round(current.feelslike_c)}°
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>;
};