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
import { DynamicBackground } from "@/components/DynamicBackground";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

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
    // Try to get user's location on initial load
    getCurrentLocation();
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-weather relative overflow-hidden">
      {/* Dynamic weather-based background */}
      <DynamicBackground weather={weather} />
      
      {/* Enhanced aurora overlay with animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-aurora animate-aurora" 
             style={{ backgroundSize: '200% 200%' }} />
        <div className="absolute inset-0 bg-gradient-cosmic opacity-60" />
        
        {/* Floating orbs for depth */}
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-40 right-[15%] w-80 h-80 bg-accent-blue/8 rounded-full blur-3xl animate-float" 
             style={{ animationDelay: '2s' }} />
        <div className="absolute top-[60%] left-[20%] w-72 h-72 bg-accent-purple/8 rounded-full blur-3xl animate-float-slow" 
             style={{ animationDelay: '4s' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-20 max-w-7xl">
        <div className="mb-6 sm:mb-8 text-center animate-fade-in-scale">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2 sm:mb-3 bg-gradient-to-r from-primary via-accent-blue to-accent-purple bg-clip-text text-transparent animate-gradient-shift" 
              style={{ backgroundSize: '200% auto' }}>
            Weatherza
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg font-medium tracking-wide">A True Forecasting Experience</p>
          <div className="relative w-16 sm:w-24 h-1.5 mx-auto mt-3 sm:mt-4 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent-blue to-accent-purple animate-gradient-shift" 
                 style={{ backgroundSize: '200% auto' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent-blue to-accent-purple blur-sm animate-gradient-shift" 
                 style={{ backgroundSize: '200% auto' }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SearchLocation
            onLocationSelect={fetchWeather}
            onCurrentLocation={getCurrentLocation}
            isLoading={loading}
          />

          {weather && (
            <>
              <CurrentWeather weather={weather} />
              <WeatherAdvice weather={weather} />
              <TemperatureChart weather={weather} />
              <HourlyForecast weather={weather} />
              <HumidityChart weather={weather} />
              <UVIndexChart weather={weather} />
              <WindChart weather={weather} />
              <WeatherDetails weather={weather} />
              <DailyForecast weather={weather} />
              <MonthlyChart weather={weather} />
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