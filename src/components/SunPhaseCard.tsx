import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Sun } from "lucide-react";

interface SunPhaseCardProps {
  weather: WeatherData;
}

// Sun position emoji based on time
const getSunPositionIcon = (sunrise: string, sunset: string, localtime: string) => {
  const now = new Date(localtime);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Parse sunrise/sunset times (format: "06:45 AM")
  const parseTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let h = hours;
    if (period === 'PM' && hours !== 12) h += 12;
    if (period === 'AM' && hours === 12) h = 0;
    return h * 60 + minutes;
  };
  
  const nowMinutes = currentHour * 60 + currentMinute;
  const sunriseMinutes = parseTime(sunrise);
  const sunsetMinutes = parseTime(sunset);
  
  // Check if it's night
  if (nowMinutes < sunriseMinutes || nowMinutes > sunsetMinutes) {
    return { icon: "🌙", phase: "Night", position: "Below Horizon" };
  }
  
  const dayLength = sunsetMinutes - sunriseMinutes;
  const elapsed = nowMinutes - sunriseMinutes;
  const percentage = (elapsed / dayLength) * 100;
  
  if (percentage < 15) {
    return { icon: "🌅", phase: "Dawn", position: "Rising" };
  } else if (percentage < 40) {
    return { icon: "☀️", phase: "Morning", position: "Ascending" };
  } else if (percentage < 60) {
    return { icon: "🌞", phase: "Noon", position: "Peak" };
  } else if (percentage < 85) {
    return { icon: "☀️", phase: "Afternoon", position: "Descending" };
  } else {
    return { icon: "🌇", phase: "Dusk", position: "Setting" };
  }
};

export const SunPhaseCard = ({ weather }: SunPhaseCardProps) => {
  const todayForecast = weather.forecast?.forecastday?.[0];
  const astro = todayForecast?.astro;
  
  if (!astro) return null;

  const { sunrise, sunset } = astro;
  const localtime = weather.location?.localtime || new Date().toISOString();
  const sunInfo = getSunPositionIcon(sunrise, sunset, localtime);

  return (
    <WeatherCard className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-5 h-5 text-orange-400" />
        <h3 
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Sun Position
        </h3>
      </div>
      
      <div className="flex flex-col items-center gap-4">
        {/* Large Sun Icon */}
        <div className="text-6xl">
          {sunInfo.icon}
        </div>
        
        {/* Phase Name */}
        <div 
          className="text-xl font-semibold text-foreground text-center"
          style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
        >
          {sunInfo.phase}
        </div>
        
        {/* Position */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Position</div>
          <div 
            className="text-2xl font-bold text-orange-400"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {sunInfo.position}
          </div>
        </div>
        
        {/* Sunrise & Sunset Times */}
        <div className="w-full grid grid-cols-2 gap-4 mt-2">
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <div className="text-xs text-muted-foreground mb-1">🌅 Sunrise</div>
            <div 
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
            >
              {sunrise}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
            <div className="text-xs text-muted-foreground mb-1">🌇 Sunset</div>
            <div 
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
            >
              {sunset}
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};
