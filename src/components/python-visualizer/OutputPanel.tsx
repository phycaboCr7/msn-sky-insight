import { useRef } from "react";
import type { ExecutionType } from "./types";

interface OutputPanelProps {
  output: string;
  error: string | null;
  imageData: string | null;
  animationFrames: string[];
  currentFrame: number;
  videoBlob: Blob | null;
  executionType: ExecutionType;
}

export const OutputPanel = ({
  output,
  error,
  imageData,
  animationFrames,
  currentFrame,
  videoBlob,
  executionType,
}: OutputPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  return (
    <div className="space-y-4">
      {/* Text output */}
      {output && (
        <div className="bg-black/30 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            📤 Output:
          </h4>
          <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
            ❌ Error:
          </h4>
          <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}
      
      {/* Graph/Animation image output */}
      {(imageData || animationFrames.length > 0) && (
        <div className="bg-black/30 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            {executionType === "ANIMATION" && "🎞️ Animation"}
            {executionType === "TURTLE" && "🐢 Turtle Graphics"}
            {executionType === "STATIC_GRAPH" && "📊 Graph"}
            {executionType === "SIMULATION" && "🔬 Simulation"}
            {executionType === "TEXT_ONLY" && "📊 Output"}
            {animationFrames.length > 1 && (
              <span className="text-xs text-purple-400 ml-2">
                Frame {currentFrame + 1}/{animationFrames.length}
              </span>
            )}
          </h4>
          <div className="flex justify-center bg-black/20 rounded-lg p-2">
            <img 
              src={animationFrames.length > 0 ? animationFrames[currentFrame] : imageData!} 
              alt="Output" 
              className="max-w-full max-h-[450px] rounded-lg shadow-xl border border-white/5"
            />
          </div>
        </div>
      )}
      
      {/* Video preview */}
      {videoBlob && (
        <div className="bg-black/30 p-4 rounded-xl border border-orange-500/20">
          <h4 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
            🎬 Video Preview:
          </h4>
          <div className="flex justify-center bg-black/20 rounded-lg p-2">
            <video 
              ref={videoRef}
              src={URL.createObjectURL(videoBlob)} 
              controls 
              autoPlay 
              loop 
              className="max-w-full max-h-[400px] rounded-lg shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
