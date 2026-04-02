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
    <div className="p-4 rounded-xl space-y-4" style={{
      background: 'rgba(139, 92, 246, 0.04)',
      border: '1px solid rgba(139, 92, 246, 0.12)',
    }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#c4b5fd' }}>
          <Settings className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          Interactive Parameters
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs hover:bg-white/10" style={{ color: '#94a3b8' }}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {sliders.map((slider, index) => (
          <div key={slider.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: '#94a3b8' }}>{slider.label}</span>
              <span className="font-mono font-bold" style={{ color: '#8b5cf6' }}>{slider.value.toFixed(2)}</span>
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
