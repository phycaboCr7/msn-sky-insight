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
    <WeatherCard className="p-6 col-span-full">
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Search for a city or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!searchQuery.trim() || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          </Button>
        </form>
        
        <Button
          onClick={onCurrentLocation}
          variant="outline"
          disabled={isLoading}
          className="border-border/50 hover:bg-muted/50"
        >
          <MapPin size={18} className="mr-2" />
          Current Location
        </Button>
      </div>
    </WeatherCard>
  );
};