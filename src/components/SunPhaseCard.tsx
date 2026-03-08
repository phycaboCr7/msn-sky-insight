import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Sun } from "lucide-react";

interface SunPhaseCardProps {
  weather: WeatherData;
}

const parseTimeToMinutes = (timeStr: string) => {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && hours !== 12) h += 12;
  if (period === 'AM' && hours === 12) h = 0;
  return h * 60 + minutes;
};

const getSunInfo = (sunrise: string, sunset: string, localtime: string) => {
  const now = new Date(localtime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sunriseMin = parseTimeToMinutes(sunrise);
  const sunsetMin = parseTimeToMinutes(sunset);
  const dayLength = sunsetMin - sunriseMin;

  if (nowMinutes < sunriseMin || nowMinutes > sunsetMin) {
    return { icon: "🌙", phase: "Night", position: "Below Horizon", progress: nowMinutes < sunriseMin ? 0 : 100, dayLength };
  }

  const elapsed = nowMinutes - sunriseMin;
  const pct = (elapsed / dayLength) * 100;

  if (pct < 15) return { icon: "🌅", phase: "Dawn", position: "Rising", progress: pct, dayLength };
  if (pct < 40) return { icon: "☀️", phase: "Morning", position: "Ascending", progress: pct, dayLength };
  if (pct < 60) return { icon: "🌞", phase: "Noon", position: "Peak", progress: pct, dayLength };
  if (pct < 85) return { icon: "☀️", phase: "Afternoon", position: "Descending", progress: pct, dayLength };
  return { icon: "🌇", phase: "Dusk", position: "Setting", progress: pct, dayLength };
};

const formatDayLength = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export const SunPhaseCard = ({ weather }: SunPhaseCardProps) => {
  const todayForecast = weather.forecast?.forecastday?.[0];
  const astro = todayForecast?.astro;
  if (!astro) return null;

  const { sunrise, sunset } = astro;
  const localtime = weather.location?.localtime || new Date().toISOString();
  const sunInfo = getSunInfo(sunrise, sunset, localtime);

  // Arc path for sun trajectory
  const arcProgress = Math.max(0, Math.min(100, sunInfo.progress));
  const angle = (arcProgress / 100) * Math.PI; // 0 to PI
  const cx = 50 + 40 * Math.cos(Math.PI - angle);
  const cy = 50 - 35 * Math.sin(angle);

  return (
    <WeatherCard className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-5 h-5 text-orange-400" />
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Sun Position
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">{formatDayLength(sunInfo.dayLength)} daylight</span>
      </div>

      {/* Sun Arc */}
      <div className="relative w-full aspect-[2/1] mb-2">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Horizon line */}
          <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" className="text-white/10" strokeWidth="0.5" />
          {/* Arc path */}
          <path
            d="M 10 50 Q 50 -15 90 50"
            fill="none"
            stroke="currentColor"
            className="text-orange-400/30"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          {/* Traveled arc */}
          {arcProgress > 0 && arcProgress < 100 && (
            <path
              d="M 10 50 Q 50 -15 90 50"
              fill="none"
              stroke="currentColor"
              className="text-orange-400"
              strokeWidth="1"
              strokeDasharray={`${arcProgress * 1.2} 200`}
            />
          )}
          {/* Sun dot */}
          {arcProgress > 0 && arcProgress < 100 && (
            <>
              <circle cx={cx} cy={cy} r="3" fill="#ff9500" opacity="0.3" />
              <circle cx={cx} cy={cy} r="4.5" fill="url(#sunGrad)" />
              <defs>
                <radialGradient id="sunGrad">
                  <stop offset="0%" stopColor="#ffdd57" />
                  <stop offset="100%" stopColor="#ff9500" />
                </radialGradient>
              </defs>
            </>
          )}
          {/* Labels */}
          <text x="10" y="54" className="text-white/40 fill-current" fontSize="3" textAnchor="middle">↑</text>
          <text x="90" y="54" className="text-white/40 fill-current" fontSize="3" textAnchor="middle">↓</text>
        </svg>
      </div>

      {/* Phase info */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-4xl">{sunInfo.icon}</span>
        <div>
          <div
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {sunInfo.phase}
          </div>
          <div className="text-xs text-orange-400 font-medium">{sunInfo.position}</div>
        </div>
      </div>

      {/* Sunrise & Sunset */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 rounded-xl p-3 text-center border border-orange-400/15">
          <div className="text-[10px] text-muted-foreground mb-0.5">🌅 Sunrise</div>
          <div
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {sunrise}
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/5 rounded-xl p-3 text-center border border-rose-400/15">
          <div className="text-[10px] text-muted-foreground mb-0.5">🌇 Sunset</div>
          <div
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {sunset}
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};
