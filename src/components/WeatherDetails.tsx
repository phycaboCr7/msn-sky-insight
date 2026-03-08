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
  highlight?: boolean;
}

const DetailItem = ({ icon, label, value, subtitle, highlight }: DetailItemProps) => (
  <div className={`
    group relative flex flex-col gap-1.5 p-4 rounded-2xl transition-all duration-300
    hover:scale-[1.02] isolate
    ${highlight
      ? 'bg-primary/8 border border-primary/20 shadow-lg shadow-primary/5'
      : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
    }
  `}>
    {/* Label row */}
    <div className="flex items-center gap-2">
      <div className={`transition-all duration-300 ${highlight ? 'text-primary' : 'text-primary/70 group-hover:text-primary'}`}>
        {icon}
      </div>
      <span className="text-xs text-muted-foreground font-medium tracking-wide" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        {label}
      </span>
    </div>

    {/* Value */}
    <div
      className="text-2xl font-bold text-foreground leading-none"
      style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
    >
      {value}
    </div>

    {/* Subtitle */}
    {subtitle && (
      <div className="text-[11px] text-muted-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>
        {subtitle}
      </div>
    )}
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
    <WeatherCard className="p-5 sm:p-6 col-span-full lg:col-span-2">
      <h3
        className="text-lg font-bold text-foreground mb-5"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Weather Details
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <DetailItem
          icon={<Thermometer size={16} />}
          label="Feels like"
          value={`${Math.round(current.feelslike_c)}°C`}
          subtitle={`Actual: ${Math.round(current.temp_c)}°C`}
        />
        
        <DetailItem
          icon={<Droplets size={16} />}
          label="Humidity"
          value={`${current.humidity}%`}
          subtitle="Relative humidity"
        />
        
        <DetailItem
          icon={<Wind size={16} />}
          label="Wind"
          value={`${Math.round(current.wind_kph)} km/h`}
          subtitle={`${current.wind_dir} · Gusts ${Math.round(current.gust_kph)} km/h`}
          highlight={current.wind_kph > 20}
        />
        
        <DetailItem
          icon={<Eye size={16} />}
          label="Visibility"
          value={`${current.vis_km} km`}
          subtitle="Clear view distance"
        />
        
        <DetailItem
          icon={<Gauge size={16} />}
          label="Pressure"
          value={`${current.pressure_mb} mb`}
          subtitle="Atmospheric pressure"
        />
        
        <DetailItem
          icon={<Sun size={16} />}
          label="UV Index"
          value={current.uv.toString()}
          subtitle={<span className={uvInfo.color}>{uvInfo.level}</span>}
        />
        
        <DetailItem
          icon={<CloudRain size={16} />}
          label="Precipitation"
          value={`${current.precip_mm} mm`}
          subtitle="Last hour"
        />
        
        <DetailItem
          icon={<Navigation size={16} />}
          label="Dew Point"
          value={`${Math.round(current.dewpoint_c)}°C`}
          subtitle="Condensation point"
        />
      </div>
    </WeatherCard>
  );
};
