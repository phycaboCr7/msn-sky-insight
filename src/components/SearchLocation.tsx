import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WeatherCard } from "./WeatherCard";
import { Search, MapPin, Loader2, Sparkles } from "lucide-react";

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

const WEATHER_API_KEY = "424a0fbacc0b4291bdd40124250208";

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
        const res = await fetch(
          `https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}`
        );

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const places: Place[] = data.map((p: any) => ({
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
      <WeatherCard className="p-6 sm:p-8 relative overflow-visible group">
        {/* Animated gradient border on focus */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
        </div>
        
        <div className="relative z-10">
          {/* Premium label */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary/70" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Search Location
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSubmit} className="flex-1 flex gap-3">
              <div className="relative flex-1 group/input">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 z-10 ${isFocused ? 'text-primary scale-110' : 'text-muted-foreground'}`} size={18} />
                <Input
                  type="text"
                  placeholder="Search for a city or location..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setIsFocused(true);
                    suggestions.length > 0 && setShowSuggestions(true);
                  }}
                  onBlur={() => setIsFocused(false)}
                  className="pl-12 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 transition-all duration-500 text-foreground placeholder:text-muted-foreground/60 rounded-xl text-base"
                  disabled={isLoading}
                />
                {/* Glow effect on focus */}
                <div className={`absolute inset-0 rounded-xl transition-opacity duration-500 pointer-events-none ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_hsl(32_100%_55%/0.15)]" />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={!searchQuery.trim() || isLoading}
                className="h-12 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-[0_0_30px_hsl(32_100%_55%/0.4)] transition-all duration-500 rounded-xl btn-premium"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              </Button>
            </form>
            
            <Button
              onClick={onCurrentLocation}
              variant="outline"
              disabled={isLoading}
              className="h-12 px-6 border-white/15 bg-white/5 hover:bg-white/10 text-foreground hover:text-primary backdrop-blur-sm transition-all duration-500 hover:shadow-lg hover:border-primary/30 rounded-xl btn-premium"
            >
              <MapPin size={18} className="mr-2" />
              <span className="hidden sm:inline">Current Location</span>
              <span className="sm:hidden">My Location</span>
            </Button>
          </div>
        </div>
      </WeatherCard>
      
      {/* Premium Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-6 right-6 sm:right-auto sm:w-[calc(100%-280px)] top-full mt-2 glass-card rounded-xl shadow-elevation z-[9999] overflow-hidden max-h-80 overflow-y-auto border border-white/10">
          <div className="p-2">
            {suggestions.map((place, index) => (
              <button
                key={`${place.lat}-${place.lon}-${index}`}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-all duration-300 rounded-lg group/item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                    <MapPin className="w-4 h-4 text-primary/70" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground font-bodoni">
                      {place.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {place.region && `${place.region}, `}{place.country}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};