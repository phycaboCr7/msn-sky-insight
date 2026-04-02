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
        <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#94a3b8' }}>
            📤 Output:
          </h4>
          <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: '#a5f3fc' }}>{output}</pre>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: '#f87171' }}>
            ❌ Error:
          </h4>
          <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: '#fca5a5' }}>{error}</pre>
        </div>
      )}
      
      {/* Graph/Animation image output */}
      {(imageData || animationFrames.length > 0) && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#c4b5fd' }}>
            {executionType === "ANIMATION" && "🎞️ Animation"}
            {executionType === "TURTLE" && "🐢 Turtle Graphics"}
            {executionType === "STATIC_GRAPH" && "📊 Graph"}
            {executionType === "SIMULATION" && "🔬 Simulation"}
            {executionType === "TEXT_ONLY" && "📊 Output"}
            {animationFrames.length > 1 && (
              <span className="text-xs ml-2" style={{ color: '#a78bfa' }}>
                Frame {currentFrame + 1}/{animationFrames.length}
              </span>
            )}
          </h4>
          <div className="flex justify-center rounded-lg p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <img 
              src={animationFrames.length > 0 ? animationFrames[currentFrame] : imageData!} 
              alt="Output" 
              className="max-w-full max-h-[450px] rounded-lg"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(139, 92, 246, 0.08)', border: '1px solid rgba(255,255,255,0.05)' }}
            />
          </div>
        </div>
      )}
      
      {/* Video preview */}
      {videoBlob && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(249, 115, 22, 0.04)', border: '1px solid rgba(249, 115, 22, 0.12)' }}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#fdba74' }}>
            🎬 Video Preview:
          </h4>
          <div className="flex justify-center rounded-lg p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
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
