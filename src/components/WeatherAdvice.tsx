import { WeatherData } from "@/lib/weather";
import { Card, CardContent } from "@/components/ui/card";
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

  const getClothingAdvice = () => {
    if (temp < 10) return "Wear warm clothes, jacket, and layers";
    if (temp < 18) return "Light jacket or sweater recommended";
    if (temp < 25) return "Comfortable clothing, t-shirt or light shirt";
    return "Light, breathable clothing recommended";
  };

  const getFoodAdvice = () => {
    if (temp < 10) return "Hot drinks, warm soup, comfort food";
    if (temp < 25) return "Balanced meals, stay hydrated";
    return "Light meals, cold drinks, fresh fruits";
  };

  const getSleepAdvice = () => {
    if (temp < 15) return "7-8 hours, warm blankets recommended";
    if (temp < 25) return "7-8 hours, comfortable bedding";
    return "7-8 hours, light bedding, keep room cool";
  };

  const getUmbrellaAdvice = () => {
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return "Take umbrella - rain expected";
    }
    if (rainChance > 60) return "Take umbrella - high rain chance";
    if (rainChance > 30) return "Consider umbrella - possible rain";
    return "No umbrella needed today";
  };

  const adviceItems = [
    {
      icon: <Shirt className="w-5 h-5" />,
      title: "What to Wear",
      advice: getClothingAdvice(),
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: <Coffee className="w-5 h-5" />,
      title: "What to Eat",
      advice: getFoodAdvice(),
      color: "from-orange-500/20 to-red-500/20"
    },
    {
      icon: <Moon className="w-5 h-5" />,
      title: "Sleep Advice",
      advice: getSleepAdvice(),
      color: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: <Umbrella className="w-5 h-5" />,
      title: "Umbrella",
      advice: getUmbrellaAdvice(),
      color: rainChance > 30 ? "from-blue-600/20 to-blue-700/20" : "from-green-500/20 to-green-600/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {adviceItems.map((item, index) => (
        <Card key={index} className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${item.color} mb-3`}>
              {item.icon}
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-2">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.advice}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};