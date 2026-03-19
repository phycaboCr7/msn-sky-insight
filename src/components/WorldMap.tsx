import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Thermometer, Wind, Cloud, Droplets, Loader2, MapPin, Sun, Moon, Search, X, Landmark } from "lucide-react";
import { WeatherData } from "@/lib/weather";

interface WorldMapProps {
  weather: WeatherData;
}

type MapLayer = 'temperature' | 'wind' | 'precipitation' | 'clouds';

interface PoiResult {
  name: string;
  lat: number;
  lon: number;
  type: string;
  displayName: string;
}

interface NominatimResult {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

const COORDINATE_MATCH_TOLERANCE = 0.0001; // ~11 m precision, sufficient for marker lookup

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

const createPoiMarkerElement = () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 18px; height: 18px; background: #f59e0b;
        border: 2.5px solid white; border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
      ">
        <svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
          <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/>
          <polyline points='9 22 9 12 15 12 15 22'/>
        </svg>
      </div>
    </div>
  `;
  return el;
};

const createPoiPopup = (poi: PoiResult) => {
  return new maplibregl.Popup({ offset: 16, closeButton: true, className: 'weather-map-popup' }).setHTML(`
    <div style="background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); color: #fff;
      font-family: 'Bodoni Moda', Georgia, serif; padding: 10px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12); min-width: 140px; max-width: 200px;">
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; line-height: 1.3;">${poi.name}</div>
      <div style="font-size: 10px; color: rgba(255,255,255,0.5); font-family: 'Quicksand', sans-serif;">${poi.type}</div>
    </div>
  `);
};

export const WorldMap = ({ weather }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('temperature');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMap, setIsDarkMap] = useState(true);
  const [poiQuery, setPoiQuery] = useState("");
  const [isPoiSearching, setIsPoiSearching] = useState(false);
  const [poiResults, setPoiResults] = useState<PoiResult[]>([]);
  const [showPoiList, setShowPoiList] = useState(false);
  const [poiError, setPoiError] = useState("");
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);

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

  const addMarkerToMap = (color: string) => {
    if (!map.current) return;
    const { lat, lon } = weather.location;
    const marker = new maplibregl.Marker({ element: createMarkerElement(color), anchor: 'center' })
      .setLngLat([lon, lat])
      .setPopup(createPopup(weather))
      .addTo(map.current);
    marker.togglePopup();
  };

  const handleLayerChange = (layer: MapLayer) => {
    setActiveLayer(layer);
    if (!map.current || !isMapLoaded) return;
    map.current.once('style.load', () => addMarkerToMap(LAYER_CONFIG[layer].color));
    map.current.setStyle(isDarkMap ? MAP_STYLES.dark : MAP_STYLES.liberty);
  };

  const toggleMapTheme = () => {
    const newDark = !isDarkMap;
    setIsDarkMap(newDark);
    if (!map.current || !isMapLoaded) return;
    map.current.once('style.load', () => addMarkerToMap(LAYER_CONFIG[activeLayer].color));
    map.current.setStyle(newDark ? MAP_STYLES.dark : MAP_STYLES.liberty);
  };

  const clearPoiMarkers = () => {
    poiMarkersRef.current.forEach(m => m.remove());
    poiMarkersRef.current = [];
  };

  const searchPlacesOfInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poiQuery.trim() || !map.current) return;
    setIsPoiSearching(true);
    setPoiError("");
    setPoiResults([]);
    setShowPoiList(false);
    clearPoiMarkers();

    try {
      const { lat, lon } = weather.location;
      const viewbox = `${lon - 1},${lat + 1},${lon + 1},${lat - 1}`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(poiQuery)}&format=json&limit=10&viewbox=${viewbox}&bounded=0&extratags=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Weatherza/1.0' } });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      if (!data || data.length === 0) {
        setPoiError('No places found. Try a different search term.');
        setIsPoiSearching(false);
        return;
      }

      const results: PoiResult[] = data.slice(0, 10).map((item: NominatimResult) => ({
        name: item.name || item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type || item.class || 'place',
        displayName: item.display_name,
      }));

      setPoiResults(results);
      setShowPoiList(true);

      // Add markers to the map
      results.forEach((poi) => {
        const marker = new maplibregl.Marker({ element: createPoiMarkerElement(), anchor: 'center' })
          .setLngLat([poi.lon, poi.lat])
          .setPopup(createPoiPopup(poi))
          .addTo(map.current!);
        poiMarkersRef.current.push(marker);
      });

      // Fit map to show all markers
      if (results.length === 1) {
        map.current.flyTo({ center: [results[0].lon, results[0].lat], zoom: 15, speed: 1.2 });
      } else {
        const bounds = new maplibregl.LngLatBounds();
        results.forEach(poi => bounds.extend([poi.lon, poi.lat]));
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1200 });
      }
    } catch (err) {
      console.error('POI search failed:', err);
      setPoiError('Search failed. Please try again.');
    } finally {
      setIsPoiSearching(false);
    }
  };

  const flyToPoiResult = (poi: PoiResult) => {
    if (!map.current) return;
    map.current.flyTo({ center: [poi.lon, poi.lat], zoom: 16, speed: 1.2 });
    const marker = poiMarkersRef.current.find(
      m => Math.abs(m.getLngLat().lat - poi.lat) < COORDINATE_MATCH_TOLERANCE && Math.abs(m.getLngLat().lng - poi.lon) < COORDINATE_MATCH_TOLERANCE
    );
    if (marker) marker.togglePopup();
    setShowPoiList(false);
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
        {/* Places of Interest Search */}
        <div className="mb-3 relative">
          <form onSubmit={searchPlacesOfInterest} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-3 flex-1 focus-within:border-amber-500/40 transition-all duration-300">
              <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search monuments & places of interest in this area..."
                value={poiQuery}
                onChange={(e) => { setPoiQuery(e.target.value); setPoiError(""); }}
                className="flex-1 h-9 bg-transparent text-foreground text-xs placeholder:text-white/30 border-0 outline-none"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              />
              {poiQuery && (
                <button
                  type="button"
                  onClick={() => { setPoiQuery(""); setPoiResults([]); setShowPoiList(false); clearPoiMarkers(); setPoiError(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!poiQuery.trim() || isPoiSearching}
              className="flex-shrink-0 h-9 px-3 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              {isPoiSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Find Places</span>
            </button>
          </form>

          {poiError && (
            <p className="text-xs text-amber-400/80 mt-1.5 px-1" style={{ fontFamily: "'Quicksand', sans-serif" }}>{poiError}</p>
          )}

          {/* POI Results List */}
          {showPoiList && poiResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-[999] bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                  {poiResults.length} place{poiResults.length !== 1 ? 's' : ''} found — click to zoom in
                </span>
                <button onClick={() => setShowPoiList(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
              {poiResults.map((poi, i) => (
                <button
                  key={`${poi.lat}-${poi.lon}-${i}`}
                  type="button"
                  onClick={() => flyToPoiResult(poi)}
                  className="w-full px-3 py-2.5 text-left hover:bg-amber-500/10 transition-all duration-200 flex items-center gap-2.5 group border-b border-white/5 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Landmark className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate" style={{ fontFamily: "'Bodoni Moda', serif" }}>{poi.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate capitalize" style={{ fontFamily: "'Quicksand', sans-serif" }}>{poi.type}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-full h-[350px] sm:h-[420px] rounded-xl overflow-hidden border border-white/10">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading map...</span>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Dark/Light toggle */}
          <button
            onClick={toggleMapTheme}
            className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
            title={isDarkMap ? 'Switch to light map' : 'Switch to dark map'}
          >
            {isDarkMap ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
          
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
