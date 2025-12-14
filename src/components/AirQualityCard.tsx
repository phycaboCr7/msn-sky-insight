import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Wind } from "lucide-react";

interface AirQualityCardProps {
  weather: WeatherData;
}

// Calculate actual AQI from pollutant concentrations (US EPA formula)
const calculateAQI = (pm25: number, pm10: number, o3: number, no2: number): number => {
  // Simplified AQI calculation using PM2.5 as primary indicator
  // PM2.5 breakpoints (µg/m³) and corresponding AQI values
  const pm25Breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];

  for (const bp of pm25Breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

const getAQILevel = (aqi: number) => {
  if (aqi <= 50) {
    return { label: "Good", color: "text-green-400", bgColor: "bg-green-500/20", description: "Air quality is satisfactory" };
  } else if (aqi <= 100) {
    return { label: "Moderate", color: "text-yellow-400", bgColor: "bg-yellow-500/20", description: "Acceptable air quality" };
  } else if (aqi <= 150) {
    return { label: "Unhealthy for Sensitive", color: "text-orange-400", bgColor: "bg-orange-500/20", description: "Sensitive groups may be affected" };
  } else if (aqi <= 200) {
    return { label: "Unhealthy", color: "text-red-400", bgColor: "bg-red-500/20", description: "Health effects for everyone" };
  } else if (aqi <= 300) {
    return { label: "Very Unhealthy", color: "text-purple-400", bgColor: "bg-purple-500/20", description: "Serious health effects" };
  } else {
    return { label: "Hazardous", color: "text-rose-600", bgColor: "bg-rose-500/20", description: "Emergency health warning" };
  }
};

export const AirQualityCard = ({ weather }: AirQualityCardProps) => {
  const airQuality = weather.current.air_quality;
  
  if (!airQuality) {
    return null;
  }

  const actualAQI = calculateAQI(airQuality.pm2_5, airQuality.pm10, airQuality.o3, airQuality.no2);
  const aqiLevel = getAQILevel(actualAQI);

  return (
    <WeatherCard className="p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Wind className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground tracking-wide" style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: '1.25rem' }}>Air Quality Index</h3>
      </div>
      
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-20 h-20 rounded-2xl ${aqiLevel.bgColor} flex items-center justify-center animate-glow-pulse shadow-lg border border-white/10`}>
          <span className={`text-3xl font-bold ${aqiLevel.color} tracking-tight`} style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>{actualAQI}</span>
        </div>
        <div className="space-y-1">
          <div className={`text-xl font-semibold ${aqiLevel.color} tracking-wide`} style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>{aqiLevel.label}</div>
          <div className="text-sm text-muted-foreground leading-relaxed">{aqiLevel.description}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/30 rounded-xl p-3.5 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02] border border-white/5">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">PM2.5</div>
          <div className="text-base font-semibold text-foreground tabular-nums">{airQuality.pm2_5.toFixed(1)} <span className="text-xs text-muted-foreground">µg/m³</span></div>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3.5 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02] border border-white/5">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">PM10</div>
          <div className="text-base font-semibold text-foreground tabular-nums">{airQuality.pm10.toFixed(1)} <span className="text-xs text-muted-foreground">µg/m³</span></div>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3.5 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02] border border-white/5">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">O₃ Ozone</div>
          <div className="text-base font-semibold text-foreground tabular-nums">{airQuality.o3.toFixed(1)} <span className="text-xs text-muted-foreground">µg/m³</span></div>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3.5 transition-all duration-300 hover:bg-secondary/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.02] border border-white/5">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">NO₂</div>
          <div className="text-base font-semibold text-foreground tabular-nums">{airQuality.no2.toFixed(1)} <span className="text-xs text-muted-foreground">µg/m³</span></div>
        </div>
      </div>
    </WeatherCard>
  );
};