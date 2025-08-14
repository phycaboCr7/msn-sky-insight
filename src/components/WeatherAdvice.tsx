import { WeatherData } from "@/lib/weather";
import { WeatherCard } from "./WeatherCard";
import { Umbrella, Shirt, Coffee, Moon } from "lucide-react";

interface WeatherAdviceProps {
  weather: WeatherData;
}

export const WeatherAdvice = ({ weather }: WeatherAdviceProps) => {
  const temp = weather.current.temp_c;
  const condition = weather.current.condition.text.toLowerCase();
  const humidity = weather.current.humidity;
  const rainChance = weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0;
  const uvIndex = weather.current.uv;

  const getClothingAdvice = () => {
    if (temp < 10) return "Wear warm clothes, jacket, and layers for comfort";
    if (temp < 18) return "Light jacket or sweater recommended";
    if (temp < 25) return "Comfortable clothing, t-shirt or light shirt";
    return "Light, breathable clothing recommended";
  };

  const getFoodAdvice = () => {
    if (temp < 10) return "Hot drinks, warm soup, and comfort food";
    if (temp < 25) return "Balanced meals and stay well hydrated";
    return "Light meals, cold drinks, and fresh fruits";
  };

  const getSleepAdvice = () => {
    if (temp < 15) return "7-8 hours with warm blankets recommended";
    if (temp < 25) return "7-8 hours with comfortable bedding";
    return "7-8 hours with light bedding, keep room cool";
  };

  const getUmbrellaAdvice = () => {
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return "Take umbrella - rain expected today";
    }
    if (rainChance > 60) return "Take umbrella - high rain chance";
    if (rainChance > 30) return "Consider umbrella - possible rain";
    return "No umbrella needed today";
  };

  const adviceItems = [
    {
      icon: <Shirt className="w-6 h-6 text-blue-400" />,
      title: "What to Wear",
      advice: getClothingAdvice()
    },
    {
      icon: <Coffee className="w-6 h-6 text-orange-400" />,
      title: "What to Eat",
      advice: getFoodAdvice()
    },
    {
      icon: <Moon className="w-6 h-6 text-purple-400" />,
      title: "Sleep Advice",
      advice: getSleepAdvice()
    },
    {
      icon: <Umbrella className={`w-6 h-6 ${rainChance > 30 ? 'text-blue-400' : 'text-green-400'}`} />,
      title: "Umbrella",
      advice: getUmbrellaAdvice()
    }
  ];

  return (
    <>
      {adviceItems.map((item, index) => (
        <WeatherCard key={index} className="animate-fade-in">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-3 rounded-lg bg-white/5">
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
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