import { useState, useEffect } from "react";
import { WeatherCard } from "./WeatherCard";
import { WeatherData } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AIAskBar } from "./AIAskBar";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Loader2, Shirt, Umbrella, Sun, AlertTriangle, Utensils, Bed } from "lucide-react";

interface AIRecommendationsProps {
  weather: WeatherData;
}

interface Recommendation {
  category: string;
  advice: string;
  icon: React.ReactNode;
  priority: 'low' | 'medium' | 'high';
}

export const AIRecommendations = ({ weather }: AIRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const weatherInfo = {
        temperature: weather.current.temp_c,
        condition: weather.current.condition.text,
        humidity: weather.current.humidity,
        windSpeed: weather.current.wind_kph,
        uvIndex: weather.current.uv,
        visibility: weather.current.vis_km,
        feelsLike: weather.current.feelslike_c,
        precipChance: weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0,
        location: weather.location.name
      };

      const prompt = `Using this weather data: ${JSON.stringify(weatherInfo)}, return actionable recommendations for these exact categories: ["Clothing","Diet","Sleep","Umbrella"]. For each, provide: category, advice, priority (low|medium|high). Keep advice concise and specific to the location \"${weatherInfo.location}\". Return ONLY a valid JSON array.`;

      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { prompt, type: "json" },
      });

      if (error) throw error;
      const aiResponse = data?.text || "";

      // Parse AI response and create recommendations
      try {
        const parsedRecommendations = JSON.parse(aiResponse);
        const formattedRecommendations: Recommendation[] = parsedRecommendations.map((rec: any, index: number) => ({
          category: rec.category,
          advice: rec.advice,
          priority: rec.priority || 'medium',
          icon: getIconForCategory(rec.category, index)
        }));
        
        setRecommendations(formattedRecommendations);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        const fallbackRecommendations = createFallbackRecommendations(weather, aiResponse);
        setRecommendations(fallbackRecommendations);
      }

    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendations. Please check your API key and try again.",
        variant: "destructive",
      });
      
      // Provide basic recommendations as fallback
      setRecommendations(createBasicRecommendations(weather));
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (category: string, index: number) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('clothing') || lowerCategory.includes('wear')) {
      return <Shirt size={20} className="text-primary" />;
    } else if (lowerCategory.includes('umbrella') || lowerCategory.includes('rain')) {
      return <Umbrella size={20} className="text-blue-400" />;
    } else if (lowerCategory.includes('sun') || lowerCategory.includes('uv')) {
      return <Sun size={20} className="text-yellow-400" />;
    } else if (lowerCategory.includes('diet') || lowerCategory.includes('eat') || lowerCategory.includes('food')) {
      return <Utensils size={20} className="text-foreground" />;
    } else if (lowerCategory.includes('sleep') || lowerCategory.includes('rest')) {
      return <Bed size={20} className="text-muted-foreground" />;
    } else if (lowerCategory.includes('health') || lowerCategory.includes('safety')) {
      return <AlertTriangle size={20} className="text-red-400" />;
    } else {
      return <Brain size={20} className="text-purple-400" />;
    }
  };

  const createFallbackRecommendations = (weather: WeatherData, aiText: string): Recommendation[] => {
    const lines = aiText.split('\n').filter(line => line.trim());
    return lines.slice(0, 5).map((line, index) => ({
      category: `Recommendation ${index + 1}`,
      advice: line.trim(),
      priority: 'medium' as const,
      icon: getIconForCategory(`category${index}`, index)
    }));
  };

  const createBasicRecommendations = (weather: WeatherData): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    const temp = weather.current.temp_c;
    const condition = weather.current.condition.text.toLowerCase();
    
    // Clothing recommendation
    if (temp < 10) {
      recommendations.push({
        category: "Clothing",
        advice: "Wear warm layers, coat, gloves, and scarf. It's quite cold outside.",
        icon: <Shirt size={20} className="text-primary" />,
        priority: "high"
      });
    } else if (temp < 20) {
      recommendations.push({
        category: "Clothing",
        advice: "Light jacket or sweater recommended. Layer up for comfort.",
        icon: <Shirt size={20} className="text-primary" />,
        priority: "medium"
      });
    } else {
      recommendations.push({
        category: "Clothing",
        advice: "Light, breathable clothing is perfect for today's weather.",
        icon: <Shirt size={20} className="text-primary" />,
        priority: "low"
      });
    }

    // Rain recommendation
    if (condition.includes('rain') || weather.forecast?.forecastday[0]?.day.daily_chance_of_rain > 50) {
      recommendations.push({
        category: "Rain Protection",
        advice: "Take an umbrella or waterproof jacket. Rain is likely today.",
        icon: <Umbrella size={20} className="text-blue-400" />,
        priority: "high"
      });
    }

    // UV recommendation
    if (weather.current.uv > 6) {
      recommendations.push({
        category: "Sun Protection",
        advice: "High UV levels. Wear sunscreen, hat, and sunglasses when outside.",
        icon: <Sun size={20} className="text-yellow-400" />,
        priority: "high"
      });
    }

    // Diet recommendation
    if (temp >= 26) {
      recommendations.push({
        category: "Diet",
        advice: "Focus on hydration: water, coconut water, fresh fruits; avoid heavy oily foods.",
        icon: <Utensils size={20} className="text-foreground" />,
        priority: "medium"
      });
    } else if (temp <= 10) {
      recommendations.push({
        category: "Diet",
        advice: "Warm soups, herbal tea, and protein-rich meals to keep energy levels up.",
        icon: <Utensils size={20} className="text-foreground" />,
        priority: "medium"
      });
    } else {
      recommendations.push({
        category: "Diet",
        advice: "Balanced meals; include vegetables and lean protein; stay moderately hydrated.",
        icon: <Utensils size={20} className="text-foreground" />,
        priority: "low"
      });
    }

    // Sleep recommendation
    if (temp >= 28 && weather.current.humidity > 70) {
      recommendations.push({
        category: "Sleep",
        advice: "Aim 7–9 hours; cool your room (fan/AC), light bedding, hydrate before bed.",
        icon: <Bed size={20} className="text-muted-foreground" />,
        priority: "medium"
      });
    } else if (temp <= 8) {
      recommendations.push({
        category: "Sleep",
        advice: "Aim 7–9 hours; keep room warm, use layered bedding for comfort.",
        icon: <Bed size={20} className="text-muted-foreground" />,
        priority: "low"
      });
    } else {
      recommendations.push({
        category: "Sleep",
        advice: "Aim 7–9 hours; maintain a consistent schedule and limit late caffeine.",
        icon: <Bed size={20} className="text-muted-foreground" />,
        priority: "low"
      });
    }

    return recommendations;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400/30 bg-red-400/5';
      case 'medium': return 'border-yellow-400/30 bg-yellow-400/5';
      default: return 'border-green-400/30 bg-green-400/5';
    }
  };

  useEffect(() => {
    if (!weather) return;
    generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.location?.name]);

  return (
    <WeatherCard className="p-6 col-span-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="text-primary" size={20} />
          AI Weather Recommendations
        </h3>
        <Button 
          type="button"
          onClick={generateRecommendations}
          disabled={loading}
          variant="default"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Generating...
            </>
          ) : (
            <>
              <Brain className="mr-2" size={16} />
              Get AI Advice
            </>
          )}
        </Button>
      </div>

      <div className="mb-6">
        <AIAskBar weather={weather} />
      </div>

      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {rec.icon}
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">{rec.category}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rec.advice}
                  </p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-400/20 text-red-400' :
                      rec.priority === 'medium' ? 'bg-yellow-400/20 text-yellow-400' :
                      'bg-green-400/20 text-green-400'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length === 0 && !loading && (
        <div className="text-center py-8">
          <Brain className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">
            Click "Get AI Advice" to receive personalized weather recommendations
          </p>
        </div>
      )}
    </WeatherCard>
  );
};