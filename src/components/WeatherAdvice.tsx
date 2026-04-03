import { WeatherData } from "@/lib/weather";
import { WeatherCard } from "./WeatherCard";
import { 
  CloudRain, Shirt, UtensilsCrossed, Moon, Activity, Droplets,
  Sun, Thermometer, Wind, Umbrella, Heart, Dumbbell,
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
      icon: Shirt,
      accentHsl: "200 80% 55%",
      title: "What to Wear",
      advice: getClothingAdvice(),
    },
    {
      icon: UtensilsCrossed,
      accentHsl: "28 100% 55%",
      title: "What to Eat",
      advice: getFoodAdvice(),
    },
    {
      icon: Moon,
      accentHsl: "270 70% 60%",
      title: "Sleep Advice",
      advice: getSleepAdvice(),
    },
    {
      icon: Umbrella,
      accentHsl: rainChance > 30 ? "220 80% 55%" : "150 70% 45%",
      title: "Umbrella",
      advice: getUmbrellaAdvice(),
    },
    {
      icon: Dumbbell,
      accentHsl: "40 95% 55%",
      title: "Activity",
      advice: getActivityAdvice(),
    },
    {
      icon: Droplets,
      accentHsl: "185 70% 50%",
      title: "Hydration",
      advice: getHydrationAdvice(),
    },
  ];

  return (
    <>
      {adviceItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <WeatherCard 
            key={index} 
            className="animate-fade-in group"
          >
            <div className="p-4 sm:p-5 relative overflow-hidden">
              {/* Ambient glow */}
              <div 
                className="absolute -top-6 -left-6 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-700"
                style={{ background: `hsl(${item.accentHsl} / 0.3)` }}
              />
              
              <div className="flex items-start gap-4 relative z-10">
                {/* Icon container - clean, minimal, cohesive */}
                <div 
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, hsl(${item.accentHsl} / 0.15), hsl(${item.accentHsl} / 0.08))`,
                    ringColor: `hsl(${item.accentHsl} / 0.25)`,
                    boxShadow: `0 0 0 1px hsl(${item.accentHsl} / 0.2)`,
                  }}
                >
                  <Icon 
                    className="w-5 h-5 transition-colors duration-300" 
                    style={{ color: `hsl(${item.accentHsl})` }}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 
                    className="text-sm font-bold text-foreground tracking-wide mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {item.title}
                  </h3>
                  <p 
                    className="text-xs leading-relaxed text-muted-foreground"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                  >
                    {item.advice}
                  </p>
                </div>
              </div>

              {/* Bottom accent line */}
              <div 
                className="absolute bottom-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, hsl(${item.accentHsl} / 0.4), transparent)` }}
              />
            </div>
          </WeatherCard>
        );
      })}
    </>
  );
};
