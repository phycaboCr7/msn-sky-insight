import { useState } from "react";
import { WeatherData } from "@/lib/weather";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIAskBarProps { weather: WeatherData; }

export const AIAskBar = ({ weather }: AIAskBarProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const askAI = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
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

      const prompt = `You are a concise weather assistant. Use ONLY this current weather context ${JSON.stringify(weatherInfo)} and answer the user's question in 3-5 bullet points. Be practical and specific to the location. Question: ${question}`;

      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { prompt, type: "text" },
      });

      if (error) throw error;
      setAnswer(data?.text || "No response received.");
    } catch (e) {
      console.error(e);
      toast({ title: "AI error", description: "Failed to get an answer.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          placeholder="Ask about today's weather..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="bg-white/5 border-white/20"
        />
        <Button type="button" onClick={askAI} disabled={loading}>
          {loading ? (<><Loader2 className="mr-2 animate-spin" size={16} /> Asking...</>) : (<><MessageSquare className="mr-2" size={16} /> Ask</>)}
        </Button>
      </div>
      {answer && (
        <div className="mt-3 p-4 rounded-lg border border-primary/20 bg-primary/5 text-sm leading-relaxed">
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{answer}</div>
        </div>
      )}
    </div>
  );
}
