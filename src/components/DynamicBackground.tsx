import { useState, useEffect, useRef } from "react";
import { WeatherData } from "@/lib/weather";

interface DynamicBackgroundProps {
  weather: WeatherData | null;
}

const PIXABAY_API_KEY = "43307277-3275141345dbfb358b9de4311";
const CACHE_KEY = "weatherza_bg";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cinematic keyword pool — randomized each refresh
const CINEMATIC_QUERIES = [
  "cherry blossom landscape",
  "aurora borealis sky",
  "magical forest sunlight",
  "sunrise mountains golden",
  "waterfall nature tropical",
  "dreamy lake reflection",
  "cinematic sky clouds",
  "fantasy valley mist",
  "peaceful japanese garden",
  "mystical fog forest",
  "colorful sunset landscape",
  "cosmic milky way stars",
  "peaceful ocean waves",
  "autumn forest golden leaves",
  "lavender field purple",
  "snow mountain winter",
  "tropical island paradise",
  "volcano lava glow",
];

// Weather-aware keyword boost
const getWeatherBoost = (condition: string): string => {
  const c = condition.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "golden sunlight landscape";
  if (c.includes("rain") || c.includes("drizzle")) return "rain moody atmosphere";
  if (c.includes("cloud")) return "dramatic clouds sky";
  if (c.includes("storm") || c.includes("thunder")) return "thunderstorm dramatic lightning";
  if (c.includes("snow")) return "snow winter wonderland";
  if (c.includes("fog") || c.includes("mist")) return "misty foggy valley";
  return "";
};

interface CachedBg {
  url: string;
  thumb: string;
  ts: number;
}

const getCached = (): CachedBg | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedBg = JSON.parse(raw);
    if (Date.now() - parsed.ts < CACHE_TTL) return parsed;
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
  return null;
};

const setCache = (url: string, thumb: string) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ url, thumb, ts: Date.now() } as CachedBg));
  } catch { /* ignore */ }
};

export const DynamicBackground = ({ weather }: DynamicBackgroundProps) => {
  const [bgUrl, setBgUrl] = useState<string>("");
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // 1. Try cache first
    const cached = getCached();
    if (cached) {
      setThumbUrl(cached.thumb);
      setBgUrl(cached.url);
      // Preload HD
      const img = new Image();
      img.onload = () => setLoaded(true);
      img.src = cached.url;
      return;
    }

    // 2. Fetch from Pixabay after short delay
    const timeout = setTimeout(async () => {
      try {
        // Pick a cinematic query, optionally boosted by weather
        const weatherBoost = weather ? getWeatherBoost(weather.current.condition.text) : "";
        const pool = weatherBoost
          ? [weatherBoost, ...CINEMATIC_QUERIES]
          : CINEMATIC_QUERIES;
        const query = pool[Math.floor(Math.random() * pool.length)];

        const isMobile = window.innerWidth < 768;

        const res = await fetch(
          `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&category=nature&min_width=1920&min_height=1080&per_page=10&safesearch=true`
        );

        if (!res.ok) return;
        const data = await res.json();
        if (!data.hits?.length) return;

        // Filter for landscape quality
        const qualified = data.hits.filter(
          (h: any) => h.imageWidth >= 1600 && h.imageHeight >= 900
        );
        const picks = qualified.length ? qualified : data.hits;
        const pick = picks[Math.floor(Math.random() * Math.min(picks.length, 5))];

        const hdUrl = isMobile ? pick.webformatURL : (pick.largeImageURL || pick.webformatURL);
        const lowUrl = pick.previewURL || pick.webformatURL;

        // Show low-res immediately
        setThumbUrl(lowUrl);

        // Preload HD, then swap
        const img = new Image();
        img.onload = () => {
          setBgUrl(hdUrl);
          setLoaded(true);
          setCache(hdUrl, lowUrl);
        };
        img.src = hdUrl;
      } catch (err) {
        console.error("Background fetch error:", err);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [weather?.current?.condition?.text]);

  const currentSrc = loaded ? bgUrl : thumbUrl;
  if (!currentSrc) return null;

  return (
    <>
      {/* Background image layer */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${currentSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          transform: "scale(1.05)",
          filter: loaded ? "brightness(0.45)" : "blur(20px) brightness(0.4)",
          transition: "filter 1200ms ease-in-out, opacity 1200ms ease-in-out",
          opacity: currentSrc ? 1 : 0,
        }}
      />

      {/* Dark overlay for readability */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.35)",
        }}
      />

      {/* Vignette + gradient overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)
          `,
        }}
      />
    </>
  );
};
