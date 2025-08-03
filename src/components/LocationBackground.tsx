import { useState, useEffect } from "react";
import { WeatherData } from "@/lib/weather";

interface LocationBackgroundProps {
  weather: WeatherData;
  className?: string;
}

const PIXABAY_API_KEY = "43307277-3275141345dbfb358b9de4311";

const getLocationKeywords = (location: string, region: string, country: string) => {
  // Use location name with region/country for better results
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
        
        const response = await fetch(
          `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(keywords)}&image_type=photo&orientation=horizontal&category=places&min_width=800&per_page=20&safesearch=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.hits && data.hits.length > 0) {
            // Get a random image from the results
            const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 10));
            const imageUrl = data.hits[randomIndex].largeImageURL || data.hits[randomIndex].webformatURL;
            setLocationImage(imageUrl);
          }
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