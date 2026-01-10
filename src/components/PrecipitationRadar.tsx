import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudRain, Play, Pause, RotateCcw } from "lucide-react";
import { WeatherData } from "@/lib/weather";

interface PrecipitationRadarProps {
  weather: WeatherData;
}

export const PrecipitationRadar = ({ weather }: PrecipitationRadarProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  
  const lat = weather.location.lat;
  const lon = weather.location.lon;
  
  // RainViewer API provides free precipitation radar
  const [radarFrames, setRadarFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch radar frames from RainViewer API
  useEffect(() => {
    const fetchRadarData = async () => {
      try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await response.json();
        
        // Get past radar frames (historical data)
        const pastFrames = data.radar.past.slice(-6); // Last 6 frames
        const nowcastFrames = data.radar.nowcast?.slice(0, 3) || []; // Future predictions
        
        const allFrames = [...pastFrames, ...nowcastFrames].map((frame: any) => 
          `https://tilecache.rainviewer.com${frame.path}/256/${Math.floor(lat / 10) + 8}/${Math.floor(lon / 10) + 8}/2/1_1.png`
        );
        
        setRadarFrames(allFrames);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch radar data:", error);
        setLoading(false);
      }
    };
    
    fetchRadarData();
  }, [lat, lon]);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying || radarFrames.length === 0) return;
    
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % radarFrames.length);
    }, 800);
    
    return () => clearInterval(interval);
  }, [isPlaying, radarFrames.length]);
  
  // Calculate precipitation intensity for visualization
  const precipChance = weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0;
  const precipAmount = weather.forecast?.forecastday[0]?.day.totalprecip_mm || 0;
  
  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <CloudRain className="w-5 h-5 text-blue-400" />
            <span style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
              Precipitation Radar
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFrameIndex(0)}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animated Radar Map */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10">
          {/* Base map layer - stylized grid */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 200 200" className="w-full h-full opacity-20">
              {/* Grid lines */}
              {[...Array(10)].map((_, i) => (
                <g key={i}>
                  <line x1={i * 20} y1="0" x2={i * 20} y2="200" stroke="white" strokeWidth="0.5" />
                  <line x1="0" y1={i * 20} x2="200" y2={i * 20} stroke="white" strokeWidth="0.5" />
                </g>
              ))}
              {/* Center crosshair */}
              <circle cx="100" cy="100" r="3" fill="white" />
              <circle cx="100" cy="100" r="30" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
            </svg>
          </div>
          
          {/* Animated precipitation clouds */}
          <div className="absolute inset-0 flex items-center justify-center">
            {precipChance > 0 ? (
              <div className="relative w-full h-full">
                {/* Multiple animated cloud/rain blobs */}
                {[...Array(Math.ceil(precipChance / 20))].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full animate-pulse"
                    style={{
                      width: `${30 + Math.random() * 40}%`,
                      height: `${30 + Math.random() * 40}%`,
                      left: `${10 + (i * 25) % 60}%`,
                      top: `${10 + (i * 20) % 60}%`,
                      background: `radial-gradient(circle, 
                        ${precipAmount > 5 ? 'rgba(239, 68, 68, 0.4)' : precipAmount > 2 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.4)'} 0%, 
                        ${precipAmount > 5 ? 'rgba(239, 68, 68, 0.1)' : precipAmount > 2 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)'} 70%, 
                        transparent 100%)`,
                      animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
                
                {/* Rain drops animation */}
                {precipAmount > 0 && (
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(Math.min(precipAmount * 3, 20))].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-0.5 bg-blue-400/60 rounded-full"
                        style={{
                          height: `${10 + Math.random() * 15}px`,
                          left: `${Math.random() * 100}%`,
                          top: `-20px`,
                          animation: `rainfall ${0.5 + Math.random() * 0.5}s linear infinite`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground/50">
                <CloudRain className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No precipitation expected</p>
              </div>
            )}
          </div>
          
          {/* Location marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-ping absolute" />
              <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg relative z-10" />
            </div>
          </div>
          
          {/* Frame indicator */}
          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            {radarFrames.length > 0 ? (
              radarFrames.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    i === frameIndex ? 'bg-primary' : 'bg-white/20'
                  }`}
                />
              ))
            ) : (
              <div className="flex-1 h-1 rounded-full bg-primary/50 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Legend and Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Intensity Scale</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Light</span>
              <span>Heavy</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Today's Forecast</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{precipChance}%</span>
              <span className="text-muted-foreground text-xs">chance</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {precipAmount > 0 ? `${precipAmount.toFixed(1)}mm expected` : 'No rain expected'}
            </p>
          </div>
        </div>
        
        {/* Location info */}
        <div className="text-center pt-2 border-t border-white/10">
          <p className="text-xs text-muted-foreground">
            📍 {weather.location.name}, {weather.location.country}
          </p>
        </div>
      </CardContent>
      
      {/* CSS for rainfall animation */}
      <style>{`
        @keyframes rainfall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px);
            opacity: 0;
          }
        }
      `}</style>
    </Card>
  );
};
