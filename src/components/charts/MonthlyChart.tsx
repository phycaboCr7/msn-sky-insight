import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MonthlyChartProps {
  weather: WeatherData;
}

export const MonthlyChart = ({ weather }: MonthlyChartProps) => {
  if (!weather.forecast?.forecastday) return null;

  // Create monthly overview data from available forecast days
  const monthlyData = weather.forecast.forecastday.map((day, index) => ({
    day: new Date(day.date).getDate(),
    high: Math.round(day.day.maxtemp_c),
    low: Math.round(day.day.mintemp_c),
    condition: day.day.condition.text,
    rain: day.day.daily_chance_of_rain
  }));

  // Calculate sunny vs rainy days
  const sunnyDays = monthlyData.filter(day => day.rain < 30).length;
  const rainyDays = monthlyData.length - sunnyDays;
  
  const overviewData = [
    { name: 'Sunny/Cloudy days', value: sunnyDays, color: '#fb923c' },
    { name: 'Rainy/Snow days', value: rainyDays, color: '#60a5fa' }
  ];

  const avgHigh = Math.round(monthlyData.reduce((sum, day) => sum + day.high, 0) / monthlyData.length);
  const avgLow = Math.round(monthlyData.reduce((sum, day) => sum + day.low, 0) / monthlyData.length);

  return (
    <WeatherCard className="p-6 col-span-full lg:col-span-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">7-Day Overview</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Trend */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Temperature Trend</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <defs>
                  <linearGradient id="highTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="lowTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 30%)" />
                <XAxis 
                  dataKey="day" 
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
                <Line
                  type="monotone"
                  dataKey="high"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  name="Daily High"
                />
                <Line
                  type="monotone"
                  dataKey="low"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="Daily Low"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Overview */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Weather Overview</h4>
          <div className="flex items-center justify-between">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    dataKey="value"
                  >
                    {overviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 ml-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <div>
                  <div className="text-sm font-medium text-foreground">Sunny/Cloudy days</div>
                  <div className="text-lg font-bold text-orange-400">{sunnyDays}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <div>
                  <div className="text-sm font-medium text-foreground">Rainy/Snow days</div>
                  <div className="text-lg font-bold text-blue-400">{rainyDays}</div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Average high</div>
                    <div className="text-lg font-bold text-foreground">{avgHigh}°</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Average low</div>
                    <div className="text-lg font-bold text-foreground">{avgLow}°</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};