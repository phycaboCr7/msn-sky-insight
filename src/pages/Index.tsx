import { useState, useEffect } from "react";
import { WeatherData, getForecastWeather, getLocationFromCoords } from "@/lib/weather";
import { CurrentWeather } from "@/components/CurrentWeather";
import { HourlyForecast } from "@/components/HourlyForecast";
import { WeatherDetails } from "@/components/WeatherDetails";
import { DailyForecast } from "@/components/DailyForecast";
import { SearchLocation } from "@/components/SearchLocation";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { HumidityChart } from "@/components/charts/HumidityChart";
import { UVIndexChart } from "@/components/charts/UVIndexChart";
import { WindChart } from "@/components/charts/WindChart";
import { MonthlyChart } from "@/components/charts/MonthlyChart";
import { WeatherAdvice } from "@/components/WeatherAdvice";
import { AirQualityCard } from "@/components/AirQualityCard";
import { WeatherzaAI } from "@/components/WeatherzaAI";
import { DynamicBackground } from "@/components/DynamicBackground";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Sparkles } from "lucide-react";

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
            const data = await getLocationFromCoords(
              position.coords.latitude,
              position.coords.longitude
            );
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
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please search for a city instead.",
            variant: "destructive",
          });
          setLoading(false);
          setInitialLoading(false);
        }
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-weather flex items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient glow effects */}
        <div className="ambient-glow ambient-glow-1" />
        <div className="ambient-glow ambient-glow-2" />
        
        <div className="text-center relative z-10">
          <div className="relative inline-block mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center loading-premium">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          </div>
          <h2 className="hero-title text-3xl sm:text-4xl text-gradient-premium mb-3">
            Weatherza
          </h2>
          <p className="hero-subtitle text-sm text-muted-foreground tracking-widest">
            Loading your weather experience
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-weather relative overflow-hidden">
      {/* Noise texture overlay for premium feel */}
      <div className="noise-overlay" />
      
      {/* Ambient glow effects */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />
      
      {/* Dynamic weather-based background */}
      <DynamicBackground weather={weather} />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/60" />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-aurora)' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-20 max-w-7xl">
        {/* Premium Hero Section */}
        <header className="mb-10 sm:mb-16 text-center entrance-fade">
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
            <Sparkles className="w-4 h-4 text-primary/60 animate-pulse" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
          
          <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-gradient-premium mb-4 sm:mb-5">
            Weatherza
          </h1>
          
          <p className="hero-subtitle text-xs sm:text-sm text-muted-foreground mb-6">
            A Premium Forecasting Experience
          </p>
          
          {/* Decorative line with glow */}
          <div className="relative w-32 sm:w-48 h-0.5 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent blur-sm" />
            <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-lg" />
          </div>
        </header>

        {/* Weather Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
          <div className="entrance-fade stagger-1">
            <SearchLocation
              onLocationSelect={fetchWeather}
              onCurrentLocation={getCurrentLocation}
              isLoading={loading}
            />
          </div>

          {weather && (
            <>
              <div className="entrance-fade stagger-2 col-span-full lg:col-span-2">
                <CurrentWeather weather={weather} />
              </div>
              <div className="entrance-fade stagger-3">
                <WeatherAdvice weather={weather} />
              </div>
              <div className="entrance-fade stagger-4">
                <AirQualityCard weather={weather} />
              </div>
              <div className="entrance-fade stagger-5">
                <TemperatureChart weather={weather} />
              </div>
              <div className="entrance-fade stagger-6">
                <HourlyForecast weather={weather} />
              </div>
              <div className="entrance-fade stagger-7">
                <HumidityChart weather={weather} />
              </div>
              <div className="entrance-fade stagger-8">
                <UVIndexChart weather={weather} />
              </div>
              <div className="entrance-fade" style={{ animationDelay: '0.9s' }}>
                <WindChart weather={weather} />
              </div>
              <div className="entrance-fade" style={{ animationDelay: '1s' }}>
                <WeatherDetails weather={weather} />
              </div>
              <div className="entrance-fade" style={{ animationDelay: '1.1s' }}>
                <DailyForecast weather={weather} />
              </div>
              <div className="entrance-fade" style={{ animationDelay: '1.2s' }}>
                <MonthlyChart weather={weather} />
              </div>
              <div className="entrance-fade col-span-full" style={{ animationDelay: '1.3s' }}>
                <WeatherzaAI weather={weather} />
              </div>
            </>
          )}

          {!weather && !loading && (
            <div className="col-span-full text-center py-12 sm:py-20 entrance-fade">
              <div className="max-w-lg mx-auto">
                {/* Animated search icon */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/15 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-card to-card/80 flex items-center justify-center">
                    <Search className="w-10 h-10 sm:w-14 sm:h-14 text-primary/80" />
                  </div>
                </div>
                
                <h2 className="hero-title text-3xl sm:text-4xl text-gradient-aurora mb-4">
                  Discover Weather Anywhere
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                  Enter a city name or use your current location to unlock detailed weather insights with stunning visualizations
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Premium Footer */}
        <footer className="mt-16 sm:mt-24 py-8 sm:py-12 text-center relative z-20">
          {/* Decorative separator */}
          <div className="relative w-full h-px mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-3 h-3 text-primary/50" />
            <span className="hero-subtitle text-[10px] text-muted-foreground/60 tracking-widest">
              Crafted with precision
            </span>
            <Sparkles className="w-3 h-3 text-primary/50" />
          </div>
          
          <p className="text-muted-foreground text-sm font-medium">
            Designed & Developed by{" "}
            <span className="text-gradient-premium font-semibold">
              Rakshit Jain
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;