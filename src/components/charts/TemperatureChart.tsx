import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TemperatureChartProps {
  weather: WeatherData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const temp = payload.find((p: any) => p.dataKey === 'temp');
  const feels = payload.find((p: any) => p.dataKey === 'feelsLike');

  return (
    <div
      className="rounded-xl border border-white/15 px-4 py-3 shadow-2xl backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, hsl(220 25% 10% / 0.95), hsl(220 30% 15% / 0.9))',
        fontFamily: "'Quicksand', sans-serif",
      }}
    >
      <div className="text-xs font-bold text-white/80 mb-1.5">{label}</div>
      {temp && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-xs text-white/60">Temperature :</span>
          <span className="text-sm font-bold text-orange-400" style={{ fontFamily: "'Bodoni Moda', serif" }}>
            {temp.value}°
          </span>
        </div>
      )}
      {feels && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-blue-300/60" />
          <span className="text-xs text-white/60">Feels Like :</span>
          <span className="text-sm font-bold text-blue-300" style={{ fontFamily: "'Bodoni Moda', serif" }}>
            {feels.value}°
          </span>
        </div>
      )}
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, index, payload } = props;
  // Show dot at every 6th point for cleanliness
  if (index % 6 !== 0) return null;
  return (
    <circle cx={cx} cy={cy} r={3.5} fill="hsl(28 100% 60%)" stroke="hsl(220 20% 10%)" strokeWidth={2} />
  );
};

export const TemperatureChart = ({ weather }: TemperatureChartProps) => {
  if (!weather.forecast?.forecastday[0]?.hour) return null;

  const hourlyData = weather.forecast.forecastday[0].hour.map((hour) => ({
    time: new Date(hour.time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    }),
    temp: Math.round(hour.temp_c),
    feelsLike: Math.round(hour.feelslike_c),
  }));

  const temps = hourlyData.map(d => d.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-full lg:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Temperature Trend
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-[2px] rounded-full bg-orange-400" />
            <span className="text-[10px] text-muted-foreground">Temp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-[2px] rounded-full bg-blue-300/50 border-t border-dashed border-blue-300/50" />
            <span className="text-[10px] text-muted-foreground">Feels Like</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-4">
        {[
          { label: 'High', value: `${maxTemp}°`, color: 'text-orange-400' },
          { label: 'Low', value: `${minTemp}°`, color: 'text-blue-300' },
          { label: 'Avg', value: `${avgTemp}°`, color: 'text-white/70' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <span className={`text-sm font-bold ${stat.color}`} style={{ fontFamily: "'Bodoni Moda', serif" }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(28 100% 55%)" stopOpacity={0.4} />
                <stop offset="50%" stopColor="hsl(28 100% 50%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(28 100% 50%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="feelsLikeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(215 50% 70%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(215 50% 70%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }}
              interval="preserveStartEnd"
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }}
              domain={['dataMin - 3', 'dataMax + 3']}
              tickFormatter={(v) => `${v}°`}
            />

            {/* Average reference line */}
            <ReferenceLine
              y={avgTemp}
              stroke="hsl(215 15% 35%)"
              strokeDasharray="4 4"
              strokeWidth={0.5}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'hsl(28 100% 50% / 0.3)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            <Area
              type="monotone"
              dataKey="feelsLike"
              stroke="hsl(215 50% 70% / 0.4)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#feelsLikeGradient)"
              name="Feels Like"
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(215 50% 70%)', stroke: 'hsl(220 20% 10%)', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="hsl(28 100% 55%)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#tempGradient)"
              name="Temperature"
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: 'hsl(28 100% 60%)', stroke: 'hsl(220 20% 10%)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WeatherCard>
  );
};
