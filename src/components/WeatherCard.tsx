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
  const [parallaxY, setParallaxY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only set visible when entering viewport
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.3 }
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
      setParallaxY(distanceFromCenter * 15);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Solid when visible, glass when not
  const visibleStyles = "bg-black/45 backdrop-blur-xl border-white/20 shadow-xl";
  const glassStyles = "bg-white/5 backdrop-blur-lg border-white/10 shadow-md";

  const getVariantStyles = () => {
    if (variant === "highlighted") {
      return isVisible 
        ? "bg-gradient-to-br from-primary/20 to-black/45 backdrop-blur-xl shadow-glow border-primary/30"
        : "bg-white/5 backdrop-blur-lg border-white/10 shadow-md";
    }
    return isVisible ? visibleStyles : glassStyles;
  };

  return (
    <Card 
      ref={cardRef}
      style={{ transform: `translateY(${parallaxY}px)` }}
      className={cn(
        "transition-colors duration-300 ease-out border",
        "hover:shadow-glow hover:scale-[1.02] hover:-translate-y-1 animate-fade-in",
        "relative overflow-hidden",
        getVariantStyles(),
        className
      )}
    >
      {children}
    </Card>
  );
};