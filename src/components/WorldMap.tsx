import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Thermometer, Wind, Cloud, Droplets, Loader2, MapPin, Sun, Moon } from "lucide-react";
import { WeatherData } from "@/lib/weather";

interface WorldMapProps {
  weather: WeatherData;
}

type MapLayer = 'temperature' | 'wind' | 'precipitation' | 'clouds';

const LAYER_CONFIG: Record<MapLayer, { label: string; icon: React.ReactNode; color: string }> = {
  temperature: { label: 'Temperature', icon: <Thermometer className="w-3.5 h-3.5" />, color: '#ef4444' },
  wind: { label: 'Wind', icon: <Wind className="w-3.5 h-3.5" />, color: '#3b82f6' },
  precipitation: { label: 'Precipitation', icon: <Droplets className="w-3.5 h-3.5" />, color: '#06b6d4' },
  clouds: { label: 'Clouds', icon: <Cloud className="w-3.5 h-3.5" />, color: '#f59e0b' },
};

const MAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const createMarkerElement = (color: string) => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="position: relative; width: 28px; height: 28px;">
      <div style="
        position: absolute; width: 28px; height: 28px;
        background: ${color}; border-radius: 50%;
        animation: pulse-ring 1.5s ease-out infinite; opacity: 0.35;
      "></div>
      <div style="
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 14px; height: 14px; background: ${color};
        border: 2.5px solid white; border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      "></div>
    </div>
    <style>@keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.35; } 100% { transform: scale(2.2); opacity: 0; } }</style>
  `;
  return el;
};

const createPopup = (weather: WeatherData) => {
  return new maplibregl.Popup({ offset: 20, closeButton: false, className: 'weather-map-popup' }).setHTML(`
    <div style="background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); color: #fff; 
      font-family: 'Bodoni Moda', Georgia, serif; padding: 10px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12); min-width: 140px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${weather.location.name}</div>
      <div style="display: flex; align-items: baseline; gap: 6px;">
        <span style="font-size: 22px; font-weight: 600;">${Math.round(weather.current.temp_c)}°C</span>
        <span style="font-size: 11px; color: rgba(255,255,255,0.6);">${weather.current.condition.text}</span>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 6px; font-size: 10px; color: rgba(255,255,255,0.5);">
        <span>💨 ${weather.current.wind_kph} km/h</span>
        <span>💧 ${weather.current.humidity}%</span>
      </div>
    </div>
  `);
};

export const WorldMap = ({ weather }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('temperature');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;
    setIsLoading(true);

    try {
      const { lat, lon } = weather.location;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLES.dark,
        center: [lon, lat],
        zoom: 12,
        pitch: 35,
        bearing: -10,
        attributionControl: false,
      });

      map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.current.scrollZoom.disable();

      map.current.on('load', () => {
        setIsMapLoaded(true);
        setIsLoading(false);

        const marker = new maplibregl.Marker({ element: createMarkerElement(LAYER_CONFIG.temperature.color), anchor: 'center' })
          .setLngLat([lon, lat])
          .setPopup(createPopup(weather))
          .addTo(map.current!);
        
        marker.togglePopup();
      });

      map.current.on('error', () => setIsLoading(false));
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
    }

    return () => { map.current?.remove(); };
  }, [weather.location.lat, weather.location.lon, weather.location.name, weather.current.temp_c, weather.current.condition.text]);

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayer(layer);
    if (!map.current || !isMapLoaded) return;

    map.current.once('style.load', () => {
      const { lat, lon } = weather.location;
      const marker = new maplibregl.Marker({ element: createMarkerElement(LAYER_CONFIG[layer].color), anchor: 'center' })
        .setLngLat([lon, lat])
        .setPopup(createPopup(weather))
        .addTo(map.current!);
      marker.togglePopup();
    });

    map.current.setStyle(MAP_STYLES.dark);
  };

  return (
    <Card className="col-span-full bg-black/45 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-white/10">
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-foreground font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>World Weather Map</span>
          </CardTitle>
          
          <div className="flex gap-1">
            {(Object.keys(LAYER_CONFIG) as MapLayer[]).map((layer) => (
              <Button
                key={layer}
                variant={activeLayer === layer ? "default" : "ghost"}
                size="sm"
                onClick={() => handleLayerChange(layer)}
                className={`text-[11px] h-8 px-2.5 rounded-lg transition-all duration-300 ${
                  activeLayer === layer 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {LAYER_CONFIG[layer].icon}
                <span className="ml-1 hidden sm:inline">{LAYER_CONFIG[layer].label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="relative w-full h-[350px] sm:h-[420px] rounded-xl overflow-hidden border border-white/10">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading map...</span>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Active layer badge */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: LAYER_CONFIG[activeLayer].color }} />
            <span className="text-foreground/80 font-medium">{LAYER_CONFIG[activeLayer].label} View</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          <MapPin className="w-3 h-3 text-primary" />
          <p className="text-xs text-muted-foreground">
            {weather.location.name}, {weather.location.country}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
