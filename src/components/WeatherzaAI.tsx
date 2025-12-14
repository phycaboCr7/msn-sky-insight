import { useState } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface WeatherzaAIProps {
  weather: WeatherData;
}

// Calculate actual AQI from PM2.5
const calculateAQI = (pm25: number): number => {
  const breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

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
      const pm25 = weather.current.air_quality?.pm2_5;
      const actualAQI = pm25 ? calculateAQI(pm25) : null;

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
        aqi: actualAQI,
        pm25: pm25
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
            <div className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed weatherza-markdown">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mb-3 mt-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mb-2 mt-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mb-2 mt-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 text-foreground/90 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                  ul: ({ children }) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/90">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground/90 flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>{children}</span></li>,
                  code: ({ children }) => <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono text-sm">{children}</code>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-foreground/70">{children}</blockquote>,
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
