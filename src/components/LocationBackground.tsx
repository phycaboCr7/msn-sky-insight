import { useState, useEffect } from "react";
import { WeatherData } from "@/lib/weather";
import { supabase } from "@/integrations/supabase/client";

interface LocationBackgroundProps {
  weather: WeatherData;
  className?: string;
}

const getLocationKeywords = (location: string, region: string, country: string) => {
  return `${location} ${region} ${country} landmark cityscape`;
};

export const LocationBackground = ({ weather, className = "" }: LocationBackgroundProps) => {
  const [locationImage, setLocationImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weather) return;

    const fetchLocationImage = async () => {
      setLoading(true);
      try {
        const keywords = getLocationKeywords(
          weather.location.name, 
          weather.location.region, 
          weather.location.country
        );
        
        const { data, error } = await supabase.functions.invoke('pixabay-proxy', {
          body: { query: keywords, category: 'places', min_width: 800, per_page: 20 },
        });
        
        if (!error && data?.hits && data.hits.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 10));
          const imageUrl = data.hits[randomIndex].largeImageURL || data.hits[randomIndex].webformatURL;
          setLocationImage(imageUrl);
        }
      } catch (error) {
        console.error('Error fetching location image:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationImage();
  }, [weather.location.name, weather.location.region, weather.location.country]);

  if (!locationImage) return null;

  return (
    <div 
      className={`absolute inset-0 z-0 transition-all duration-1000 ease-in-out ${className}`}
      style={{
        backgroundImage: `url(${locationImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(4px) brightness(0.3)',
        opacity: 0.7,
      }}
    />
  );
};
