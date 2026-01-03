import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const variants = {
    default: "bg-gradient-card backdrop-blur-glass border border-white/10 shadow-card",
    glass: "bg-white/5 backdrop-blur-glass border border-white/20 shadow-lg",
    highlighted: "bg-gradient-hero backdrop-blur-glass shadow-glow border border-primary/30 animate-glow-pulse"
  };

  return (
    <Card className={cn(
      "transition-all duration-500 hover:shadow-glow hover:scale-[1.02] hover:-translate-y-1 animate-fade-in",
      "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
      "relative overflow-hidden",
      variants[variant],
      className
    )}>
      {children}
    </Card>
  );
};