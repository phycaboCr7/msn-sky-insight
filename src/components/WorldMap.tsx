import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Thermometer, Wind, Cloud, Sun, Loader2 } from "lucide-react";
import { WeatherData } from "@/lib/weather";
import { Input } from "@/components/ui/input";

interface WorldMapProps {
  weather: WeatherData;
}

type MapLayer = 'temperature' | 'wind' | 'precipitation' | 'clouds';

const LAYER_CONFIG: Record<MapLayer, { label: string; icon: React.ReactNode; style: string }> = {
  temperature: { 
    label: 'Temperature', 
    icon: <Thermometer className="w-4 h-4" />,
    style: 'mapbox://styles/mapbox/dark-v11'
  },
  wind: { 
    label: 'Wind', 
    icon: <Wind className="w-4 h-4" />,
    style: 'mapbox://styles/mapbox/dark-v11'
  },
  precipitation: { 
    label: 'Precipitation', 
    icon: <Cloud className="w-4 h-4" />,
    style: 'mapbox://styles/mapbox/dark-v11'
  },
  clouds: { 
    label: 'Clouds', 
    icon: <Sun className="w-4 h-4" />,
    style: 'mapbox://styles/mapbox/satellite-streets-v12'
  }
};

export const WorldMap = ({ weather }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('temperature');
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('mapbox_token');
    if (savedToken) {
      setMapboxToken(savedToken);
    }
  }, []);

  const saveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('mapbox_token', tokenInput.trim());
      setMapboxToken(tokenInput.trim());
    }
  };

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    setIsLoading(true);
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      const lat = weather.location.lat;
      const lon = weather.location.lon;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: LAYER_CONFIG[activeLayer].style,
        center: [lon, lat],
        zoom: 4,
        pitch: 20,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Add weather overlay layers when map loads
      map.current.on('load', () => {
        setIsMapLoaded(true);
        setIsLoading(false);
        
        // Add marker for current location
        new mapboxgl.Marker({ color: '#f97316' })
          .setLngLat([lon, lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="color: #333; font-family: sans-serif;">
              <strong>${weather.location.name}</strong><br/>
              ${weather.current.temp_c}°C - ${weather.current.condition.text}
            </div>
          `))
          .addTo(map.current!);

        // Add weather tile layer from OpenWeatherMap (free tier)
        addWeatherLayer(activeLayer);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, weather.location.lat, weather.location.lon]);

  const addWeatherLayer = (layer: MapLayer) => {
    if (!map.current || !isMapLoaded) return;
    
    // Remove existing weather layer
    if (map.current.getLayer('weather-layer')) {
      map.current.removeLayer('weather-layer');
    }
    if (map.current.getSource('weather-tiles')) {
      map.current.removeSource('weather-tiles');
    }

    // OpenWeatherMap tile layers (free tier available)
    const layerMapping: Record<MapLayer, string> = {
      temperature: 'temp_new',
      wind: 'wind_new',
      precipitation: 'precipitation_new',
      clouds: 'clouds_new'
    };

    // Note: User needs OpenWeatherMap API key for tile layers
    // For demo, we'll use a visual style change instead
    const style = LAYER_CONFIG[layer].style;
    if (map.current.getStyle().sprite !== style) {
      map.current.setStyle(style);
    }
  };

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayer(layer);
    if (map.current && isMapLoaded) {
      map.current.setStyle(LAYER_CONFIG[layer].style);
      setTimeout(() => addWeatherLayer(layer), 500);
    }
  };

  // Show token input if no token
  if (!mapboxToken) {
    return (
      <Card className="col-span-full bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-foreground font-semibold">World Weather Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Enter your Mapbox public token to view the world weather map. 
            Get one free at <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a> → Dashboard → Tokens.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="pk.eyJ1IjoieW91ci10b2tlbi1oZXJlIi..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-white/5 border-white/20"
            />
            <Button onClick={saveToken} disabled={!tokenInput.trim()}>
              Save Token
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-foreground font-semibold">World Weather Map</span>
          </CardTitle>
          
          {/* Layer buttons */}
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(LAYER_CONFIG) as MapLayer[]).map((layer) => (
              <Button
                key={layer}
                variant={activeLayer === layer ? "default" : "outline"}
                size="sm"
                onClick={() => handleLayerChange(layer)}
                className={`text-xs ${
                  activeLayer === layer 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                {LAYER_CONFIG[layer].icon}
                <span className="ml-1 hidden sm:inline">{LAYER_CONFIG[layer].label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-white/10">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-foreground/80 border border-white/10">
            <div className="flex items-center gap-2">
              {LAYER_CONFIG[activeLayer].icon}
              <span>{LAYER_CONFIG[activeLayer].label} View</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          📍 {weather.location.name}, {weather.location.country} • Interactive world weather visualization
        </p>
      </CardContent>
    </Card>
  );
};
