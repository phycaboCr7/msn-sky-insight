import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WeatherCard } from "./WeatherCard";
import { Search, MapPin, Loader2 } from "lucide-react";

interface Place {
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

interface SearchLocationProps {
  onLocationSelect: (location: string) => void;
  onCurrentLocation: () => void;
  isLoading?: boolean;
}

const API_KEY = "0d2ccdd683b2e6b3cfafff7bd6134d8d";

export const SearchLocation = ({ onLocationSelect, onCurrentLocation, isLoading }: SearchLocationProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const detectPlaces = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
        );

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const places: Place[] = data.map((p: any) => ({
          name: p.name,
          state: p.state || "",
          country: p.country,
          lat: p.lat,
          lon: p.lon
        }));

        setSuggestions(places);
        setShowSuggestions(places.length > 0);
      } catch (err) {
        console.error("Place detection failed:", err);
        setSuggestions([]);
      }
    }, 400);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    detectPlaces(value);
  };

  const handleSelectPlace = (place: Place) => {
    const locationString = `${place.lat},${place.lon}`;
    setSearchQuery(`${place.name}${place.state ? `, ${place.state}` : ""}, ${place.country}`);
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

  // Close dropdown when clicking outside
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
    <WeatherCard className="p-6 col-span-full relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" 
           style={{ backgroundSize: '200% 100%' }} />
      
      <div className="relative z-10 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1 group" ref={containerRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300 z-10" size={18} />
            <Input
              type="text"
              placeholder="Search for a city or location..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="pl-10 bg-white/5 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/10 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-md border border-white/20 rounded-lg shadow-lg z-50 overflow-hidden">
                {suggestions.map((place, index) => (
                  <button
                    key={`${place.lat}-${place.lon}-${index}`}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors duration-200 flex items-center gap-2 border-b border-white/10 last:border-b-0"
                  >
                    <MapPin size={16} className="text-primary shrink-0" />
                    <span className="font-medium" style={{ fontFamily: "'Bodoni Moda', serif" }}>
                      {place.name}
                      {place.state && <span className="text-muted-foreground">, {place.state}</span>}
                      <span className="text-muted-foreground">, {place.country}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!searchQuery.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-glow transition-all duration-300"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          </Button>
        </form>
        
        <Button
          onClick={onCurrentLocation}
          variant="outline"
          disabled={isLoading}
          className="border-white/20 bg-white/5 hover:bg-white/10 text-foreground hover:text-primary backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
        >
          <MapPin size={18} className="mr-2" />
          Current Location
        </Button>
      </div>
    </WeatherCard>
  );
};