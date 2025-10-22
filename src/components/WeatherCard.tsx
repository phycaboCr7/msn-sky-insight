import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const variants = {
    default: "bg-gradient-card backdrop-blur-xl border border-glass-border shadow-elevation-mid",
    glass: "bg-glass-strong backdrop-blur-2xl border border-glass-border shadow-elevation-low",
    highlighted: "bg-gradient-hero backdrop-blur-2xl shadow-glow border border-primary/40 animate-glow-pulse"
  };

  return (
    <Card className={cn(
      "group transition-all duration-700 hover:shadow-elevation-high hover:scale-[1.03] hover:-translate-y-2 animate-reveal",
      "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-aurora before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700",
      "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-cosmic after:opacity-0 hover:after:opacity-100 after:transition-all after:duration-700 after:animate-aurora",
      "relative overflow-hidden",
      "hover:border-primary/30",
      variants[variant],
      className
    )}>
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  );
};