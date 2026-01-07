import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [parallaxY, setParallaxY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Subtle parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const cardCenter = rect.top + rect.height / 2;
      const distanceFromCenter = (windowHeight / 2 - cardCenter) / windowHeight;
      setParallaxY(distanceFromCenter * 15); // Subtle 15px max parallax
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const baseStyles = "transition-all duration-500 ease-out";
  
  const visibleStyles = "bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl";
  const hiddenStyles = "bg-black/20 backdrop-blur-lg border border-white/8 shadow-md";

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
      style={{ transform: `translateY(${parallaxY}px)` }}
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