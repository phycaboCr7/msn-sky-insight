import { WeatherData } from "@/lib/weather";
import { WeatherCard } from "./WeatherCard";
import { Umbrella, Shirt, Coffee, Moon, Sun, Droplets } from "lucide-react";

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
      iconColor: "from-blue-500/20 to-blue-600/5",
      iconText: "text-blue-400",
      title: "What to Wear",
      advice: getClothingAdvice(),
    },
    {
      icon: <Coffee className="w-5 h-5" />,
      iconColor: "from-orange-500/20 to-orange-600/5",
      iconText: "text-orange-400",
      title: "What to Eat",
      advice: getFoodAdvice(),
    },
    {
      icon: <Moon className="w-5 h-5" />,
      iconColor: "from-purple-500/20 to-purple-600/5",
      iconText: "text-purple-400",
      title: "Sleep Advice",
      advice: getSleepAdvice(),
    },
    {
      icon: <Umbrella className="w-5 h-5" />,
      iconColor: rainChance > 30 ? "from-blue-500/20 to-blue-600/5" : "from-green-500/20 to-green-600/5",
      iconText: rainChance > 30 ? "text-blue-400" : "text-green-400",
      title: "Umbrella",
      advice: getUmbrellaAdvice(),
    },
    {
      icon: <Sun className="w-5 h-5" />,
      iconColor: "from-yellow-500/20 to-yellow-600/5",
      iconText: "text-yellow-400",
      title: "Activity",
      advice: getActivityAdvice(),
    },
    {
      icon: <Droplets className="w-5 h-5" />,
      iconColor: "from-cyan-500/20 to-cyan-600/5",
      iconText: "text-cyan-400",
      title: "Hydration",
      advice: getHydrationAdvice(),
    },
  ];

  // Group advice items into pairs for a compact 2-per-card layout
  const pairs = [];
  for (let i = 0; i < adviceItems.length; i += 2) {
    pairs.push(adviceItems.slice(i, i + 2));
  }

  return (
    <>
      {pairs.map((pair, pairIndex) => (
        <WeatherCard key={pairIndex} className="animate-fade-in group hover:scale-[1.02] transition-transform duration-300">
          <div className="p-4 sm:p-5 space-y-3">
            {pair.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`flex-shrink-0 p-2 rounded-xl bg-gradient-to-br ${item.iconColor} border border-white/10 ${item.iconText} shadow-lg`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                    {item.advice}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </WeatherCard>
      ))}
    </>
  );
};
