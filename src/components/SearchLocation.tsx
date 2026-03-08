import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WeatherCard } from "./WeatherCard";
import { Search, MapPin, Loader2 } from "lucide-react";
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

export const SearchLocation = ({ onLocationSelect, onCurrentLocation, isLoading }: SearchLocationProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="col-span-full relative" ref={containerRef}>
      <WeatherCard className="p-4 sm:p-6 relative overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none rounded-lg" 
             style={{ backgroundSize: '200% 100%' }} />
        
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <div className={`relative flex-1 group rounded-full transition-all duration-300 search-inner-glow ${isFocused ? 'ring-1 ring-primary/30' : ''}`}>
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300 z-10 ${!isFocused && !searchQuery ? 'animate-search-bounce' : ''}`} size={18} />
              <Input
                type="text"
                placeholder="Search for a city or location..."
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => { setIsFocused(true); suggestions.length > 0 && setShowSuggestions(true); }}
                onBlur={() => setIsFocused(false)}
                className="pl-11 pr-4 bg-white/5 backdrop-blur-sm border-white/15 focus:border-primary/40 focus:bg-white/10 transition-all duration-300 text-foreground placeholder:text-muted-foreground rounded-full h-11"
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!searchQuery.trim() || isLoading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-glow transition-all duration-300 rounded-full h-11 px-5"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </Button>
          </form>
          
          <Button
            onClick={onCurrentLocation}
            variant="outline"
            disabled={isLoading}
            className="border-white/15 bg-white/5 hover:bg-white/10 text-foreground hover:text-primary backdrop-blur-sm transition-all duration-300 hover:shadow-lg rounded-full h-11"
          >
            <MapPin size={18} className="mr-2" />
            Current Location
          </Button>
        </div>
      </WeatherCard>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-6 right-6 sm:right-auto sm:w-[calc(100%-250px)] top-full mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-[9999] overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.map((place, index) => (
            <button
              key={`${place.lat}-${place.lon}-${index}`}
              type="button"
              onClick={() => handleSelectPlace(place)}
              className="w-full px-4 py-3 text-left hover:bg-primary/20 transition-colors duration-200 border-b border-white/5 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                  {place.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {place.region && `${place.region}, `}{place.country}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};