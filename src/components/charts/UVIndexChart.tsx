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
    { name: 'Remaining', value: 100 - percentage, color: 'hsl(220 20% 30%)' }
  ];

  return (
    <WeatherCard className="p-6 col-span-1">
      <h3 className="text-lg font-semibold text-foreground mb-4">UV Index</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-foreground">{uvValue}</div>
            <div className="text-xs text-muted-foreground">{getUVLevel(uvValue)}</div>
          </div>
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