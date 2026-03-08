import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart } from 'recharts';
import { Droplets, CloudRain } from "lucide-react";

interface HumidityChartProps {
  weather: WeatherData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-xs text-foreground font-semibold">{item.name}: {item.value}%</span>
        </div>
      ))}
    </div>
  );
};

export const HumidityChart = ({ weather }: HumidityChartProps) => {
  if (!weather.forecast?.forecastday[0]?.hour) return null;

  const currentHour = new Date().getHours();
  const humidityData = weather.forecast.forecastday[0].hour
    .slice(currentHour, currentHour + 12)
    .filter((_, index) => index % 2 === 0)
    .map((hour) => ({
      time: new Date(hour.time).toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true 
      }),
      humidity: hour.humidity,
      rain: hour.chance_of_rain || 0,
    }));

  const avgHumidity = Math.round(humidityData.reduce((s, d) => s + d.humidity, 0) / humidityData.length);
  const maxRain = Math.max(...humidityData.map(d => d.rain));

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-full lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Humidity & Rain
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-400 font-semibold">{avgHumidity}%</span>
          </div>
          {maxRain > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <CloudRain className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-semibold">{maxRain}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/70" />
          <span className="text-[10px] text-muted-foreground">Humidity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400/70" />
          <span className="text-[10px] text-muted-foreground">Rain Chance</span>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={humidityData} barCategoryGap="20%">
            <defs>
              <linearGradient id="humGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(215 80% 55%)" stopOpacity={0.85}/>
                <stop offset="100%" stopColor="hsl(215 80% 55%)" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="rainAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(185 80% 55%)" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="hsl(185 80% 55%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="humidity" 
              fill="url(#humGrad2)"
              radius={[6, 6, 0, 0]}
              name="Humidity"
              maxBarSize={32}
            />
            <Area
              type="monotone"
              dataKey="rain"
              stroke="hsl(185 80% 55%)"
              strokeWidth={2}
              fill="url(#rainAreaGrad)"
              name="Rain Chance"
              dot={{ fill: 'hsl(185 80% 55%)', r: 3, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </WeatherCard>
  );
};
