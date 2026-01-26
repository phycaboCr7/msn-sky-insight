import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings, RotateCcw } from "lucide-react";
import type { SliderConfig } from "./types";

interface ParameterSlidersProps {
  sliders: SliderConfig[];
  onSliderChange: (index: number, value: number[]) => void;
  onReset: () => void;
}

export const ParameterSliders = ({ sliders, onSliderChange, onReset }: ParameterSlidersProps) => {
  if (sliders.length === 0) return null;
  
  return (
    <div className="p-4 bg-black/20 rounded-xl border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Interactive Parameters
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs hover:bg-white/10">
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {sliders.map((slider, index) => (
          <div key={slider.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{slider.label}</span>
              <span className="text-primary font-mono font-semibold">{slider.value.toFixed(2)}</span>
            </div>
            <Slider 
              value={[slider.value]} 
              min={slider.min} 
              max={slider.max} 
              step={slider.step} 
              onValueChange={(value) => onSliderChange(index, value)}
              className="cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
