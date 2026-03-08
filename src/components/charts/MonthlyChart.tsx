import { WeatherCard } from "../WeatherCard";
import { WeatherData } from "@/lib/weather";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Sun, CloudRain, Thermometer, Droplets } from "lucide-react";

interface MonthlyChartProps {
  weather: WeatherData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Day {label}</p>
      <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>
        {data?.condition}
      </p>
      <div className="flex gap-4 mt-1.5">
        <span className="text-xs font-semibold text-red-400">↑ {data?.high}°</span>
        <span className="text-xs font-semibold text-blue-400">↓ {data?.low}°</span>
      </div>
      {data?.rain > 0 && (
        <p className="text-[10px] text-cyan-400 mt-1">💧 {data.rain}% rain chance</p>
      )}
    </div>
  );
};

export const MonthlyChart = ({ weather }: MonthlyChartProps) => {
  if (!weather.forecast?.forecastday) return null;

  const monthlyData = weather.forecast.forecastday.map((day) => ({
    day: new Date(day.date).getDate(),
    high: Math.round(day.day.maxtemp_c),
    low: Math.round(day.day.mintemp_c),
    condition: day.day.condition.text,
    rain: day.day.daily_chance_of_rain,
    humidity: day.day.avghumidity,
  }));

  const sunnyDays = monthlyData.filter(day => day.rain < 30).length;
  const rainyDays = monthlyData.length - sunnyDays;
  
  const overviewData = [
    { name: 'Sunny/Cloudy', value: sunnyDays, color: '#fb923c' },
    { name: 'Rainy/Snow', value: rainyDays, color: '#60a5fa' },
  ];

  const avgHigh = Math.round(monthlyData.reduce((sum, day) => sum + day.high, 0) / monthlyData.length);
  const avgLow = Math.round(monthlyData.reduce((sum, day) => sum + day.low, 0) / monthlyData.length);
  const avgHumidity = Math.round(monthlyData.reduce((sum, day) => sum + day.humidity, 0) / monthlyData.length);
  const maxTemp = Math.max(...monthlyData.map(d => d.high));
  const minTemp = Math.min(...monthlyData.map(d => d.low));
  const tempRange = maxTemp - minTemp;

  return (
    <WeatherCard className="p-5 sm:p-6 col-span-full lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          7-Day Overview
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <Thermometer className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">{tempRange}° range</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Temperature Trend - takes 3 cols */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Temperature Trend</h4>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-[2px] bg-red-400 rounded-full" />
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-[2px] bg-blue-400 rounded-full" />
                <span className="text-[10px] text-muted-foreground">Low</span>
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="monthHighGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="monthLowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 20%)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#monthHighGrad)"
                  dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#monthLowGrad)"
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Overview - takes 2 cols */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Weather Overview</h4>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={48}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {overviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs text-muted-foreground">Clear days</div>
                  <div className="text-lg font-bold text-orange-400" style={{ fontFamily: "'Bodoni Moda', serif" }}>{sunnyDays}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                <CloudRain className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs text-muted-foreground">Rainy days</div>
                  <div className="text-lg font-bold text-blue-400" style={{ fontFamily: "'Bodoni Moda', serif" }}>{rainyDays}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground">Avg High</div>
              <div className="text-base font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>{avgHigh}°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <TrendingDown className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground">Avg Low</div>
              <div className="text-base font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>{avgLow}°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <Droplets className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground">Humidity</div>
              <div className="text-base font-bold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>{avgHumidity}%</div>
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};
