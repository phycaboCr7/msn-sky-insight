import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { WeatherData, getForecastWeather, getLocationFromCoords } from "@/lib/weather";
import { CurrentWeather } from "@/components/CurrentWeather";
import { SearchLocation } from "@/components/SearchLocation";
import { SplashScreen } from "@/components/SplashScreen";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import logoSrc from "@/assets/logo.png";

// Lazy load non-critical components for faster initial load
const HourlyForecast = lazy(() => import("@/components/HourlyForecast").then(m => ({ default: m.HourlyForecast })).catch(e => { console.error("Failed to load HourlyForecast:", e); return { default: () => null }; }));
const WeatherDetails = lazy(() => import("@/components/WeatherDetails").then(m => ({ default: m.WeatherDetails })).catch(() => ({ default: () => null })));
const DailyForecast = lazy(() => import("@/components/DailyForecast").then(m => ({ default: m.DailyForecast })).catch(() => ({ default: () => null })));
const TemperatureChart = lazy(() => import("@/components/charts/TemperatureChart").then(m => ({ default: m.TemperatureChart })).catch(() => ({ default: () => null })));
const HumidityChart = lazy(() => import("@/components/charts/HumidityChart").then(m => ({ default: m.HumidityChart })).catch(() => ({ default: () => null })));
const UVIndexChart = lazy(() => import("@/components/charts/UVIndexChart").then(m => ({ default: m.UVIndexChart })).catch(() => ({ default: () => null })));
const WindChart = lazy(() => import("@/components/charts/WindChart").then(m => ({ default: m.WindChart })).catch(() => ({ default: () => null })));
const MonthlyChart = lazy(() => import("@/components/charts/MonthlyChart").then(m => ({ default: m.MonthlyChart })).catch(() => ({ default: () => null })));
const WeatherAdvice = lazy(() => import("@/components/WeatherAdvice").then(m => ({ default: m.WeatherAdvice })).catch(() => ({ default: () => null })));
const AirQualityCard = lazy(() => import("@/components/AirQualityCard").then(m => ({ default: m.AirQualityCard })).catch(() => ({ default: () => null })));
const WeatherzaAI = lazy(() => import("@/components/WeatherzaAI").then(m => ({ default: m.WeatherzaAI })).catch(() => ({ default: () => null })));
const DynamicBackground = lazy(() => import("@/components/DynamicBackground").then(m => ({ default: m.DynamicBackground })).catch(() => ({ default: () => null })));
const MoonPhaseCard = lazy(() => import("@/components/MoonPhaseCard").then(m => ({ default: m.MoonPhaseCard })).catch(() => ({ default: () => null })));
const SunPhaseCard = lazy(() => import("@/components/SunPhaseCard").then(m => ({ default: m.SunPhaseCard })).catch(() => ({ default: () => null })));
const WorldMap = lazy(() => import("@/components/WorldMap").then(m => ({ default: m.WorldMap })).catch(() => ({ default: () => null })));
const StockWidget = lazy(() => import("@/components/StockWidget").then(m => ({ default: m.StockWidget })).catch(() => ({ default: () => null })));

// Simple loading skeleton
const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 animate-pulse ${className}`}>
    <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-white/10 rounded w-full" />
      <div className="h-4 bg-white/10 rounded w-2/3" />
    </div>
  </div>
);

const Index = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const fetchWeather = async (location: string) => {
    setLoading(true);
    try {
      const data = await getForecastWeather(location, 7);
      setWeather(data);
    } catch (error) {
      console.error("Error fetching weather:", error);
      toast({
        title: "Error",
        description: "Failed to fetch weather data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const forecastData = await getForecastWeather(
              `${position.coords.latitude},${position.coords.longitude}`,
              7
            );
            setWeather(forecastData);
          } catch (error) {
            console.error("Error fetching location weather:", error);
            toast({
              title: "Error",
              description: "Failed to fetch weather for your location.",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
            setInitialLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Fallback to a default location instead of showing blank screen
          fetchWeather("New Delhi");
        }
      );
    } else {
      // Fallback to default location
      fetchWeather("New Delhi");
    }
  };

  const scrollLockRef = useRef(true);

  useEffect(() => {
    getCurrentLocation();
    window.scrollTo(0, 0);
  }, []);

  // Keep page pinned to top until user interacts
  useEffect(() => {
    if (!weather) return;
    
    // Immediately scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Keep forcing scroll top for a few seconds while lazy components load
    const intervals = [100, 300, 600, 1000, 1500, 2000];
    const timers = intervals.map(ms =>
      setTimeout(() => {
        if (scrollLockRef.current) {
          window.scrollTo(0, 0);
        }
      }, ms)
    );

    // Release scroll lock after user scrolls intentionally
    const handleUserScroll = () => {
      scrollLockRef.current = false;
    };
    window.addEventListener('wheel', handleUserScroll, { once: true });
    window.addEventListener('touchmove', handleUserScroll, { once: true });

    // Auto-release after 3s
    const releaseTimer = setTimeout(() => {
      scrollLockRef.current = false;
    }, 3000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(releaseTimer);
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, [weather]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-weather flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={40} />
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Loading Weather</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Getting your location...</p>
        </div>
      </div>
    );
  }

  const currentTime = weather?.location?.localtime 
    ? new Date(weather.location.localtime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-weather relative overflow-x-hidden">
      {/* Dynamic weather-based background */}
      <Suspense fallback={null}>
        <DynamicBackground weather={weather} />
      </Suspense>
      
      {/* Subtle background overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background/0" />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-20 max-w-7xl">
        <div className="mb-6 sm:mb-8 text-center animate-fade-in">
          <h1 className="font-playfair text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-2 sm:mb-3 bg-gradient-to-r from-primary/90 via-foreground/90 to-primary/80 bg-clip-text text-transparent">
            Weatherza
          </h1>
          {currentTime && (
            <div 
              className="text-2xl sm:text-3xl mb-2 text-foreground"
              style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}
            >
              {currentTime}
            </div>
          )}
          <p className="text-muted-foreground text-base sm:text-lg">A True Forecasting Experience</p>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-primary to-blue-500 mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <SearchLocation
            onLocationSelect={fetchWeather}
            onCurrentLocation={getCurrentLocation}
            isLoading={loading}
          />

          {weather && (
            <>
              <CurrentWeather weather={weather} />
              
              <Suspense fallback={<CardSkeleton />}>
                <WeatherAdvice weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <AirQualityCard weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <MoonPhaseCard weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <SunPhaseCard weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <StockWidget country={weather?.location?.country} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton className="col-span-full" />}>
                <WorldMap weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <TemperatureChart weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <HourlyForecast weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <HumidityChart weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <UVIndexChart weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <WindChart weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <WeatherDetails weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <DailyForecast weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <MonthlyChart weather={weather} />
              </Suspense>
              
              <Suspense fallback={<CardSkeleton className="col-span-full" />}>
                <WeatherzaAI weather={weather} />
              </Suspense>
            </>
          )}

          {!weather && !loading && (
            <div className="col-span-full text-center py-8 sm:py-16 animate-fade-in px-4">
              <div className="max-w-md mx-auto">
                <div className="w-16 sm:w-24 h-16 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center">
                  <Search className="w-8 sm:w-12 h-8 sm:h-12 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 sm:mb-3">
                  Discover Weather Anywhere
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Enter a city name or use your current location to get started with detailed weather insights
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <footer className="mt-8 sm:mt-16 py-6 sm:py-8 text-center relative z-20">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4 sm:mb-6" />
          <p className="text-muted-foreground text-xs sm:text-sm font-medium px-4">
            Website made by <span className="text-primary font-semibold">Rakshit Jain</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;