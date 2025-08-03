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
import { AIRecommendations } from "@/components/AIRecommendations";
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
      <div className="min-h-screen bg-gradient-weather flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={48} />
          <h2 className="text-xl font-semibold text-foreground mb-2">Loading Weather</h2>
          <p className="text-muted-foreground">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-weather relative overflow-hidden">
      {/* Dynamic weather-based background */}
      <DynamicBackground weather={weather} />
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-20">
        <div className="mb-8 text-center animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-foreground via-primary/30 to-foreground bg-clip-text">
            Weather Forecast
          </h1>
          <p className="text-muted-foreground text-lg">Stay updated with the latest weather conditions worldwide</p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-blue-500 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SearchLocation
            onLocationSelect={fetchWeather}
            onCurrentLocation={getCurrentLocation}
            isLoading={loading}
          />

          {weather && (
            <>
              <CurrentWeather weather={weather} />
              <AIRecommendations weather={weather} />
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
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full flex items-center justify-center">
                  <Search className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  Discover Weather Anywhere
                </h2>
                <p className="text-muted-foreground text-lg">
                  Enter a city name or use your current location to get started with detailed weather insights
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;