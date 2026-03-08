import { cn } from "@/lib/utils";

interface AnimatedWeatherIconProps {
  condition: string;
  isDay: boolean;
  temp?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const AnimatedWeatherIcon = ({ 
  condition, 
  isDay, 
  temp, 
  size = "lg",
  className 
}: AnimatedWeatherIconProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  };

  const getWeatherType = () => {
    const lowerCondition = condition.toLowerCase();
    
    if (temp !== undefined && temp < 5) return "snow";
    if (lowerCondition.includes('snow')) return "snow";
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) return "rainy";
    if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) return "cloudy";
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return isDay ? "sunny" : "night";
    }
    
    return isDay ? "sunny" : "night";
  };

  const weatherType = getWeatherType();

  return (
    <div className={cn("forecast-icon overflow-visible flex items-center justify-center", sizeClasses[size], className)}>
      {weatherType === "sunny" && <SunnyIcon size={size} />}
      {weatherType === "night" && <NightIcon size={size} />}
      {weatherType === "cloudy" && <CloudyIcon size={size} />}
      {weatherType === "rainy" && <RainyIcon size={size} />}
      {weatherType === "snow" && <SnowIcon size={size} />}
    </div>
  );
};

const SunnyIcon = ({ size }: { size: string }) => (
  <div className={cn(
    "forecast__sunny",
    size === "sm" && "scale-[0.4]",
    size === "md" && "scale-[0.6]",
    size === "lg" && "scale-100"
  )} />
);

const NightIcon = ({ size }: { size: string }) => (
  <div className={cn(
    "forecast__night",
    size === "sm" && "scale-[0.4]",
    size === "md" && "scale-[0.6]",
    size === "lg" && "scale-100"
  )} />
);

const CloudyIcon = ({ size }: { size: string }) => (
  <div className={cn(
    "forecast__cloudy",
    size === "sm" && "scale-[0.4]",
    size === "md" && "scale-[0.6]",
    size === "lg" && "scale-100"
  )}>
    <div className="forecast__cloudy__sun" />
    <div className="forecast__cloudy__cloud forecast__cloudy__cloud--small" />
    <div className="forecast__cloudy__cloud forecast__cloudy__cloud--normal" />
  </div>
);

const RainyIcon = ({ size }: { size: string }) => (
  <div className={cn(
    "forecast__rainy",
    size === "sm" && "scale-[0.4]",
    size === "md" && "scale-[0.6]",
    size === "lg" && "scale-100"
  )}>
    <div className="forecast__rainy__rain forecast__rainy__rain--one" />
    <div className="forecast__rainy__rain forecast__rainy__rain--two" />
    <div className="forecast__rainy__rain forecast__rainy__rain--three" />
    <div className="forecast__rainy__rain forecast__rainy__rain--four" />
    <div className="forecast__rainy__cloud forecast__rainy__cloud--grey" />
  </div>
);

const SnowIcon = ({ size }: { size: string }) => (
  <div className={cn(
    "forecast__snow",
    size === "sm" && "scale-[0.4]",
    size === "md" && "scale-[0.6]",
    size === "lg" && "scale-100"
  )}>
    <div className="forecast__snow__snow forecast__snow__snow--first" />
    <div className="forecast__snow__snow forecast__snow__snow--second" />
    <div className="forecast__snow__snow forecast__snow__snow--third" />
    <div className="forecast__snow__snow forecast__snow__snow--fourth" />
    <div className="forecast__snow__cloud forecast__snow__cloud--grey" />
  </div>
);
