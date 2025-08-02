import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WeatherCard } from "./WeatherCard";
import { Search, MapPin, Loader2 } from "lucide-react";

interface SearchLocationProps {
  onLocationSelect: (location: string) => void;
  onCurrentLocation: () => void;
  isLoading?: boolean;
}

export const SearchLocation = ({ onLocationSelect, onCurrentLocation, isLoading }: SearchLocationProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onLocationSelect(searchQuery.trim());
      setSearchQuery("");
    }
  };

  return (
    <WeatherCard className="p-6 col-span-full relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" 
           style={{ backgroundSize: '200% 100%' }} />
      
      <div className="relative z-10 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" size={18} />
            <Input
              type="text"
              placeholder="Search for a city or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/10 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
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