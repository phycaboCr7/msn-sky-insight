import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, X, Maximize2, Minimize2 } from "lucide-react";

// Import modular components
import type { PyodideRunnerProps, SliderConfig, ExecutionType } from "./types";
import { detectExecutionType, detectFromMetadata, extractSliderConfigs, getTypeBadge } from "./detection";
import { PYTHON_SETUP_CODE } from "./pyodide-setup";
import { ParameterSliders } from "./ParameterSliders";
import { ActionButtons } from "./ActionButtons";
import { ExportButtons } from "./ExportButtons";
import { OutputPanel } from "./OutputPanel";
import { LiveCanvas } from "./LiveCanvas";
import { CanvasVideoRecorder } from "./CanvasVideoRecorder";

// Type declarations for Pyodide
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export const PyodideRunner = ({ code, onClose }: PyodideRunnerProps) => {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [animationFrames, setAnimationFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SliderConfig[]>([]);
  const [showSliders, setShowSliders] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingAnimation, setRecordingAnimation] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const { toast } = useToast();
  
  const executionType = detectExecutionType(code);
  const hasExplicitMetadata = detectFromMetadata(code) !== null;
  const badge = getTypeBadge(executionType);

  // Load Pyodide
  useEffect(() => {
    const loadPyodideScript = async () => {
      if (window.pyodide) {
        setPyodideReady(true);
        setLoading(false);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      script.async = true;
      
      script.onload = async () => {
        try {
          window.pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
          });
          
          // Load core packages first
          await window.pyodide.loadPackage(["numpy", "matplotlib", "scipy", "sympy"]);
          await window.pyodide.runPythonAsync(PYTHON_SETUP_CODE);
          
          // Load additional packages in background (non-blocking)
          window.pyodide.loadPackage(["networkx", "scikit-learn"]).catch(() => {
            console.log("Optional packages (networkx, scikit-learn) not loaded");
          });
          
          setPyodideReady(true);
          toast({ title: "Python Ready! 🐍", description: "Loaded NumPy, Matplotlib, SciPy, SymPy & Turtle" });
        } catch (err) {
          console.error("Pyodide load error:", err);
          setError("Failed to load Python environment");
        } finally {
          setLoading(false);
        }
      };
      
      script.onerror = () => {
        setError("Failed to load Pyodide script");
        setLoading(false);
      };
      
      document.body.appendChild(script);
    };

    loadPyodideScript();
    const extractedSliders = extractSliderConfigs(code);
    setSliders(extractedSliders);
    setShowSliders(extractedSliders.length > 0);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [code, toast]);

  // Animation loop for frame-based playback
  useEffect(() => {
    if (isAnimating && animationFrames.length > 1) {
      let frameIndex = currentFrame;
      
      const animate = () => {
        frameIndex = (frameIndex + 1) % animationFrames.length;
        setCurrentFrame(frameIndex);
        animationRef.current = setTimeout(() => {
          requestAnimationFrame(animate);
        }, 1000 / 24); // 24 FPS
      };
      
      animate();
      
      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [isAnimating, animationFrames.length, currentFrame]);

  // Run Python code
  const runCode = useCallback(async () => {
    if (!pyodideReady || !window.pyodide) return;
    
    setRunning(true);
    setError(null);
    setOutput("");
    setImageData(null);
    setAnimationFrames([]);
    setIsAnimating(false);
    setVideoBlob(null);
    setAnimationProgress(0);
    
    try {
      // Inject slider values
      let modifiedCode = code;
      for (const slider of sliders) {
        const varPattern = new RegExp(`^${slider.name}\\s*=\\s*[^\\n]+`, 'm');
        if (varPattern.test(modifiedCode)) {
          modifiedCode = modifiedCode.replace(varPattern, `${slider.name} = ${slider.value}`);
        } else {
          modifiedCode = `${slider.name} = ${slider.value}\n` + modifiedCode;
        }
      }

      // Handle turtle graphics
      if (executionType === "TURTLE") {
        await window.pyodide.runPythonAsync(`t = SimpleTurtle()\nturtle = t`);
        
        modifiedCode = modifiedCode
          .replace(/from turtle import \*/g, '')
          .replace(/import turtle/g, '')
          .replace(/turtle\s*=\s*turtle\.Turtle\(\)/g, '')
          .replace(/turtle\.done\(\)/g, '')
          .replace(/turtle\.mainloop\(\)/g, '')
          .replace(/done\(\)/g, '')
          .replace(/mainloop\(\)/g, '')
          .replace(/exitonclick\(\)/g, '')
          .replace(/turtle\.Screen\(\)/g, 'Screen()');
        
        modifiedCode += `\n_result_img = t.draw()`;
      } 
      // Handle animations - generate multiple frames
      else if (executionType === "ANIMATION") {
        await window.pyodide.runPythonAsync(`clear_animation_frames()`);
        
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '');
        
      // Check for FuncAnimation
        if (modifiedCode.includes("FuncAnimation")) {
          modifiedCode += `
# Generate frames from FuncAnimation — minimum 240 frames (10s at 24fps)
try:
    _total_frames = 240
    for i in range(_total_frames):
        update(i)
        capture_animation_frame()
except Exception as e:
    # If update fails partway, keep frames generated so far
    if not get_animation_frames():
        capture_animation_frame()
`;
        } else {
          // For non-FuncAnimation code, capture multiple frames if plt figures exist
          modifiedCode += `
# Capture animation frame
capture_animation_frame()
`;
        }
        
        modifiedCode += `\n_result_img = get_animation_frames()[-1] if get_animation_frames() else get_plot_as_base64()`;
      }
      else {
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '');
        
        modifiedCode += `
try:
    _result_img = get_plot_as_base64()
except:
    _result_img = None
`;
      }

      // Capture stdout
      await window.pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_capture = StringIO()
sys.stdout = _stdout_capture
      `);
      
      await window.pyodide.runPythonAsync(modifiedCode);
      
      const stdout = await window.pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
      `);
      
      if (stdout) setOutput(stdout);
      
      // Get animation frames if available
      if (executionType === "ANIMATION") {
        const framesResult = await window.pyodide.runPythonAsync(`get_animation_frames()`);
        if (framesResult && framesResult.length > 0) {
          const frames = framesResult.toJs ? framesResult.toJs() : Array.from(framesResult);
          const dataUrls = frames.map((f: string) => `data:image/png;base64,${f}`);
          setAnimationFrames(dataUrls);
          setImageData(dataUrls[0]);
          toast({ title: "Animation Ready! 🎞️", description: `Generated ${frames.length} frames (${(frames.length / 24).toFixed(1)}s at 24fps)` });
        }
      }
      
      // Get single image
      const imgResult = await window.pyodide.runPythonAsync(`_result_img if '_result_img' in dir() else None`);
      if (imgResult && animationFrames.length === 0) {
        setImageData(`data:image/png;base64,${imgResult}`);
      }
      
      toast({ title: "Executed! ✅", description: "Python code ran successfully" });
      
    } catch (err: any) {
      console.error("Python error:", err);
      setError(err.message || "Python execution failed");
      toast({ title: "Error", description: "Execution failed", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [pyodideReady, code, sliders, executionType, toast, animationFrames.length]);

  // Run animation and generate video
  const runAnimation = useCallback(async () => {
    await runCode();
    if (animationFrames.length > 1) {
      setIsAnimating(true);
    }
  }, [runCode, animationFrames.length]);

  // Export as video using real canvas-based MediaRecorder
  const exportVideo = useCallback(async () => {
    if (animationFrames.length < 2) {
      toast({ title: "Error", description: "No animation frames to export", variant: "destructive" });
      return;
    }
    
    setRecordingAnimation(true);
    setAnimationProgress(0);
    
    try {
      // Use real canvas-based recorder
      const recorder = new CanvasVideoRecorder(800, 600);
      const blob = await recorder.recordFramesLive(animationFrames, 24, setAnimationProgress);
      setVideoBlob(blob);
      toast({ title: "Video Ready! 🎬", description: "Real video created with MediaRecorder" });
    } catch (err) {
      console.error("Video export error:", err);
      toast({ title: "Error", description: "Failed to create video", variant: "destructive" });
    } finally {
      setRecordingAnimation(false);
    }
  }, [animationFrames, toast]);

  // Handle video ready from LiveCanvas
  const handleVideoReady = useCallback((blob: Blob) => {
    setVideoBlob(blob);
    toast({ title: "Video Ready! 🎬", description: "Animation recorded successfully" });
  }, [toast]);

  // Download video
  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.webm";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded! 📥", description: "Animation saved as WebM video" });
  };

  const handleSliderChange = (index: number, value: number[]) => {
    setSliders(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: value[0] };
      return updated;
    });
  };

  const exportPNG = () => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.download = 'graph.png';
    link.href = imageData;
    link.click();
    toast({ title: "Exported! 📷", description: "Saved as PNG" });
  };

  const exportPDF = async () => {
    if (!imageData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(255, 140, 0);
      doc.text("Weatherza AI - Python Graph", 15, 20);
      doc.addImage(imageData, 'PNG', 15, 30, 180, 120);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by Weatherza AI using Pyodide", 15, 280);
      doc.save('graph.pdf');
      toast({ title: "Exported! 📄", description: "Saved as PDF" });
    } catch (err) {
      toast({ title: "Error", description: "PDF export failed", variant: "destructive" });
    }
  };

  const resetSliders = () => {
    setSliders(extractSliderConfigs(code));
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`bg-[#0d0d1a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full max-w-none max-h-none rounded-none' 
          : 'w-full max-w-5xl max-h-[95vh] m-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-orange-900/20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-2xl">🐍</span>
            <h2 className="text-base sm:text-lg font-bold text-white">Python Visualizer</h2>
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${badge.color}`}>
              <span>{badge.icon}</span>
              <span className="hidden sm:inline">{badge.label}</span>
            </span>
            {hasExplicitMetadata && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full hidden sm:inline">
                @output_type
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sliders.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSliders(!showSliders)} 
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Sliders</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="text-white/70 hover:text-white hover:bg-red-500/20 rounded-full ml-2"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-3 p-8 bg-black/30 rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading Python environment...</span>
            </div>
          )}
          
          {/* Sliders */}
          {showSliders && (
            <ParameterSliders 
              sliders={sliders} 
              onSliderChange={handleSliderChange} 
              onReset={resetSliders} 
            />
          )}
          
          {/* Action Buttons */}
          <ActionButtons
            executionType={executionType}
            pyodideReady={pyodideReady}
            running={running}
            hasAnimationFrames={animationFrames.length >= 2}
            recordingAnimation={recordingAnimation}
            animationProgress={animationProgress}
            onRun={runCode}
            onRunAnimation={runAnimation}
            onCreateVideo={exportVideo}
          />
          
          {/* Frame/Video Progress */}
          {running && executionType === "ANIMATION" && (
            <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering frames... This may take a moment for 240+ frames.
            </div>
          )}
          {recordingAnimation && (
            <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <div className="text-sm text-orange-300 mb-1">Encoding Video... {animationProgress}%</div>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all" style={{ width: `${animationProgress}%` }} />
              </div>
            </div>
          )}
          
          {/* Export buttons */}
          <ExportButtons
            hasImageData={!!imageData}
            hasVideo={!!videoBlob}
            hasAnimationFrames={animationFrames.length > 1}
            isAnimating={isAnimating}
            onExportPNG={exportPNG}
            onExportPDF={exportPDF}
            onDownloadVideo={downloadVideo}
            onToggleAnimation={toggleAnimation}
          />
          
          {/* Code preview */}
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded font-mono">python</span>
            </div>
            <pre className="bg-black/40 p-4 rounded-xl overflow-x-auto text-sm font-mono text-green-400 max-h-[180px] overflow-y-auto border border-white/10">
              <code>{code}</code>
            </pre>
          </div>
          
          {/* Live Canvas Animation with MediaRecorder */}
          {animationFrames.length > 1 && (
            <div className="bg-black/30 p-4 rounded-xl border border-purple-500/20">
            <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                🎞️ Live Animation Canvas ({animationFrames.length} frames — {(animationFrames.length / 24).toFixed(1)}s at 24fps):
              </h4>
              <LiveCanvas 
                frames={animationFrames} 
                fps={24} 
                autoPlay={false}
                onVideoReady={handleVideoReady}
              />
            </div>
          )}
          
          {/* Output Panel - for static images and text */}
          {animationFrames.length <= 1 && (
            <OutputPanel
              output={output}
              error={error}
              imageData={imageData}
              animationFrames={animationFrames}
              currentFrame={currentFrame}
              videoBlob={videoBlob}
              executionType={executionType}
            />
          )}
          
          {/* Text output always shown */}
          {output && animationFrames.length > 1 && (
            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">📤 Output:</h4>
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{output}</pre>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
              <h4 className="text-sm font-medium text-red-400 mb-2">❌ Error:</h4>
              <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PyodideRunner;
