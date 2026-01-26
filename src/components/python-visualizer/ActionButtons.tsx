import { Button } from "@/components/ui/button";
import { Play, Film, Video, Turtle, Loader2 } from "lucide-react";
import type { ExecutionType } from "./types";

interface ActionButtonsProps {
  executionType: ExecutionType;
  pyodideReady: boolean;
  running: boolean;
  hasAnimationFrames: boolean;
  recordingAnimation: boolean;
  animationProgress: number;
  onRun: () => void;
  onRunAnimation: () => void;
  onCreateVideo: () => void;
}

export const ActionButtons = ({
  executionType,
  pyodideReady,
  running,
  hasAnimationFrames,
  recordingAnimation,
  animationProgress,
  onRun,
  onRunAnimation,
  onCreateVideo,
}: ActionButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-xl border border-white/10">
      {/* Run button - always shown */}
      <Button 
        onClick={onRun} 
        disabled={!pyodideReady || running} 
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
        ) : (
          <><Play className="w-4 h-4 mr-2" />▶ Run</>
        )}
      </Button>
      
      {/* Animation/Simulation buttons */}
      {(executionType === "ANIMATION" || executionType === "SIMULATION") && (
        <>
          <Button 
            onClick={onRunAnimation} 
            disabled={!pyodideReady || running} 
            variant="outline" 
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
          >
            <Film className="w-4 h-4 mr-2" />
            🎞 Run Animation
          </Button>
          <Button 
            onClick={onCreateVideo} 
            disabled={!hasAnimationFrames || recordingAnimation} 
            variant="outline" 
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
          >
            {recordingAnimation ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{animationProgress}%</>
            ) : (
              <><Video className="w-4 h-4 mr-2" />🎬 Create Video</>
            )}
          </Button>
        </>
      )}
      
      {/* Graph button */}
      {executionType === "STATIC_GRAPH" && (
        <Button 
          onClick={onRun} 
          disabled={!pyodideReady || running} 
          variant="outline" 
          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
        >
          📈 Generate Graph
        </Button>
      )}
      
      {/* Turtle button */}
      {executionType === "TURTLE" && (
        <Button 
          onClick={onRun} 
          disabled={!pyodideReady || running} 
          variant="outline" 
          className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
        >
          <Turtle className="w-4 h-4 mr-2" />
          🐢 Draw Turtle
        </Button>
      )}
    </div>
  );
};
