import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const variants = {
    default: "bg-gradient-card backdrop-blur-lg border-border/50 shadow-card",
    glass: "bg-card/30 backdrop-blur-xl border-border/30 shadow-lg",
    highlighted: "bg-gradient-sunny shadow-glow border-primary/30"
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
      variants[variant],
      className
    )}>
      {children}
    </Card>
  );
};