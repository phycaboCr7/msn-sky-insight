import { WeatherCard } from "./WeatherCard";
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
    return <CloudRain size={iconSize} color="#60a5fa" className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow size={iconSize} color="#e2e8f0" className="drop-shadow-lg" />;
  } else if (condition.toLowerCase().includes('cloud')) {
    return <Cloud size={iconSize} color="#94a3b8" className="drop-shadow-lg" />;
  }
  
  return <Sun size={iconSize} color={iconColor} className="drop-shadow-lg" />;
};

export const CurrentWeather = ({ weather }: CurrentWeatherProps) => {
  const { current, location } = weather;
  const isDay = current.is_day === 1;

  return (
    <WeatherCard className="p-8 col-span-full lg:col-span-2">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            {getWeatherIcon(current.condition.text, isDay)}
          </div>
          <div>
            <div className="text-6xl lg:text-7xl font-light text-foreground">
              {Math.round(current.temp_c)}°
            </div>
            <div className="text-xl text-muted-foreground mt-2">
              {current.condition.text}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-medium text-foreground">
            {location.name}
          </div>
          <div className="text-muted-foreground">
            {location.region}, {location.country}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Feels like {Math.round(current.feelslike_c)}°
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};