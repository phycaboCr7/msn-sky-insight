import { useState, useEffect } from "react";
import { WeatherData } from "@/lib/weather";

interface DynamicBackgroundProps {
  weather: WeatherData | null;
}

const PIXABAY_API_KEY = "43307277-3275141345dbfb358b9de4311";

const getWeatherKeywords = (condition: string) => {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
    return 'sunny sky landscape';
  } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return 'rain drops weather';
  } else if (lowerCondition.includes('cloud')) {
    return 'cloudy sky atmosphere';
  } else if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) {
    return 'thunderstorm lightning';
  } else if (lowerCondition.includes('snow')) {
    return 'snow winter landscape';
  } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
    return 'fog misty landscape';
  } else if (lowerCondition.includes('wind')) {
    return 'windy trees autumn';
  } else {
    return 'beautiful landscape nature';
  }
};

export const DynamicBackground = ({ weather }: DynamicBackgroundProps) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weather) return;

    // Defer background image fetch to not block initial render
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const keywords = getWeatherKeywords(weather.current.condition.text);
        const response = await fetch(
          `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(keywords)}&image_type=photo&orientation=horizontal&category=nature&min_width=1920&per_page=10&safesearch=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.hits && data.hits.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 5));
            // Use webformatURL (smaller) instead of largeImageURL for faster load
            const imageUrl = data.hits[randomIndex].webformatURL;
            // Preload the image before displaying
            const img = new Image();
            img.onload = () => setBackgroundImage(imageUrl);
            img.src = imageUrl;
          }
        }
      } catch (error) {
        console.error('Error fetching background image:', error);
      } finally {
        setLoading(false);
      }
    }, 1500); // Delay 1.5s to let main content render first

    return () => clearTimeout(timeoutId);
  }, [weather?.current.condition.text]);

  if (!backgroundImage) return null;

  return (
    <>
      {/* Cinematic animated background image */}
      <div 
        className="fixed inset-0 z-0 animate-cinematic-zoom"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px) brightness(0.4)',
        }}
      />
      {/* Glassmorphism overlay for readability */}
      <div 
        className="fixed inset-0 z-[1]"
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(0,0,0,0.25)',
        }}
      />
    </>
  );
};