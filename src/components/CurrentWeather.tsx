import { WeatherCard } from "./WeatherCard";
import { LocationBackground } from "./LocationBackground";
import { WeatherData, AirQuality } from "@/lib/weather";
import { getFlagUrl } from "@/lib/utils";
import { Cloud, Moon, CloudRain, CloudSnow, Snowflake, Sun, Wind } from "lucide-react";

interface CurrentWeatherProps {
  weather: WeatherData;
}

// Calculate actual AQI from PM2.5
const calculateAQI = (pm25: number): number => {
  const breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return { color: "text-green-400", bg: "bg-green-500/20" };
  if (aqi <= 100) return { color: "text-yellow-400", bg: "bg-yellow-500/20" };
  if (aqi <= 150) return { color: "text-orange-400", bg: "bg-orange-500/20" };
  if (aqi <= 200) return { color: "text-red-400", bg: "bg-red-500/20" };
  if (aqi <= 300) return { color: "text-purple-400", bg: "bg-purple-500/20" };
  return { color: "text-rose-600", bg: "bg-rose-500/20" };
};

const MiniAQIBox = ({ airQuality }: { airQuality: AirQuality }) => {
  const aqi = calculateAQI(airQuality.pm2_5);
  const { color, bg } = getAQIColor(aqi);
  
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Wind className="w-3 h-3" />
        <span>AQI</span>
      </div>
      <div className={`text-base sm:text-lg font-semibold ${color}`}>
        {aqi}
      </div>
    </div>
  );
};
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
          <div className="flex-shrink-0 animate-icon-glow">
            {getWeatherIcon(current.condition.text, isDay, current.temp_c)}
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div className="text-4xl sm:text-6xl lg:text-8xl font-digital text-foreground animate-scale-in tracking-wider" style={{ fontFamily: "'Orbitron', 'SF Pro Display', system-ui, sans-serif", fontWeight: 500, letterSpacing: '0.05em' }}>
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
          <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end flex-wrap">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
              <div className="text-xs sm:text-sm text-muted-foreground">Feels like</div>
              <div className="text-base sm:text-lg font-semibold text-primary">
                {Math.round(current.feelslike_c)}°
              </div>
            </div>
            {current.air_quality && (
              <MiniAQIBox airQuality={current.air_quality} />
            )}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10 flex flex-col items-center justify-center min-w-[80px]">
              <img 
                src={getFlagUrl(location.country)} 
                alt={`${location.country} flag`}
                className="w-12 h-8 object-cover rounded shadow-md mb-1.5"
              />
              <div className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">
                {location.country}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>;
};