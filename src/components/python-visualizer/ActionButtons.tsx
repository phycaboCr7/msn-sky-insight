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
    <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{
      background: 'rgba(139, 92, 246, 0.04)',
      border: '1px solid rgba(139, 92, 246, 0.1)',
    }}>
      {/* Run button */}
      <Button 
        onClick={onRun} 
        disabled={!pyodideReady || running} 
        className="shadow-lg font-semibold"
        style={{
          background: 'linear-gradient(135deg, #059669, #10b981)',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
        }}
      >
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running…</>
        ) : (
          <><Play className="w-4 h-4 mr-2" />Run</>
        )}
      </Button>
      
      {/* Animation/Simulation buttons */}
      {(executionType === "ANIMATION" || executionType === "SIMULATION") && (
        <>
          <Button 
            onClick={onRunAnimation} 
            disabled={!pyodideReady || running} 
            variant="outline" 
            className="font-medium"
            style={{
              borderColor: 'rgba(139, 92, 246, 0.3)',
              color: '#a78bfa',
              background: 'rgba(139, 92, 246, 0.06)',
            }}
          >
            <Film className="w-4 h-4 mr-2" />
            Run Animation
          </Button>
          <Button 
            onClick={onCreateVideo} 
            disabled={!hasAnimationFrames || recordingAnimation} 
            variant="outline" 
            className="font-medium"
            style={{
              borderColor: 'rgba(249, 115, 22, 0.3)',
              color: '#fb923c',
              background: 'rgba(249, 115, 22, 0.06)',
            }}
          >
            {recordingAnimation ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{animationProgress}%</>
            ) : (
              <><Video className="w-4 h-4 mr-2" />Create Video</>
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
          className="font-medium"
          style={{
            borderColor: 'rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.06)',
          }}
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
          className="font-medium"
          style={{
            borderColor: 'rgba(52, 211, 153, 0.3)',
            color: '#34d399',
            background: 'rgba(52, 211, 153, 0.06)',
          }}
        >
          <Turtle className="w-4 h-4 mr-2" />
          Draw Turtle
        </Button>
      )}
    </div>
  );
};
