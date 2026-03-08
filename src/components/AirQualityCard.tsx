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
  if (aqi <= 50) return { label: "Good", color: "text-green-400", dotColor: "bg-green-400", image: aqiBoyGood, bgFrom: "#071f13", bgTo: "#1a4a30" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-400", dotColor: "bg-yellow-400", image: aqiBoyModerate, bgFrom: "#1f1507", bgTo: "#4a3a1a" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "text-orange-400", dotColor: "bg-orange-400", image: aqiBoyUnhealthy, bgFrom: "#1f0e07", bgTo: "#4a2a1a" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-400", dotColor: "bg-red-400", image: aqiBoyUnhealthy, bgFrom: "#2a0712", bgTo: "#6b1a3a" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-400", dotColor: "bg-purple-400", image: aqiBoyHazardous, bgFrom: "#15071f", bgTo: "#3d1a55" };
  return { label: "Hazardous", color: "text-rose-500", dotColor: "bg-rose-500", image: aqiBoyHazardous, bgFrom: "#2a0707", bgTo: "#5c1a1a" };
};

const scaleSegments = [
  { label: "Good", max: 50, color: "bg-green-500" },
  { label: "Moder...", max: 100, color: "bg-yellow-500" },
  { label: "Poor", max: 150, color: "bg-orange-500" },
  { label: "Unhea...", max: 200, color: "bg-red-500" },
  { label: "Severe", max: 300, color: "bg-purple-500" },
  { label: "Hazar...", max: 500, color: "bg-rose-700" },
];

const MonumentsSilhouette = () => (
  <svg
    className="absolute bottom-0 left-0 right-0 w-full h-[60%] opacity-[0.08]"
    viewBox="0 0 800 180"
    fill="currentColor"
    preserveAspectRatio="xMidYMax slice"
    style={{ color: "white" }}
  >
    <path d="M360,180 L360,90 Q365,60 380,45 Q390,30 400,20 Q410,30 420,45 Q435,60 440,90 L440,180 Z" />
    <ellipse cx="400" cy="42" rx="12" ry="18" />
    <rect x="396" y="20" width="8" height="8" />
    <line x1="400" y1="12" x2="400" y2="22" stroke="currentColor" strokeWidth="2" />
    <rect x="340" y="70" width="10" height="110" />
    <ellipse cx="345" cy="70" rx="7" ry="10" />
    <rect x="450" y="70" width="10" height="110" />
    <ellipse cx="455" cy="70" rx="7" ry="10" />
    <rect x="120" y="100" width="12" height="80" />
    <rect x="168" y="100" width="12" height="80" />
    <rect x="118" y="95" width="64" height="12" rx="3" />
    <path d="M130,95 Q150,70 170,95" />
    <path d="M680,180 L688,50 Q692,40 696,35 Q700,40 704,50 L712,180 Z" />
    <rect x="686" y="70" width="20" height="3" rx="1" />
    <rect x="684" y="100" width="24" height="3" rx="1" />
    <rect x="682" y="130" width="28" height="3" rx="1" />
    <rect x="550" y="90" width="50" height="90" rx="2" />
    <path d="M550,90 Q555,80 560,85 Q565,75 570,80 Q575,70 580,80 Q585,75 590,85 Q595,80 600,90" />
    <rect x="558" y="100" width="8" height="10" rx="3" />
    <rect x="574" y="100" width="8" height="10" rx="3" />
    <rect x="558" y="118" width="8" height="10" rx="3" />
    <rect x="574" y="118" width="8" height="10" rx="3" />
    <rect x="30" y="120" width="40" height="60" />
    <path d="M25,120 Q50,75 75,120" />
    <path d="M35,120 Q50,90 65,120" />
    <rect x="230" y="150" width="30" height="30" />
    <ellipse cx="245" cy="150" rx="18" ry="12" />
    <rect x="270" y="140" width="20" height="40" />
    <ellipse cx="280" cy="140" rx="12" ry="8" />
    <rect x="0" y="175" width="800" height="5" />
  </svg>
);

export const AirQualityCard = ({ weather }: AirQualityCardProps) => {
  const airQuality = weather.current.air_quality;
  if (!airQuality) return null;

  const actualAQI = calculateAQI(airQuality.pm2_5, airQuality.pm10, airQuality.o3, airQuality.no2);
  const aqiLevel = getAQILevel(actualAQI);
  const markerPercent = Math.min((actualAQI / 500) * 100, 100);

  return (
    <div
      className="rounded-3xl overflow-visible animate-fade-in shadow-xl border border-white/10 relative"
      style={{ background: `linear-gradient(to bottom, ${aqiLevel.bgFrom} 0%, ${aqiLevel.bgTo} 100%)` }}
    >
      {/* Monument silhouette background */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <MonumentsSilhouette />
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.04] via-transparent to-black/20" />
      </div>

      {/* Main content */}
      <div className="relative z-10 p-5 sm:p-6">
        {/* Top row: Live AQI badge + Air Quality status + Boy */}
        <div className="flex items-start gap-3">
          {/* Left column: AQI data */}
          <div className="flex-1 min-w-0">
            {/* Live badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${aqiLevel.dotColor} animate-pulse shadow-lg`} />
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Live AQI</span>
            </div>

            {/* AQI number row with status to the right */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="flex-shrink-0">
                <span
                  className={`text-6xl sm:text-7xl md:text-8xl font-bold ${aqiLevel.color} leading-none drop-shadow-lg`}
                  style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
                >
                  {actualAQI}
                </span>
                <div className="text-[10px] text-white/40 mt-0.5">AQI (US)</div>
              </div>

              <div className="flex-shrink-0">
                <div className="text-xs sm:text-sm text-white/60 mb-1">Air Quality is</div>
                <span
                  className={`text-sm sm:text-base font-extrabold ${aqiLevel.color} px-3 py-1 rounded-full border-2 border-current/30 backdrop-blur-sm inline-block`}
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                  {aqiLevel.label}
                </span>
              </div>
            </div>

            {/* PM values */}
            <div className="flex gap-4 sm:gap-6 mt-4">
              <div className="text-xs sm:text-sm text-white/70">
                <span className="font-bold text-white">PM2.5 : </span>{airQuality.pm2_5.toFixed(0)} µg/m³
              </div>
              <div className="text-xs sm:text-sm text-white/70">
                <span className="font-bold text-white">PM10 : </span>{airQuality.pm10.toFixed(0)} µg/m³
              </div>
            </div>
          </div>

          {/* Boy character - positioned to never clip */}
          <div className="flex-shrink-0 relative -mt-2 -mr-1 sm:-mt-3 sm:-mr-2">
            <img
              src={aqiLevel.image}
              alt="AQI character"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Scale bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex text-[9px] sm:text-[10px] text-white/50 font-medium">
            {scaleSegments.map((seg) => (
              <span key={seg.label} className="flex-1 truncate pr-1">{seg.label}</span>
            ))}
          </div>
          <div className="relative h-3 rounded-full overflow-hidden flex shadow-inner">
            {scaleSegments.map((seg) => (
              <div key={seg.label} className={`flex-1 ${seg.color}`} />
            ))}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-black/60 shadow-lg transition-all duration-500"
              style={{ left: `${markerPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-white/30 font-medium">
            <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300</span><span>301+</span>
          </div>
        </div>
      </div>

      {/* Bottom pollutant banner */}
      <div className="relative z-10 bg-black/30 backdrop-blur-md px-5 sm:px-6 py-3 flex items-center justify-between gap-3 border-t border-white/10 rounded-b-3xl">
        <div className="flex items-center gap-3 sm:gap-5">
          <Wind className="w-4 h-4 text-white/50 flex-shrink-0" />
          <div className="text-[11px] sm:text-xs text-white/70">
            <span className="font-bold text-white">O₃:</span> {airQuality.o3.toFixed(1)} µg/m³
          </div>
          <div className="text-[11px] sm:text-xs text-white/70">
            <span className="font-bold text-white">NO₂:</span> {airQuality.no2.toFixed(1)} µg/m³
          </div>
        </div>
        <div className="text-[11px] sm:text-xs text-white/70">
          <span className="font-bold text-white">SO₂:</span> {airQuality.so2?.toFixed(1) ?? '—'} µg/m³
        </div>
      </div>
    </div>
  );
};
