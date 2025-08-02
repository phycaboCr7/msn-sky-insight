import { useState, useEffect } from "react";
import { WeatherData, getForecastWeather, getLocationFromCoords } from "@/lib/weather";
import { CurrentWeather } from "@/components/CurrentWeather";
import { HourlyForecast } from "@/components/HourlyForecast";
import { WeatherDetails } from "@/components/WeatherDetails";
import { DailyForecast } from "@/components/DailyForecast";
import { SearchLocation } from "@/components/SearchLocation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-weather">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Weather Forecast</h1>
          <p className="text-muted-foreground">Stay updated with the latest weather conditions</p>
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
              <HourlyForecast weather={weather} />
              <WeatherDetails weather={weather} />
              <DailyForecast weather={weather} />
            </>
          )}

          {!weather && !loading && (
            <div className="col-span-full text-center py-12">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Search for Weather
              </h2>
              <p className="text-muted-foreground">
                Enter a city name or use your current location to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;