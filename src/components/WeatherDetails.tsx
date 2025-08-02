import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Gauge, 
  Sun,
  CloudRain,
  Navigation
} from "lucide-react";

interface WeatherDetailsProps {
  weather: WeatherData;
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string | React.ReactNode;
}

const DetailItem = ({ icon, label, value, subtitle }: DetailItemProps) => (
  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
    <div className="text-primary">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  </div>
);

export const WeatherDetails = ({ weather }: WeatherDetailsProps) => {
  const { current } = weather;

  const getUVLevel = (uv: number) => {
    if (uv <= 2) return { level: "Low", color: "text-green-400" };
    if (uv <= 5) return { level: "Moderate", color: "text-yellow-400" };
    if (uv <= 7) return { level: "High", color: "text-orange-400" };
    if (uv <= 10) return { level: "Very High", color: "text-red-400" };
    return { level: "Extreme", color: "text-purple-400" };
  };

  const uvInfo = getUVLevel(current.uv);

  return (
    <WeatherCard className="p-6 col-span-full lg:col-span-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">Weather Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailItem
          icon={<Thermometer size={20} />}
          label="Feels like"
          value={`${Math.round(current.feelslike_c)}°C`}
          subtitle={`Actual: ${Math.round(current.temp_c)}°C`}
        />
        
        <DetailItem
          icon={<Droplets size={20} />}
          label="Humidity"
          value={`${current.humidity}%`}
          subtitle="Relative humidity"
        />
        
        <DetailItem
          icon={<Wind size={20} />}
          label="Wind"
          value={`${Math.round(current.wind_kph)} km/h`}
          subtitle={`${current.wind_dir} • Gusts ${Math.round(current.gust_kph)} km/h`}
        />
        
        <DetailItem
          icon={<Eye size={20} />}
          label="Visibility"
          value={`${current.vis_km} km`}
          subtitle="Clear view distance"
        />
        
        <DetailItem
          icon={<Gauge size={20} />}
          label="Pressure"
          value={`${current.pressure_mb} mb`}
          subtitle="Atmospheric pressure"
        />
        
        <DetailItem
          icon={<Sun size={20} />}
          label="UV Index"
          value={current.uv.toString()}
          subtitle={
            <span className={uvInfo.color}>
              {uvInfo.level}
            </span>
          }
        />
        
        <DetailItem
          icon={<CloudRain size={20} />}
          label="Precipitation"
          value={`${current.precip_mm} mm`}
          subtitle="Last hour"
        />
        
        <DetailItem
          icon={<Navigation size={20} />}
          label="Dew Point"
          value={`${Math.round(current.dewpoint_c)}°C`}
          subtitle="Condensation point"
        />
      </div>
    </WeatherCard>
  );
};