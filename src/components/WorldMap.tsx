import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Thermometer, Wind, Cloud, Sun, Loader2 } from "lucide-react";
import { WeatherData } from "@/lib/weather";

interface WorldMapProps {
  weather: WeatherData;
}

type MapLayer = 'temperature' | 'wind' | 'precipitation' | 'clouds';

const LAYER_CONFIG: Record<MapLayer, { label: string; icon: React.ReactNode; color: string }> = {
  temperature: { 
    label: 'Temperature', 
    icon: <Thermometer className="w-4 h-4" />,
    color: '#ef4444'
  },
  wind: { 
    label: 'Wind', 
    icon: <Wind className="w-4 h-4" />,
    color: '#3b82f6'
  },
  precipitation: { 
    label: 'Precipitation', 
    icon: <Cloud className="w-4 h-4" />,
    color: '#06b6d4'
  },
  clouds: { 
    label: 'Clouds', 
    icon: <Sun className="w-4 h-4" />,
    color: '#f59e0b'
  }
};

// Free MapLibre styles - NO API KEY REQUIRED
const MAP_STYLES = {
  default: 'https://demotiles.maplibre.org/style.json',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark'
};

export const WorldMap = ({ weather }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('temperature');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map - NO API KEY REQUIRED
  useEffect(() => {
    if (!mapContainer.current) return;

    setIsLoading(true);
    
    try {
      const lat = weather.location.lat;
      const lon = weather.location.lon;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLES.liberty,
        center: [lon, lat],
        zoom: 12, // Higher zoom for precise location
        pitch: 30,
        bearing: -15,
        attributionControl: false, // Remove attribution
      });

      map.current.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Disable scroll zoom for smoother experience
      map.current.scrollZoom.disable();

      map.current.on('load', () => {
        setIsMapLoaded(true);
        setIsLoading(false);
        
        // Add pulsing marker for precise current location
        const markerEl = document.createElement('div');
        markerEl.innerHTML = `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              background: #f97316;
              border-radius: 50%;
              animation: pulse-ring 1.5s ease-out infinite;
              opacity: 0.4;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 14px;
              height: 14px;
              background: #f97316;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>
          <style>
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.4; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `;

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="color: #333; font-family: sans-serif; padding: 4px;">
            <strong>${weather.location.name}</strong><br/>
            🌡️ ${weather.current.temp_c}°C<br/>
            ${weather.current.condition.text}
          </div>
        `);

        new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current!);
      });

      map.current.on('error', (e) => {
        console.error('MapLibre error:', e);
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [weather.location.lat, weather.location.lon, weather.location.name, weather.current.temp_c, weather.current.condition.text]);

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayer(layer);
    
    // Switch map style based on layer
    if (map.current && isMapLoaded) {
      const styleUrl = layer === 'clouds' ? MAP_STYLES.dark : MAP_STYLES.liberty;
      map.current.setStyle(styleUrl);
      
      // Re-add marker after style change
      map.current.once('style.load', () => {
        const lat = weather.location.lat;
        const lon = weather.location.lon;
        
        const markerEl = document.createElement('div');
        markerEl.innerHTML = `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              background: ${LAYER_CONFIG[layer].color};
              border-radius: 50%;
              animation: pulse-ring 1.5s ease-out infinite;
              opacity: 0.4;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 14px;
              height: 14px;
              background: ${LAYER_CONFIG[layer].color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="color: #333; font-family: sans-serif; padding: 4px;">
            <strong>${weather.location.name}</strong><br/>
            🌡️ ${weather.current.temp_c}°C<br/>
            ${weather.current.condition.text}
          </div>
        `);

        new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map.current!);
      });
    }
  };

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
          📍 {weather.location.name}, {weather.location.country}
        </p>
      </CardContent>
    </Card>
  );
};
