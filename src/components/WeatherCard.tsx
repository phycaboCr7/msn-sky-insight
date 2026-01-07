import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const baseStyles = "transition-all duration-700 ease-out";
  
  const visibleStyles = "bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl";
  const hiddenStyles = "bg-white/5 backdrop-blur-md border border-white/5 shadow-none";

  const variants = {
    default: isVisible ? visibleStyles : hiddenStyles,
    glass: isVisible ? "bg-black/30 backdrop-blur-xl border border-white/20 shadow-lg" : hiddenStyles,
    highlighted: isVisible 
      ? "bg-gradient-to-br from-primary/20 to-black/40 backdrop-blur-xl shadow-glow border border-primary/30" 
      : hiddenStyles
  };

  return (
    <Card 
      ref={cardRef}
      className={cn(
        baseStyles,
        "hover:shadow-glow hover:scale-[1.02] hover:-translate-y-1 animate-fade-in",
        "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        "relative overflow-hidden",
        variants[variant],
        className
      )}
    >
      {children}
    </Card>
  );
};