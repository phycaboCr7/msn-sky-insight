import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TemperatureChartProps {
  weather: WeatherData;
}

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

  return (
    <WeatherCard className="p-6 col-span-full lg:col-span-2">
      <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: '1.25rem' }}>Temperature Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(28 100% 60%)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(28 100% 60%)" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="feelsLikeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215 50% 70%)" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="hsl(215 50% 70%)" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 30%)" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 65%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 65%)', fontSize: 12 }}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(220 25% 12%)',
                border: '1px solid hsl(220 20% 30%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)'
              }}
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="hsl(28 100% 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#tempGradient)"
              name="Temperature"
            />
            <Area
              type="monotone"
              dataKey="feelsLike"
              stroke="hsl(215 50% 70%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#feelsLikeGradient)"
              name="Feels Like"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WeatherCard>
  );
};