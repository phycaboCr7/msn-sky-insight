import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface WeatherCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "highlighted";
}

// Shared parallax manager — single RAF loop for all cards
const parallaxCards = new Set<{ el: HTMLElement; setY: (y: number) => void }>();
let rafId: number | null = null;

const runParallax = () => {
  const wh = window.innerHeight;
  parallaxCards.forEach(({ el, setY }) => {
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const dist = (wh / 2 - center) / wh;
    setY(dist * 15);
  });
  rafId = requestAnimationFrame(runParallax);
};

const startParallax = () => {
  if (rafId === null && parallaxCards.size > 0) {
    rafId = requestAnimationFrame(runParallax);
  }
};

const stopParallax = () => {
  if (rafId !== null && parallaxCards.size === 0) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

export const WeatherCard = ({ children, className, variant = "default" }: WeatherCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Register with shared parallax manager
  useEffect(() => {
    if (!cardRef.current) return;
    const entry = { el: cardRef.current, setY: setParallaxY };
    parallaxCards.add(entry);
    startParallax();
    return () => {
      parallaxCards.delete(entry);
      stopParallax();
    };
  }, []);

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