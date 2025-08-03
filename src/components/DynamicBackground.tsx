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

    const fetchBackgroundImage = async () => {
      setLoading(true);
      try {
        const keywords = getWeatherKeywords(weather.current.condition.text);
        const response = await fetch(
          `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(keywords)}&image_type=photo&orientation=horizontal&category=nature&min_width=1920&per_page=20&safesearch=true`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.hits && data.hits.length > 0) {
            // Get a random image from the results
            const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 10));
            const imageUrl = data.hits[randomIndex].largeImageURL || data.hits[randomIndex].webformatURL;
            setBackgroundImage(imageUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching background image:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBackgroundImage();
  }, [weather?.current.condition.text]);

  if (!backgroundImage) return null;

  return (
    <div 
      className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(8px) brightness(0.3)',
        transform: 'scale(1.1)', // Slight scale to avoid blur edge artifacts
      }}
    />
  );
};