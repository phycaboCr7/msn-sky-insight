import { useState, useEffect } from "react";
import { WeatherData } from "@/lib/weather";
import { supabase } from "@/integrations/supabase/client";

interface DynamicBackgroundProps {
  weather: WeatherData | null;
}

const getWeatherKeywords = (condition: string) => {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
    return 'golden hour sunset mesmerizing sky';
  } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return 'dramatic rain storm cinematic';
  } else if (lowerCondition.includes('cloud')) {
    return 'dramatic clouds aerial cinematic sky';
  } else if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) {
    return 'epic thunderstorm lightning dramatic sky';
  } else if (lowerCondition.includes('snow')) {
    return 'magical winter snowfall dreamy landscape';
  } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
    return 'mystical fog ethereal forest';
  } else if (lowerCondition.includes('wind')) {
    return 'dramatic wind sweeping landscape cinematic';
  } else {
    return 'mesmerizing nature landscape cinematic';
  }
};

export const DynamicBackground = ({ weather }: DynamicBackgroundProps) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weather) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const keywords = getWeatherKeywords(weather.current.condition.text);
        const { data, error } = await supabase.functions.invoke('pixabay-proxy', {
          body: { query: keywords, category: 'nature', min_width: 1920, per_page: 20, image_type: 'photo', editors_choice: true },
        });
        
        if (!error && data?.hits && data.hits.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 10));
          const imageUrl = data.hits[randomIndex].largeImageURL || data.hits[randomIndex].webformatURL;
          const img = new Image();
          img.onload = () => setBackgroundImage(imageUrl);
          img.src = imageUrl;
        }
      } catch (error) {
        console.error('Error fetching background image:', error);
      } finally {
        setLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [weather?.current.condition.text]);

  if (!backgroundImage) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-0 animate-cinematic-zoom"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.45)',
        }}
      />
      <div 
        className="fixed inset-0 z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </>
  );
};
