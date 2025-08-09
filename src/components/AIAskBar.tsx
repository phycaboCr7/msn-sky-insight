import { useState } from "react";
import { WeatherData } from "@/lib/weather";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";

interface AIAskBarProps { weather: WeatherData; apiKey?: string; }

export const AIAskBar = ({ weather, apiKey }: AIAskBarProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const apiKeyToUse = (typeof window !== 'undefined' && (localStorage.getItem('gemini_api_key') || "")) || "";
  const effectiveKey = (typeof window !== 'undefined' ? (apiKey || undefined) : undefined) ?? apiKeyToUse;

  const askAI = async () => {
    if (!effectiveKey) {
      toast({ title: "API Key Required", description: "Save your Gemini API key to ask questions.", variant: "destructive" });
      return;
    }
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${effectiveKey}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, topK: 40, topP: 0.95, maxOutputTokens: 512 }
        })
      });

      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setAnswer(text);
    } catch (e) {
      console.error(e);
      toast({ title: "AI error", description: "Failed to get an answer. Check your API key.", variant: "destructive" });
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
