import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface UVIndexChartProps {
  weather: WeatherData;
}

const getUVColor = (uv: number) => {
  if (uv <= 2) return "#22c55e"; // Green
  if (uv <= 5) return "#eab308"; // Yellow
  if (uv <= 7) return "#f97316"; // Orange
  if (uv <= 10) return "#ef4444"; // Red
  return "#8b5cf6"; // Purple
};

const getUVLevel = (uv: number) => {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
};

export const UVIndexChart = ({ weather }: UVIndexChartProps) => {
  const uvValue = weather.current.uv;
  const maxUV = 11;
  const percentage = (uvValue / maxUV) * 100;
  
  const data = [
    { name: 'UV', value: percentage, color: getUVColor(uvValue) },
    { name: 'Remaining', value: 100 - percentage, color: 'hsl(var(--muted))' }
  ];

  return (
    <WeatherCard className="p-6 col-span-1">
      <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: '1.25rem' }}>UV Index</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40 group">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="uvGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={getUVColor(uvValue)} stopOpacity="1"/>
                  <stop offset="100%" stopColor={getUVColor(uvValue)} stopOpacity="0.6"/>
                </linearGradient>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={1500}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? "url(#uvGradient)" : entry.color}
                    style={{ filter: index === 0 ? "url(#glow)" : "none" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-foreground animate-pulse" style={{ color: getUVColor(uvValue), fontFamily: "'Bodoni Moda', Georgia, serif" }}>
              {uvValue}
            </div>
            <div className="text-sm text-muted-foreground font-medium">{getUVLevel(uvValue)}</div>
            <div className="text-xs text-muted-foreground/70 mt-1">UV Index</div>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-white/10 group-hover:border-white/20 transition-all duration-300" />
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm text-muted-foreground">
          Maximum UV exposure for today will be very high, expected at 2:00 pm.
        </div>
      </div>
    </WeatherCard>
  );
};