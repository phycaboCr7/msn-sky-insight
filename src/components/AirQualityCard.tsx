import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Wind } from "lucide-react";
import aqiBoyGood from "@/assets/aqi-boy-good.png";
import aqiBoyModerate from "@/assets/aqi-boy-moderate.png";
import aqiBoyUnhealthy from "@/assets/aqi-boy-unhealthy.png";
import aqiBoyHazardous from "@/assets/aqi-boy-hazardous.png";

interface AirQualityCardProps {
  weather: WeatherData;
}

const calculateAQI = (pm25: number, pm10: number, o3: number, no2: number): number => {
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
  if (aqi <= 50) return { label: "Good", color: "text-green-400", gradientFrom: "from-green-600/40", gradientTo: "to-green-900/60", dotColor: "bg-green-400", barColor: "bg-green-400", image: aqiBoyGood };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-400", gradientFrom: "from-yellow-600/40", gradientTo: "to-yellow-900/60", dotColor: "bg-yellow-400", barColor: "bg-yellow-400", image: aqiBoyModerate };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "text-orange-400", gradientFrom: "from-orange-600/40", gradientTo: "to-orange-900/60", dotColor: "bg-orange-400", barColor: "bg-orange-400", image: aqiBoyUnhealthy };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-400", gradientFrom: "from-red-600/40", gradientTo: "to-red-900/60", dotColor: "bg-red-400", barColor: "bg-red-400", image: aqiBoyUnhealthy };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-400", gradientFrom: "from-purple-600/40", gradientTo: "to-purple-900/60", dotColor: "bg-purple-400", barColor: "bg-purple-400", image: aqiBoyHazardous };
  return { label: "Hazardous", color: "text-rose-500", gradientFrom: "from-rose-700/40", gradientTo: "to-rose-950/60", dotColor: "bg-rose-500", barColor: "bg-rose-500", image: aqiBoyHazardous };
};

const scaleSegments = [
  { label: "Good", max: 50, color: "bg-green-500" },
  { label: "Moderate", max: 100, color: "bg-yellow-500" },
  { label: "Poor", max: 150, color: "bg-orange-500" },
  { label: "Unhealthy", max: 200, color: "bg-red-500" },
  { label: "Severe", max: 300, color: "bg-purple-500" },
  { label: "Hazardous", max: 500, color: "bg-rose-700" },
];

export const AirQualityCard = ({ weather }: AirQualityCardProps) => {
  const airQuality = weather.current.air_quality;
  if (!airQuality) return null;

  const actualAQI = calculateAQI(airQuality.pm2_5, airQuality.pm10, airQuality.o3, airQuality.no2);
  const aqiLevel = getAQILevel(actualAQI);

  // Calculate marker position (0-100%)
  const markerPercent = Math.min((actualAQI / 500) * 100, 100);

  return (
    <WeatherCard className="p-0 animate-fade-in overflow-hidden">
      {/* Top section - dark with AQI info */}
      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: AQI value & details */}
          <div className="flex-1 space-y-3">
            {/* Live AQI badge */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${aqiLevel.dotColor} animate-pulse`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Live AQI</span>
            </div>

            {/* Big AQI number */}
            <div className="flex items-end gap-3">
              <span className={`text-6xl sm:text-7xl font-bold ${aqiLevel.color} leading-none`} style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                {actualAQI}
              </span>
              <span className="text-xs text-muted-foreground mb-2">AQI (US)</span>
            </div>

            {/* Air Quality status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Air Quality is</span>
              <span className={`text-sm font-bold ${aqiLevel.color} px-2.5 py-0.5 rounded-full border border-current/20`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {aqiLevel.label}
              </span>
            </div>

            {/* PM values */}
            <div className="flex gap-4 mt-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">PM2.5 : </span>{airQuality.pm2_5.toFixed(0)} µg/m³
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">PM10 : </span>{airQuality.pm10.toFixed(0)} µg/m³
              </div>
            </div>

            {/* Scale bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex text-[9px] sm:text-[10px] text-muted-foreground">
                {scaleSegments.map((seg) => (
                  <span key={seg.label} className="flex-1 truncate pr-1">{seg.label}</span>
                ))}
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden flex">
                {scaleSegments.map((seg) => (
                  <div key={seg.label} className={`flex-1 ${seg.color}`} />
                ))}
                {/* Marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-black/50 shadow-lg transition-all duration-500"
                  style={{ left: `${markerPercent}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground/60">
                <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300</span><span>500</span>
              </div>
            </div>
          </div>

          {/* Right: Character image */}
          <div className="flex-shrink-0 w-24 h-28 sm:w-32 sm:h-36 relative">
            <img
              src={aqiLevel.image}
              alt="AQI character"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Bottom section - gradient banner */}
      <div className={`bg-gradient-to-r ${aqiLevel.gradientFrom} ${aqiLevel.gradientTo} px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-t border-white/10`}>
        <div className="flex items-center gap-3">
          <Wind className="w-4 h-4 text-white/70" />
          <div className="text-xs text-white/80">
            <span className="font-semibold text-white">O₃:</span> {airQuality.o3.toFixed(1)} µg/m³
          </div>
          <div className="text-xs text-white/80">
            <span className="font-semibold text-white">NO₂:</span> {airQuality.no2.toFixed(1)} µg/m³
          </div>
        </div>
        <div className="text-xs text-white/80">
          <span className="font-semibold text-white">SO₂:</span> {airQuality.so2?.toFixed(1) ?? '—'} µg/m³
        </div>
      </div>
    </WeatherCard>
  );
};
