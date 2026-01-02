import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const variants = {
    default: "glass-card",
    glass: "glass-card bg-white/5",
    highlighted: "glass-card bg-gradient-hero animate-glow-pulse border-primary/30"
  };

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-2xl",
      "transition-all duration-700 ease-out",
      "hover:shadow-glow hover:shadow-primary/20",
      "card-hover-glow",
      variants[variant],
      className
    )}>
      {/* Premium inner glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>
      {children}
    </Card>
  );
};