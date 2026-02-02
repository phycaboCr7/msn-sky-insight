import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Video, Download, Loader2 } from "lucide-react";
import { CanvasVideoRecorder } from "./CanvasVideoRecorder";

interface LiveCanvasProps {
  frames: string[];
  fps?: number;
  autoPlay?: boolean;
  onVideoReady?: (blob: Blob) => void;
}

export const LiveCanvas = ({ 
  frames, 
  fps = 24, 
  autoPlay = false,
  onVideoReady 
}: LiveCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameIndexRef = useRef(0);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  
  const frameDuration = 1000 / fps;
  
  // Draw a frame to canvas
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[frameIndex]) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Clear with dark background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Scale and center
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
    img.src = frames[frameIndex];
  }, [frames]);
  
  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying) return;
    
    const elapsed = timestamp - lastTimeRef.current;
    
    if (elapsed >= frameDuration) {
      frameIndexRef.current = (frameIndexRef.current + 1) % frames.length;
      setCurrentFrame(frameIndexRef.current);
      drawFrame(frameIndexRef.current);
      lastTimeRef.current = timestamp;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, frames.length, frameDuration, drawFrame]);
  
  // Start/stop animation
  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate, frames.length]);
  
  // Draw first frame on mount
  useEffect(() => {
    if (frames.length > 0) {
      drawFrame(0);
    }
  }, [frames, drawFrame]);
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const reset = () => {
    frameIndexRef.current = 0;
    setCurrentFrame(0);
    drawFrame(0);
    setIsPlaying(false);
  };
  
  // Record animation as video
  const recordVideo = async () => {
    if (frames.length < 2) return;
    
    setIsRecording(true);
    setIsPlaying(false);
    setRecordProgress(0);
    
    try {
      const recorder = new CanvasVideoRecorder(800, 600);
      const blob = await recorder.recordFramesLive(frames, fps, setRecordProgress);
      setVideoBlob(blob);
      onVideoReady?.(blob);
    } catch (err) {
      console.error("Recording failed:", err);
    } finally {
      setIsRecording(false);
    }
  };
  
  const downloadVideo = () => {
    if (!videoBlob) return;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animation-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (frames.length === 0) return null;
  
  return (
    <div className="space-y-3">
      {/* Canvas display */}
      <div className="relative bg-black/30 rounded-xl p-2 border border-white/10">
        <canvas 
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full max-h-[400px] object-contain rounded-lg"
        />
        
        {/* Frame counter */}
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 rounded text-xs text-white/80">
          Frame {currentFrame + 1} / {frames.length}
        </div>
        
        {/* Recording overlay */}
        {isRecording && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-2" />
              <div className="text-white font-medium">Recording...</div>
              <div className="text-white/70 text-sm">{recordProgress}%</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlay}
          disabled={frames.length < 2 || isRecording}
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          {isPlaying ? (
            <><Pause className="w-4 h-4 mr-1" /> Pause</>
          ) : (
            <><Play className="w-4 h-4 mr-1" /> Play</>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={isRecording}
          className="border-white/20 hover:bg-white/10"
        >
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={recordVideo}
          disabled={frames.length < 2 || isRecording}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Video className="w-4 h-4 mr-1" />
          {isRecording ? `Recording ${recordProgress}%` : "Record Video"}
        </Button>
        
        {videoBlob && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadVideo}
            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
          >
            <Download className="w-4 h-4 mr-1" /> Download Video
          </Button>
        )}
      </div>
      
      {/* Video preview */}
      {videoBlob && (
        <div className="bg-black/30 p-3 rounded-xl border border-green-500/20">
          <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
            🎬 Video Preview (MediaRecorder Output):
          </h4>
          <video 
            src={URL.createObjectURL(videoBlob)} 
            controls 
            autoPlay 
            loop 
            className="w-full max-h-[300px] rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
