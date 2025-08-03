import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HumidityChartProps {
  weather: WeatherData;
}

export const HumidityChart = ({ weather }: HumidityChartProps) => {
  if (!weather.forecast?.forecastday[0]?.hour) return null;

  const currentHour = new Date().getHours();
  const humidityData = weather.forecast.forecastday[0].hour
    .slice(currentHour, currentHour + 12) // Show next 12 hours
    .filter((_, index) => index % 2 === 0) // Show every 2nd hour
    .map((hour) => ({
      time: new Date(hour.time).toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true 
      }),
      humidity: hour.humidity,
      precipitation: hour.chance_of_rain || hour.chance_of_snow || 0,
    }));

  return (
    <WeatherCard className="p-6 col-span-full lg:col-span-1">
      <h3 className="text-lg font-semibold text-foreground mb-4">Humidity & Rain Chance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={humidityData}>
            <defs>
              <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215 80% 50%)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(215 80% 50%)" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215 50% 70%)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(215 50% 70%)" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 30%)" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 65%)', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215 15% 65%)', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(220 25% 12%)',
                border: '1px solid hsl(220 20% 30%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)'
              }}
            />
            <Bar 
              dataKey="humidity" 
              fill="url(#humidityGradient)"
              radius={[4, 4, 0, 0]}
              name="Humidity %"
            />
            <Bar 
              dataKey="precipitation" 
              fill="url(#precipGradient)"
              radius={[4, 4, 0, 0]}
              name="Rain Chance %"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WeatherCard>
  );
};