import { useState } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send } from "lucide-react";

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

      const systemPrompt = `You are Rakshit's Weatherza AI, a friendly and knowledgeable weather assistant. You have access to the current weather data for ${weatherContext.location}, ${weatherContext.country}.

Current conditions:
- Temperature: ${weatherContext.temperature}°C (feels like ${weatherContext.feelsLike}°C)
- Condition: ${weatherContext.condition}
- Humidity: ${weatherContext.humidity}%
- Wind: ${weatherContext.windSpeed} km/h from ${weatherContext.windDirection}
- UV Index: ${weatherContext.uvIndex}
- Visibility: ${weatherContext.visibility} km
- Pressure: ${weatherContext.pressure} mb
- Rain chance: ${weatherContext.precipChance}%
- Today's high/low: ${weatherContext.maxTemp}°C / ${weatherContext.minTemp}°C
- Air Quality Index: ${weatherContext.aqi || 'N/A'}

Answer the user's weather-related questions in a helpful, concise, and friendly manner. Use bullet points when appropriate. Keep responses under 150 words.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
      setAnswer(text);
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
