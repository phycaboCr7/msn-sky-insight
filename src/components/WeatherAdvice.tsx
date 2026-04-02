import { WeatherData } from "@/lib/weather";
import { WeatherCard } from "./WeatherCard";
import { 
  Umbrella, Shirt, UtensilsCrossed, Moon, Dumbbell, Droplets,
} from "lucide-react";

interface WeatherAdviceProps {
  weather: WeatherData;
}

export const WeatherAdvice = ({ weather }: WeatherAdviceProps) => {
  const temp = weather.current.temp_c;
  const condition = weather.current.condition.text.toLowerCase();
  const humidity = weather.current.humidity;
  const rainChance = weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0;
  const uvIndex = weather.current.uv;
  const windKph = weather.current.wind_kph;

  const getClothingAdvice = () => {
    if (temp < 0) return "Heavy winter gear, insulated layers, gloves & hat essential";
    if (temp < 10) return "Wear warm clothes, jacket, and layers for comfort";
    if (temp < 18) return "Light jacket or sweater recommended";
    if (temp < 25) return "Comfortable clothing, t-shirt or light shirt";
    if (temp < 35) return "Light, breathable clothing recommended";
    return "Minimal, ultra-light clothing — stay cool & hydrated";
  };

  const getFoodAdvice = () => {
    if (temp < 0) return "High-calorie warm meals, hot chocolate, hearty stews";
    if (temp < 10) return "Hot drinks, warm soup, and comfort food";
    if (temp < 25) return "Balanced meals and stay well hydrated";
    return "Light meals, cold drinks, and fresh fruits";
  };

  const getSleepAdvice = () => {
    if (temp < 5) return "8+ hours with heavy blankets, keep room warm";
    if (temp < 15) return "7-8 hours with warm blankets recommended";
    if (temp < 25) return "7-8 hours with comfortable bedding";
    return "7-8 hours with light bedding, keep room cool";
  };

  const getUmbrellaAdvice = () => {
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return "Take umbrella — rain expected today";
    }
    if (rainChance > 60) return "Take umbrella — high rain chance";
    if (rainChance > 30) return "Consider umbrella — possible rain";
    return "No umbrella needed today";
  };

  const getActivityAdvice = () => {
    if (condition.includes('rain') || condition.includes('storm') || condition.includes('thunder')) {
      return "Indoor activities recommended today";
    }
    if (temp > 38 || uvIndex > 8) return "Avoid outdoors during peak sun hours";
    if (windKph > 40) return "Avoid cycling/outdoor sports — strong winds";
    if (temp >= 18 && temp <= 28 && uvIndex < 6) return "Perfect weather for outdoor activities!";
    return "Moderate outdoor activity is fine";
  };

  const getHydrationAdvice = () => {
    if (temp > 35) return "Drink 3+ liters of water, avoid dehydration";
    if (temp > 28 || humidity < 30) return "Stay hydrated — drink water frequently";
    if (humidity > 80) return "Moderate intake — high humidity today";
    return "Regular water intake, 2 liters recommended";
  };

  const adviceItems = [
    {
      icon: <Shirt className="w-5 h-5" />,
      gradient: "from-sky-500 to-blue-600",
      glowColor: "hsl(200 80% 55% / 0.25)",
      title: "What to Wear",
      advice: getClothingAdvice(),
    },
    {
      icon: <UtensilsCrossed className="w-5 h-5" />,
      gradient: "from-orange-500 to-amber-600",
      glowColor: "hsl(28 100% 55% / 0.25)",
      title: "What to Eat",
      advice: getFoodAdvice(),
    },
    {
      icon: <Moon className="w-5 h-5" />,
      gradient: "from-violet-500 to-purple-600",
      glowColor: "hsl(270 70% 55% / 0.25)",
      title: "Sleep Advice",
      advice: getSleepAdvice(),
    },
    {
      icon: <Umbrella className="w-5 h-5" />,
      gradient: rainChance > 30 ? "from-blue-500 to-indigo-600" : "from-emerald-500 to-green-600",
      glowColor: rainChance > 30 ? "hsl(220 80% 55% / 0.25)" : "hsl(150 70% 45% / 0.25)",
      title: "Umbrella",
      advice: getUmbrellaAdvice(),
    },
    {
      icon: <Dumbbell className="w-5 h-5" />,
      gradient: "from-yellow-500 to-orange-500",
      glowColor: "hsl(40 95% 55% / 0.25)",
      title: "Activity",
      advice: getActivityAdvice(),
    },
    {
      icon: <Droplets className="w-5 h-5" />,
      gradient: "from-cyan-400 to-teal-500",
      glowColor: "hsl(185 70% 50% / 0.25)",
      title: "Hydration",
      advice: getHydrationAdvice(),
    },
  ];

  return (
    <>
      {adviceItems.map((item, index) => (
        <WeatherCard 
          key={index} 
          className="animate-fade-in group hover:scale-[1.03] transition-all duration-300"
        >
          <div className="p-4 sm:p-5 relative overflow-hidden">
            {/* Subtle glow behind icon */}
            <div 
              className="absolute -top-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
              style={{ background: item.glowColor }}
            />
            
            <div className="flex items-center gap-3.5 relative z-10">
              {/* Icon with vibrant gradient background */}
              <div 
                className={`flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg shadow-black/20 ring-1 ring-white/10`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-sm font-bold text-foreground tracking-wide"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                  {item.advice}
                </p>
              </div>
            </div>
          </div>
        </WeatherCard>
      ))}
    </>
  );
};
