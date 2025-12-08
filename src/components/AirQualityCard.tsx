import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Wind } from "lucide-react";

interface AirQualityCardProps {
  weather: WeatherData;
}

const getAQILevel = (index: number) => {
  switch (index) {
    case 1:
      return { label: "Good", color: "text-green-400", bgColor: "bg-green-500/20", description: "Air quality is satisfactory" };
    case 2:
      return { label: "Moderate", color: "text-yellow-400", bgColor: "bg-yellow-500/20", description: "Acceptable air quality" };
    case 3:
      return { label: "Unhealthy for Sensitive", color: "text-orange-400", bgColor: "bg-orange-500/20", description: "Sensitive groups may be affected" };
    case 4:
      return { label: "Unhealthy", color: "text-red-400", bgColor: "bg-red-500/20", description: "Health effects for everyone" };
    case 5:
      return { label: "Very Unhealthy", color: "text-purple-400", bgColor: "bg-purple-500/20", description: "Serious health effects" };
    case 6:
      return { label: "Hazardous", color: "text-rose-600", bgColor: "bg-rose-500/20", description: "Emergency health warning" };
    default:
      return { label: "Unknown", color: "text-muted-foreground", bgColor: "bg-muted/20", description: "Data unavailable" };
  }
};

export const AirQualityCard = ({ weather }: AirQualityCardProps) => {
  const airQuality = weather.current.air_quality;
  
  if (!airQuality) {
    return null;
  }

  const epaIndex = airQuality['us-epa-index'];
  const aqiLevel = getAQILevel(epaIndex);

  return (
    <WeatherCard className="p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Wind className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Air Quality Index</h3>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-xl ${aqiLevel.bgColor} flex items-center justify-center animate-glow-pulse`}>
          <span className={`text-2xl font-bold ${aqiLevel.color}`}>{epaIndex}</span>
        </div>
        <div>
          <div className={`text-lg font-semibold ${aqiLevel.color}`}>{aqiLevel.label}</div>
          <div className="text-sm text-muted-foreground">{aqiLevel.description}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-lg p-3 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02]">
          <div className="text-xs text-muted-foreground mb-1">PM2.5</div>
          <div className="text-sm font-medium text-foreground">{airQuality.pm2_5.toFixed(1)} µg/m³</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02]">
          <div className="text-xs text-muted-foreground mb-1">PM10</div>
          <div className="text-sm font-medium text-foreground">{airQuality.pm10.toFixed(1)} µg/m³</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02]">
          <div className="text-xs text-muted-foreground mb-1">O₃ (Ozone)</div>
          <div className="text-sm font-medium text-foreground">{airQuality.o3.toFixed(1)} µg/m³</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02]">
          <div className="text-xs text-muted-foreground mb-1">NO₂</div>
          <div className="text-sm font-medium text-foreground">{airQuality.no2.toFixed(1)} µg/m³</div>
        </div>
      </div>
    </WeatherCard>
  );
};