import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Navigation } from "lucide-react";

interface WindChartProps {
  weather: WeatherData;
}

export const WindChart = ({ weather }: WindChartProps) => {
  const { current } = weather;
  const windSpeed = Math.round(current.wind_kph);
  const windGust = Math.round(current.gust_kph);
  const windDirection = current.wind_dir;
  const windDegree = current.wind_degree;

  const getWindForce = (speed: number) => {
    if (speed < 12) return { level: "Light Breeze", color: "text-green-400" };
    if (speed < 30) return { level: "Moderate Breeze", color: "text-yellow-400" };
    if (speed < 50) return { level: "Fresh Breeze", color: "text-orange-400" };
    if (speed < 75) return { level: "Strong Breeze", color: "text-red-400" };
    return { level: "Gale", color: "text-purple-400" };
  };

  const windForce = getWindForce(windSpeed);

  return (
    <WeatherCard className="p-6 col-span-1">
      <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: '1.25rem' }}>Wind</h3>
      
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32 border-2 border-white/20 rounded-full">
          {/* Compass points */}
          <div className="absolute inset-2 rounded-full border border-white/10">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 text-xs text-muted-foreground">N</div>
            <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 text-xs text-muted-foreground">E</div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 text-xs text-muted-foreground">S</div>
            <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 text-xs text-muted-foreground">W</div>
          </div>
          
          {/* Wind direction arrow */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${windDegree}deg)` }}
          >
            <Navigation 
              size={24} 
              className="text-primary animate-pulse" 
              fill="currentColor"
            />
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg font-bold text-foreground mt-8" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>{windSpeed}</div>
            <div className="text-xs text-muted-foreground">km/h</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Direction</span>
          <span className="text-sm font-medium text-foreground">{windDirection}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Wind Speed</span>
          <span className="text-sm font-medium text-foreground">{windSpeed} km/h</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Gusts</span>
          <span className="text-sm font-medium text-foreground">{windGust} km/h</span>
        </div>
        
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-muted-foreground">Force</div>
          <div className={`text-sm font-medium ${windForce.color}`}>
            {windForce.level}
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};