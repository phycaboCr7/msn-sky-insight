import { WeatherCard } from "./WeatherCard";
import { LocationBackground } from "./LocationBackground";
import { AnimatedWeatherIcon } from "./AnimatedWeatherIcon";
import { WeatherData, AirQuality } from "@/lib/weather";
import { getFlagUrl } from "@/lib/utils";
import { Wind } from "lucide-react";
import { useMemo } from "react";

// Animated weather particles overlay
const WeatherParticles = ({ condition, isDay }: { condition: string; isDay: boolean }) => {
  const lc = condition.toLowerCase();
  const isRain = lc.includes('rain') || lc.includes('drizzle') || lc.includes('shower');
  const isSnow = lc.includes('snow') || lc.includes('blizzard') || lc.includes('sleet') || lc.includes('ice');
  const isThunder = lc.includes('thunder');
  const isCloudy = lc.includes('cloud') || lc.includes('overcast');
  const isFog = lc.includes('fog') || lc.includes('mist') || lc.includes('haze');
  const isSunny = lc.includes('sunny') || lc.includes('clear');

  const particles = useMemo(() => {
    if (isRain || isThunder) {
      return Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${0.6 + Math.random() * 0.4}s`,
        height: `${12 + Math.random() * 10}px`,
      }));
    }
    if (isSnow) {
      return Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 2}s`,
        size: `${3 + Math.random() * 5}px`,
      }));
    }
    return [];
  }, [isRain, isThunder, isSnow]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[6]">
      {(isRain || isThunder) && particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-[2px] rounded-full opacity-40"
          style={{
            left: p.left,
            top: '-10px',
            height: p.height,
            background: 'linear-gradient(180deg, transparent, hsl(210 80% 70%))',
            animation: `cwRainFall ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
      {isThunder && (
        <div className="absolute inset-0 opacity-0"
          style={{ background: 'hsl(45 100% 90% / 0.15)', animation: 'cwThunderFlash 4s ease-in-out infinite' }}
        />
      )}
      {isSnow && particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-60"
          style={{
            left: p.left, top: '-10px', width: p.size, height: p.size,
            background: 'white', boxShadow: '0 0 6px hsl(0 0% 100% / 0.6)',
            animation: `cwSnowFall ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
      {isSunny && isDay && (
        <div className="absolute -top-20 -right-20 w-64 h-64 opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(45 100% 60% / 0.6) 0%, transparent 70%)',
            animation: 'cwSunPulse 4s ease-in-out infinite',
          }}
        />
      )}
      {isFog && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20"
            style={{ background: 'linear-gradient(0deg, hsl(0 0% 80% / 0.4), transparent)', animation: 'cwFogDrift 6s ease-in-out infinite' }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-15"
            style={{ background: 'linear-gradient(0deg, hsl(0 0% 90% / 0.3), transparent)', animation: 'cwFogDrift 8s ease-in-out infinite reverse' }}
          />
        </>
      )}
      {isCloudy && !isRain && !isSnow && (
        <>
          <div className="absolute top-2 opacity-10 rounded-full"
            style={{ width: '120px', height: '40px', background: 'hsl(0 0% 80% / 0.5)', filter: 'blur(15px)', animation: 'cwCloudDrift 8s ease-in-out infinite' }}
          />
          <div className="absolute top-8 opacity-[0.07] rounded-full"
            style={{ width: '90px', height: '30px', background: 'hsl(0 0% 80% / 0.5)', filter: 'blur(12px)', animation: 'cwCloudDrift 10s ease-in-out infinite reverse', animationDelay: '2s' }}
          />
        </>
      )}
      {!isDay && isSunny && [15, 35, 55, 75, 90].map((left, i) => (
        <div key={i} className="absolute rounded-full bg-white"
          style={{ width: `${2 + (i % 2)}px`, height: `${2 + (i % 2)}px`, left: `${left}%`, top: `${10 + i * 12}%`, opacity: 0.4, animation: `cwStarTwinkle ${1.5 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </div>
  );
};

interface CurrentWeatherProps {
  weather: WeatherData;
}

// Calculate actual AQI from PM2.5
const calculateAQI = (pm25: number): number => {
  const breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return { color: "text-green-400", bg: "bg-green-500/20" };
  if (aqi <= 100) return { color: "text-yellow-400", bg: "bg-yellow-500/20" };
  if (aqi <= 150) return { color: "text-orange-400", bg: "bg-orange-500/20" };
  if (aqi <= 200) return { color: "text-red-400", bg: "bg-red-500/20" };
  if (aqi <= 300) return { color: "text-purple-400", bg: "bg-purple-500/20" };
  return { color: "text-rose-600", bg: "bg-rose-500/20" };
};

const MiniAQIBox = ({ airQuality }: { airQuality: AirQuality }) => {
  const aqi = calculateAQI(airQuality.pm2_5);
  const { color } = getAQIColor(aqi);
  
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Wind className="w-3 h-3" />
        <span>AQI</span>
      </div>
      <div className={`text-lg sm:text-xl font-semibold ${color}`} style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
        {aqi}
      </div>
    </div>
  );
};

// Format temperature to always show minus sign properly
const formatTemp = (temp: number): string => {
  const rounded = Math.round(temp);
  if (rounded < 0) {
    return `−${Math.abs(rounded)}`;  // Use proper minus sign (−) not hyphen (-)
  }
  return `${rounded}`;
};

export const CurrentWeather = ({ weather }: CurrentWeatherProps) => {
  const { current, location } = weather;
  const isDay = current.is_day === 1;
  
  return (
    <WeatherCard className="p-4 sm:p-6 lg:p-8 col-span-full lg:col-span-2 relative overflow-hidden animate-slide-up">
      {/* Location background image */}
      <LocationBackground weather={weather} />
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none z-5" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none z-5" />
      
      {/* Blur separator for location image */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-5" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div className="flex-shrink-0">
            <AnimatedWeatherIcon 
              condition={current.condition.text} 
              isDay={isDay} 
              temp={current.temp_c}
              size="lg"
            />
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div className="text-5xl sm:text-7xl lg:text-9xl text-foreground animate-scale-in whitespace-nowrap" style={{ fontFamily: "'Bodoni Moda', 'Playfair Display', Georgia, serif", fontWeight: 600, letterSpacing: '-0.02em' }}>
              {formatTemp(current.temp_c)}°
            </div>
            <div className="text-base sm:text-xl text-muted-foreground animate-slide-up">
              {current.condition.text}
            </div>
          </div>
        </div>
        
        <div className="text-left sm:text-right space-y-2 sm:space-y-3 animate-fade-in w-full sm:w-auto">
          <div 
            className="text-xl sm:text-2xl font-semibold text-foreground"
            style={{ fontFamily: "'Playfair Display', 'Bodoni Moda', Georgia, serif", letterSpacing: '0.02em' }}
          >
            {location.name}
          </div>
          <div 
            className="text-muted-foreground text-base sm:text-lg"
            style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
          >
            {location.region}, {location.country}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-start sm:justify-end flex-wrap">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
              <div className="text-xs sm:text-sm text-muted-foreground">Feels like</div>
              <div className="text-lg sm:text-xl font-semibold text-primary whitespace-nowrap" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                {formatTemp(current.feelslike_c)}°
              </div>
            </div>
            {current.air_quality && (
              <MiniAQIBox airQuality={current.air_quality} />
            )}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10 flex flex-col items-center justify-center min-w-[80px]">
              <img 
                src={getFlagUrl(location.country)} 
                alt={`${location.country} flag`}
                className="w-12 h-8 object-cover rounded shadow-md mb-1.5"
              />
              <div className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">
                {location.country}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WeatherCard>
  );
};