import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { WeatherData, getForecastWeather, getLocationFromCoords } from "@/lib/weather";
import { CurrentWeather } from "@/components/CurrentWeather";
import { SearchLocation } from "@/components/SearchLocation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

// Lazy load non-critical components for faster initial load
const HourlyForecast = lazy(() => import("@/components/HourlyForecast").then(m => ({ default: m.HourlyForecast })));
const WeatherDetails = lazy(() => import("@/components/WeatherDetails").then(m => ({ default: m.WeatherDetails })));
const DailyForecast = lazy(() => import("@/components/DailyForecast").then(m => ({ default: m.DailyForecast })));
const TemperatureChart = lazy(() => import("@/components/charts/TemperatureChart").then(m => ({ default: m.TemperatureChart })));
const HumidityChart = lazy(() => import("@/components/charts/HumidityChart").then(m => ({ default: m.HumidityChart })));
const UVIndexChart = lazy(() => import("@/components/charts/UVIndexChart").then(m => ({ default: m.UVIndexChart })));
const WindChart = lazy(() => import("@/components/charts/WindChart").then(m => ({ default: m.WindChart })));
const MonthlyChart = lazy(() => import("@/components/charts/MonthlyChart").then(m => ({ default: m.MonthlyChart })));
const WeatherAdvice = lazy(() => import("@/components/WeatherAdvice").then(m => ({ default: m.WeatherAdvice })));
const AirQualityCard = lazy(() => import("@/components/AirQualityCard").then(m => ({ default: m.AirQualityCard })));
const WeatherzaAI = lazy(() => import("@/components/WeatherzaAI").then(m => ({ default: m.WeatherzaAI })));
const DynamicBackground = lazy(() => import("@/components/DynamicBackground").then(m => ({ default: m.DynamicBackground })));
const MoonPhaseCard = lazy(() => import("@/components/MoonPhaseCard").then(m => ({ default: m.MoonPhaseCard })));
const SunPhaseCard = lazy(() => import("@/components/SunPhaseCard").then(m => ({ default: m.SunPhaseCard })));
const WorldMap = lazy(() => import("@/components/WorldMap").then(m => ({ default: m.WorldMap })));
const StockWidget = lazy(() => import("@/components/StockWidget").then(m => ({ default: m.StockWidget })));

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

// Section label component
const SectionLabel = ({ label, className = "" }: { label: string; className?: string }) => (
  <div className={`col-span-full flex items-center gap-3 mt-2 ${className}`}>
    <div className="section-divider flex-1" />
    <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium whitespace-nowrap" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
      {label}
    </span>
    <div className="section-divider flex-1" />
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
          fetchWeather("New Delhi");
        }
      );
    } else {
      fetchWeather("New Delhi");
    }
  };

  const scrollLockRef = useRef(true);

  useEffect(() => {
    getCurrentLocation();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!weather) return;
    
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const intervals = [100, 300, 600, 1000, 1500, 2000];
    const timers = intervals.map(ms =>
      setTimeout(() => {
        if (scrollLockRef.current) {
          window.scrollTo(0, 0);
        }
      }, ms)
    );

    const handleUserScroll = () => {
      scrollLockRef.current = false;
    };
    window.addEventListener('wheel', handleUserScroll, { once: true });
    window.addEventListener('touchmove', handleUserScroll, { once: true });

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
          <h1 className="font-playfair text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-2 sm:mb-3 bg-gradient-to-r from-primary/90 via-foreground to-primary/80 bg-clip-text text-transparent">
            Weatherza
          </h1>
          {currentTime && (
            <div 
              className="text-2xl sm:text-3xl text-foreground/90 mb-2"
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
              <div className="col-span-full lg:col-span-2 animate-fade-in stagger-1">
                <CurrentWeather weather={weather} />
              </div>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-2">
                  <WeatherAdvice weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-3">
                  <AirQualityCard weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-4">
                  <MoonPhaseCard weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-5">
                  <SunPhaseCard weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-6">
                  <StockWidget country={weather?.location?.country} />
                </div>
              </Suspense>
              
              <SectionLabel label="Forecast" className="stagger-7 animate-fade-in" />
              
              <Suspense fallback={<CardSkeleton className="col-span-full" />}>
                <div className="col-span-full animate-fade-in stagger-7">
                  <HourlyForecast weather={weather} />
                </div>
              </Suspense>

              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-8">
                  <DailyForecast weather={weather} />
                </div>
              </Suspense>
              
              <SectionLabel label="Details" className="stagger-9 animate-fade-in" />
              
              <Suspense fallback={<CardSkeleton className="col-span-full" />}>
                <div className="col-span-full animate-fade-in stagger-9">
                  <WorldMap weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-10">
                  <TemperatureChart weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-11">
                  <HumidityChart weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-12">
                  <UVIndexChart weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-13">
                  <WindChart weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-13">
                  <WeatherDetails weather={weather} />
                </div>
              </Suspense>
              
              <Suspense fallback={<CardSkeleton />}>
                <div className="animate-fade-in stagger-14">
                  <MonthlyChart weather={weather} />
                </div>
              </Suspense>
              
              <SectionLabel label="Insights" className="stagger-14 animate-fade-in" />
              
              <Suspense fallback={<CardSkeleton className="col-span-full" />}>
                <div className="col-span-full animate-fade-in stagger-15">
                  <WeatherzaAI weather={weather} />
                </div>
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