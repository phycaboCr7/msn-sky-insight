import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const variants = {
    default: "bg-glass-strong/90 backdrop-blur-3xl border border-glass-border/50 shadow-elevation-mid",
    glass: "bg-glass-strong/80 backdrop-blur-3xl border border-glass-border/40 shadow-elevation-low",
    highlighted: "bg-glass-strong/95 backdrop-blur-3xl shadow-glow border border-primary/30 animate-glow-pulse"
  };

  return (
    <Card className={cn(
      "group transition-all duration-700 hover:shadow-elevation-high hover:scale-[1.03] hover:-translate-y-2 animate-reveal",
      "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-aurora/30 before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700",
      "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-cosmic/50 after:opacity-0 hover:after:opacity-100 after:transition-all after:duration-700 after:animate-aurora",
      "relative overflow-hidden backdrop-saturate-150",
      "hover:border-glass-border hover:backdrop-blur-[40px]",
      variants[variant],
      className
    )}>
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  );
};