import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, Navigation, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Place {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

interface SearchLocationProps {
  onLocationSelect: (location: string) => void;
  onCurrentLocation: () => void;
  isLoading?: boolean;
}

const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

export const SearchLocation = ({ onLocationSelect, onCurrentLocation, isLoading }: SearchLocationProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<'search' | 'coords'>('search');
  const [coordLat, setCoordLat] = useState("");
  const [coordLon, setCoordLon] = useState("");
  const [coordError, setCoordError] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const detectPlaces = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('weather-proxy', {
          body: { endpoint: 'search', query },
        });

        if (error) throw new Error("API error");

        const places: Place[] = (data || []).map((p: any) => ({
          name: p.name,
          region: p.region || "",
          country: p.country,
          lat: p.lat,
          lon: p.lon
        }));

        setSuggestions(places);
        setShowSuggestions(places.length > 0);
      } catch (err) {
        console.error("Place detection failed:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    detectPlaces(value);
  };

  const handleSelectPlace = (place: Place) => {
    const locationString = `${place.lat},${place.lon}`;
    setSearchQuery(`${place.name}${place.region ? `, ${place.region}` : ""}, ${place.country}`);
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(locationString);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onLocationSelect(searchQuery.trim());
      setSearchQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError("");
    const lat = parseFloat(coordLat);
    const lon = parseFloat(coordLon);
    if (isNaN(lat) || lat < MIN_LATITUDE || lat > MAX_LATITUDE) {
      setCoordError(`Latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}`);
      return;
    }
    if (isNaN(lon) || lon < MIN_LONGITUDE || lon > MAX_LONGITUDE) {
      setCoordError(`Longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}`);
      return;
    }
    onLocationSelect(`${lat},${lon}`);
    setCoordLat("");
    setCoordLon("");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="col-span-full relative" ref={containerRef}>
      {/* Mode toggle tabs */}
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => { setMode('search'); setCoordError(""); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
            mode === 'search'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10'
          }`}
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          <Search size={12} />
          Search Location
        </button>
        <button
          type="button"
          onClick={() => { setMode('coords'); setSuggestions([]); setShowSuggestions(false); setCoordError(""); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
            mode === 'coords'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10'
          }`}
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          <Crosshair size={12} />
          Enter Coordinates
        </button>
      </div>

      {mode === 'coords' ? (
        /* Coordinates Input Mode */
        <div
          className="relative rounded-2xl transition-all duration-500 ease-out bg-black/50 backdrop-blur-2xl border border-white/12 shadow-xl"
        >
          <form onSubmit={handleCoordSubmit} className="flex items-center gap-2 p-2 sm:p-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Crosshair size={16} className="text-primary ml-1" />
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>Coordinates</span>
            </div>
            <input
              type="number"
              placeholder="Latitude (-90 to 90)"
              value={coordLat}
              onChange={(e) => { setCoordLat(e.target.value); setCoordError(""); }}
              step="any"
              disabled={isLoading}
              className="flex-1 min-w-[120px] h-11 px-3 rounded-xl bg-white/5 text-foreground text-sm placeholder:text-white/30 border border-white/10 outline-none focus:border-primary/40 transition-all duration-300"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            />
            <input
              type="number"
              placeholder="Longitude (-180 to 180)"
              value={coordLon}
              onChange={(e) => { setCoordLon(e.target.value); setCoordError(""); }}
              step="any"
              disabled={isLoading}
              className="flex-1 min-w-[120px] h-11 px-3 rounded-xl bg-white/5 text-foreground text-sm placeholder:text-white/30 border border-white/10 outline-none focus:border-primary/40 transition-all duration-300"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            />
            <button
              type="submit"
              disabled={!coordLat.trim() || !coordLon.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
            </button>
            <div className="w-px h-7 bg-white/10 flex-shrink-0" />
            <button
              type="button"
              onClick={onCurrentLocation}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-foreground text-sm transition-all duration-300 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              <Navigation size={14} className="text-primary" />
              <span className="hidden sm:inline">Current Location</span>
              <span className="sm:hidden"><MapPin size={14} /></span>
            </button>
          </form>
          {coordError && (
            <p className="px-4 pb-2.5 text-xs text-red-400" style={{ fontFamily: "'Quicksand', sans-serif" }}>{coordError}</p>
          )}
        </div>
      ) : (
        /* Search bar container */
        <div
          className={`
            relative rounded-2xl transition-all duration-500 ease-out
            bg-black/50 backdrop-blur-2xl
            border
            ${isFocused ? 'border-primary/40 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)]' : 'border-white/12 shadow-xl'}
          `}
        >
          <div className="flex items-center gap-2 p-2 sm:p-2.5">
            {/* Search input area */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search
                  className={`absolute left-3.5 transition-colors duration-300 z-10 ${
                    isFocused ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search for a city or location..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setIsFocused(true);
                    suggestions.length > 0 && setShowSuggestions(true);
                  }}
                  onBlur={() => setIsFocused(false)}
                  disabled={isLoading}
                  className={`
                    w-full h-11 pl-11 pr-4 rounded-xl
                    bg-transparent
                    text-foreground text-sm
                    placeholder:text-white/30
                    border-0 outline-none
                    transition-all duration-300
                  `}
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                />
              </div>

              {/* Search button */}
              <button
                type="submit"
                disabled={!searchQuery.trim() || isLoading}
                className={`
                  flex-shrink-0 w-10 h-10 rounded-xl
                  flex items-center justify-center
                  transition-all duration-300
                  disabled:opacity-30 disabled:cursor-not-allowed
                  ${searchQuery.trim()
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95'
                    : 'bg-white/8 text-white/40'
                  }
                `}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Search size={16} />
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="w-px h-7 bg-white/10 flex-shrink-0" />

            {/* Current Location button */}
            <button
              onClick={onCurrentLocation}
              disabled={isLoading}
              className={`
                flex-shrink-0 flex items-center gap-2
                h-10 px-4 rounded-xl
                border border-white/10
                bg-white/5 hover:bg-white/10
                text-foreground text-sm
                transition-all duration-300
                hover:border-white/20
                disabled:opacity-40 disabled:cursor-not-allowed
                active:scale-95
              `}
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              <Navigation size={14} className="text-primary" />
              <span className="hidden sm:inline">Current Location</span>
              <span className="sm:hidden">
                <MapPin size={14} />
              </span>
            </button>
          </div>

          {/* Subtle animated gradient border on focus */}
          {isFocused && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl opacity-20"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent 40%, transparent 60%, hsl(var(--primary) / 0.15))',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[9999]">
          <div className="bg-black/80 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
            {isSearching && (
              <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground text-sm border-b border-white/5">
                <Loader2 size={14} className="animate-spin" />
                <span style={{ fontFamily: "'Quicksand', sans-serif" }}>Searching...</span>
              </div>
            )}
            {suggestions.map((place, index) => (
              <button
                key={`${place.lat}-${place.lon}-${index}`}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className={`
                  w-full px-4 py-3 text-left
                  hover:bg-primary/10
                  transition-all duration-200
                  flex items-center gap-3
                  group
                  ${index < suggestions.length - 1 ? 'border-b border-white/5' : ''}
                `}
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-primary/15 flex items-center justify-center transition-colors flex-shrink-0">
                  <MapPin size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-semibold text-foreground text-sm truncate"
                    style={{ fontFamily: "'Bodoni Moda', serif" }}
                  >
                    {place.name}
                  </span>
                  <span
                    className="text-xs text-muted-foreground truncate"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                  >
                    {place.region && `${place.region}, `}{place.country}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
