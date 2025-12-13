import { useState } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherzaAIProps {
  weather: WeatherData;
}

export const WeatherzaAI = ({ weather }: WeatherzaAIProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const askAI = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    
    try {
      const weatherContext = {
        location: weather.location.name,
        country: weather.location.country,
        temperature: weather.current.temp_c,
        feelsLike: weather.current.feelslike_c,
        condition: weather.current.condition.text,
        humidity: weather.current.humidity,
        windSpeed: weather.current.wind_kph,
        windDirection: weather.current.wind_dir,
        uvIndex: weather.current.uv,
        visibility: weather.current.vis_km,
        pressure: weather.current.pressure_mb,
        precipChance: weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0,
        maxTemp: weather.forecast?.forecastday[0]?.day.maxtemp_c,
        minTemp: weather.forecast?.forecastday[0]?.day.mintemp_c,
        aqi: weather.current.air_quality?.['us-epa-index']
      };

      const { data, error } = await supabase.functions.invoke('weatherza-chat', {
        body: { question, weatherContext }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to get AI response");
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limit",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      setAnswer(data.answer || "Sorry, I couldn't generate a response.");
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        title: "AI Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  return (
    <Card className="col-span-full glass-card border-white/10 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 animate-glow">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent font-semibold">
            Rakshit's Weatherza AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Textarea
            placeholder="Ask me anything about the weather..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white/5 border-white/20 min-h-[60px] max-h-[120px] resize-none focus:border-primary/50 transition-colors"
            rows={2}
          />
          <Button 
            onClick={askAI} 
            disabled={loading || !question.trim()}
            className="px-4 self-end bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {answer && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20 animate-fade-in">
            <div className="prose prose-invert prose-sm max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {answer}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
