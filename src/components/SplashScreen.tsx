import { useState, useEffect } from "react";
import logoSrc from "@/assets/logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"logo" | "glow" | "exit">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("glow"), 600);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(onComplete, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "hsl(220 30% 6%)" }}
    >
      {/* Ambient glow rings */}
      <div
        className={`absolute w-72 h-72 rounded-full transition-all duration-1000 ${
          phase === "glow" ? "opacity-60 scale-100" : "opacity-0 scale-50"
        }`}
        style={{
          background: "radial-gradient(circle, hsl(28 100% 55% / 0.35) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className={`absolute w-96 h-96 rounded-full transition-all duration-1200 delay-200 ${
          phase === "glow" ? "opacity-40 scale-100" : "opacity-0 scale-50"
        }`}
        style={{
          background: "radial-gradient(circle, hsl(28 100% 60% / 0.2) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Logo */}
      <img
        src={logoSrc}
        alt="Weatherza"
        className={`w-28 h-28 sm:w-36 sm:h-36 object-contain relative z-10 transition-all duration-700 ${
          phase === "logo" ? "scale-75 opacity-0" : phase === "glow" ? "scale-100 opacity-100" : "scale-110 opacity-0"
        }`}
        style={{
          filter: phase === "glow" ? "drop-shadow(0 0 30px hsl(28 100% 55% / 0.6)) drop-shadow(0 0 60px hsl(28 100% 55% / 0.3))" : "none",
        }}
      />

      {/* Title */}
      <h1
        className={`mt-6 text-3xl sm:text-4xl font-bold tracking-tight relative z-10 transition-all duration-700 delay-300 ${
          phase === "glow" ? "opacity-100 translate-y-0" : phase === "exit" ? "opacity-0 -translate-y-4" : "opacity-0 translate-y-4"
        }`}
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          background: "linear-gradient(135deg, hsl(28 100% 60%), hsl(35 95% 70%), hsl(28 100% 55%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Weatherza
      </h1>
      <p
        className={`mt-2 text-sm text-muted-foreground relative z-10 transition-all duration-500 delay-500 ${
          phase === "glow" ? "opacity-70 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{ fontFamily: "'Quicksand', sans-serif", letterSpacing: "0.15em" }}
      >
        A TRUE FORECASTING EXPERIENCE
      </p>

      {/* Loading bar */}
      <div className="mt-8 w-32 h-[2px] bg-white/10 rounded-full overflow-hidden relative z-10">
        <div
          className={`h-full rounded-full transition-all ease-out ${
            phase === "logo" ? "w-0" : phase === "glow" ? "w-3/4" : "w-full"
          }`}
          style={{
            background: "linear-gradient(90deg, hsl(28 100% 55%), hsl(35 95% 65%))",
            transitionDuration: phase === "glow" ? "1600ms" : "400ms",
          }}
        />
      </div>
    </div>
  );
};
