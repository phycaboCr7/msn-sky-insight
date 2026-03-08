import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";

interface WindChartProps {
  weather: WeatherData;
}

const getWindForce = (speed: number) => {
  if (speed < 12) return { level: "Light Breeze", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" };
  if (speed < 30) return { level: "Moderate Breeze", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" };
  if (speed < 50) return { level: "Fresh Breeze", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" };
  if (speed < 75) return { level: "Strong Breeze", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" };
  return { level: "Gale", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" };
};

export const WindChart = ({ weather }: WindChartProps) => {
  const { current } = weather;
  const windSpeed = Math.round(current.wind_kph);
  const windGust = Math.round(current.gust_kph);
  const windDirection = current.wind_dir;
  const windDegree = current.wind_degree;
  const windForce = getWindForce(windSpeed);

  // Compass tick marks
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-1">
      <h3
        className="text-lg font-bold text-foreground mb-5"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Wind
      </h3>

      {/* Compass */}
      <div className="flex items-center justify-center mb-5">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            {/* Outer ring */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(220 15% 20%)" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="42" fill="none" stroke="hsl(220 15% 18%)" strokeWidth="0.5" />

            {/* Tick marks */}
            {ticks.map((deg) => {
              const isMajor = deg % 90 === 0;
              const r1 = isMajor ? 48 : 51;
              const r2 = 54;
              const rad = (deg - 90) * (Math.PI / 180);
              return (
                <line
                  key={deg}
                  x1={60 + r1 * Math.cos(rad)}
                  y1={60 + r1 * Math.sin(rad)}
                  x2={60 + r2 * Math.cos(rad)}
                  y2={60 + r2 * Math.sin(rad)}
                  stroke={isMajor ? "hsl(220 15% 50%)" : "hsl(220 15% 25%)"}
                  strokeWidth={isMajor ? 1.5 : 0.5}
                />
              );
            })}

            {/* Cardinal labels */}
            <text x="60" y="16" textAnchor="middle" fill="hsl(220 15% 60%)" fontSize="8" fontWeight="600">N</text>
            <text x="60" y="110" textAnchor="middle" fill="hsl(220 15% 45%)" fontSize="8" fontWeight="500">S</text>
            <text x="108" y="63" textAnchor="middle" fill="hsl(220 15% 45%)" fontSize="8" fontWeight="500">E</text>
            <text x="12" y="63" textAnchor="middle" fill="hsl(220 15% 45%)" fontSize="8" fontWeight="500">W</text>

            {/* Direction arrow */}
            <g transform={`rotate(${windDegree}, 60, 60)`}>
              {/* Arrow body */}
              <line x1="60" y1="60" x2="60" y2="24" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
              {/* Arrow head */}
              <polygon points="60,20 55,30 65,30" fill="hsl(var(--primary))" />
              {/* Tail */}
              <line x1="60" y1="60" x2="60" y2="78" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Center dot */}
            <circle cx="60" cy="60" r="4" fill="hsl(220 15% 12%)" stroke="hsl(220 15% 30%)" strokeWidth="1" />
          </svg>

          {/* Speed overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: '12px' }}>
            <span
              className="text-xl font-bold text-foreground leading-none"
              style={{ fontFamily: "'Bodoni Moda', serif" }}
            >
              {windSpeed}
            </span>
            <span className="text-[9px] text-muted-foreground mt-0.5">km/h</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2.5 mb-4">
        {[
          { label: 'Direction', value: windDirection },
          { label: 'Wind Speed', value: `${windSpeed} km/h` },
          { label: 'Gusts', value: `${windGust} km/h` },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>{row.label}</span>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Force badge */}
      <div className={`rounded-xl p-3 border ${windForce.bg}`}>
        <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>Force</div>
        <div className={`text-sm font-bold ${windForce.color}`} style={{ fontFamily: "'Bodoni Moda', serif" }}>
          {windForce.level}
        </div>
      </div>
    </WeatherCard>
  );
};
