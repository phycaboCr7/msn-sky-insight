import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Play, Download, FileImage, FileText, Loader2, RotateCcw, Settings, X, Film, Turtle, Video, Square, Pause } from "lucide-react";

// Type declarations for Pyodide
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

// Execution type - now detected from @output_type metadata OR heuristics
type ExecutionType = "STATIC_GRAPH" | "ANIMATION" | "SIMULATION" | "TURTLE" | "TEXT_ONLY";

interface PyodideRunnerProps {
  code: string;
  onClose?: () => void;
}

interface SliderConfig {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
}

// PRIORITY 1: Check for explicit @output_type metadata tag
const detectFromMetadata = (code: string): ExecutionType | null => {
  const metadataMatch = code.match(/#\s*@output_type:\s*(\w+)/i);
  if (metadataMatch) {
    const type = metadataMatch[1].toLowerCase();
    if (type === "animation") return "ANIMATION";
    if (type === "graph") return "STATIC_GRAPH";
    if (type === "simulation") return "SIMULATION";
    if (type === "turtle") return "TURTLE";
    if (type === "text") return "TEXT_ONLY";
  }
  return null;
};

// PRIORITY 2: Fallback to heuristic detection
const detectExecutionType = (code: string): ExecutionType => {
  // First check metadata
  const metadataType = detectFromMetadata(code);
  if (metadataType) return metadataType;
  
  // Then use heuristics
  if (code.includes("turtle") || code.includes("Turtle")) return "TURTLE";
  if (code.includes("FuncAnimation") || code.includes("animation.") || code.includes("@output_type: animation")) return "ANIMATION";
  if (code.includes("plt.plot") || code.includes("plt.scatter") || code.includes("plt.bar") || code.includes("plt.pie") || code.includes("plt.hist") || code.includes("plt.imshow")) return "STATIC_GRAPH";
  if (code.includes("simulate") || code.includes("time.sleep") || code.includes("for i in range") || code.includes("while ")) return "SIMULATION";
  return "TEXT_ONLY";
};

// Extract slider parameters from code comments
const extractSliderConfigs = (code: string): SliderConfig[] => {
  const sliders: SliderConfig[] = [];
  const regex = /# slider:\s*(\w+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)(?:,\s*"([^"]+)")?/g;
  let match;
  
  while ((match = regex.exec(code)) !== null) {
    sliders.push({
      name: match[1],
      min: parseFloat(match[2]),
      max: parseFloat(match[3]),
      step: parseFloat(match[4]),
      value: parseFloat(match[5]),
      label: match[6] || match[1]
    });
  }
  
  // Auto-detect common parameters if no explicit sliders
  if (sliders.length === 0) {
    if (code.includes("a*x**2") || code.includes("a*x*x") || code.includes("a * x**2")) {
      sliders.push({ name: "a", min: -5, max: 5, step: 0.1, value: 1, label: "a (coefficient)" });
      sliders.push({ name: "b", min: -10, max: 10, step: 0.5, value: 0, label: "b (coefficient)" });
      sliders.push({ name: "c", min: -10, max: 10, step: 0.5, value: 0, label: "c (constant)" });
    }
    else if (code.includes("np.sin") || code.includes("np.cos")) {
      sliders.push({ name: "amplitude", min: 0.1, max: 5, step: 0.1, value: 1, label: "Amplitude" });
      sliders.push({ name: "frequency", min: 0.1, max: 10, step: 0.1, value: 1, label: "Frequency" });
    }
    else if (code.includes("m*x") && code.includes("+ c")) {
      sliders.push({ name: "m", min: -10, max: 10, step: 0.1, value: 1, label: "Slope (m)" });
      sliders.push({ name: "c", min: -20, max: 20, step: 0.5, value: 0, label: "Intercept (c)" });
    }
  }
  
  return sliders;
};

export const PyodideRunner = ({ code, onClose }: PyodideRunnerProps) => {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();
  
  const executionType = detectExecutionType(code);
  const hasExplicitMetadata = detectFromMetadata(code) !== null;

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
          
          await window.pyodide.loadPackage(["numpy", "matplotlib"]);
          
          // Setup matplotlib + turtle simulation
          await window.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
import math

# Global frame storage for animations
_animation_frames = []

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return img_str

def capture_animation_frame():
    """Capture current frame for animation"""
    _animation_frames.append(get_plot_as_base64())

def get_animation_frames():
    """Return all captured frames"""
    return _animation_frames

def clear_animation_frames():
    """Clear stored frames"""
    global _animation_frames
    _animation_frames = []

# Simple turtle simulation
class SimpleTurtle:
    def __init__(self):
        self.x = 0
        self.y = 0
        self.angle = 90
        self.pen_down = True
        self.paths = []
        self.current_path = [(0, 0)]
        self.color = 'lime'
        
    def forward(self, distance):
        rad = math.radians(self.angle)
        new_x = self.x + distance * math.cos(rad)
        new_y = self.y + distance * math.sin(rad)
        if self.pen_down:
            self.current_path.append((new_x, new_y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path.copy(), self.color))
            self.current_path = [(new_x, new_y)]
        self.x, self.y = new_x, new_y
        
    def fd(self, distance): self.forward(distance)
    def backward(self, distance): self.forward(-distance)
    def bk(self, distance): self.backward(distance)
    def back(self, distance): self.backward(distance)
        
    def right(self, angle): self.angle -= angle
    def rt(self, angle): self.right(angle)
    def left(self, angle): self.angle += angle
    def lt(self, angle): self.left(angle)
        
    def penup(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path.copy(), self.color))
        self.current_path = [(self.x, self.y)]
        self.pen_down = False
        
    def pu(self): self.penup()
    def up(self): self.penup()
        
    def pendown(self):
        self.pen_down = True
        self.current_path = [(self.x, self.y)]
        
    def pd(self): self.pendown()
    def down(self): self.pendown()
        
    def goto(self, x, y=None):
        if y is None and hasattr(x, '__iter__'):
            x, y = x
        if self.pen_down:
            self.current_path.append((x, y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path.copy(), self.color))
            self.current_path = [(x, y)]
        self.x, self.y = x, y
        
    def setpos(self, x, y=None): self.goto(x, y)
    def setposition(self, x, y=None): self.goto(x, y)
    def setheading(self, angle): self.angle = angle
    def seth(self, angle): self.setheading(angle)
        
    def circle(self, radius, extent=360):
        steps = max(int(abs(extent) / 5), 1)
        step_angle = extent / steps
        step_length = 2 * math.pi * abs(radius) * abs(extent) / 360 / steps
        for _ in range(steps):
            self.forward(step_length)
            if radius > 0:
                self.left(step_angle)
            else:
                self.right(step_angle)
                
    def pencolor(self, *args):
        if len(args) == 1:
            self.color = args[0]
        elif len(args) == 3:
            r, g, b = args
            if max(r, g, b) <= 1:
                r, g, b = int(r*255), int(g*255), int(b*255)
            self.color = f'#{r:02x}{g:02x}{b:02x}'
            
    def speed(self, s): pass
    def hideturtle(self): pass
    def ht(self): pass
    def showturtle(self): pass
    def st(self): pass
    def begin_fill(self): pass
    def end_fill(self): pass
    def fillcolor(self, *args): pass
    def width(self, w): pass
    def pensize(self, w): pass
        
    def draw(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path.copy(), self.color))
        
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.set_facecolor('#1a1a2e')
        fig.patch.set_facecolor('#1a1a2e')
        
        for path, color in self.paths:
            if len(path) > 1:
                xs, ys = zip(*path)
                ax.plot(xs, ys, color=color, linewidth=2)
        
        # Draw turtle
        ax.plot(self.x, self.y, 'g^', markersize=12)
        
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.2, color='white')
        ax.tick_params(colors='white')
        for spine in ax.spines.values():
            spine.set_color('white')
            spine.set_alpha(0.3)
        ax.set_xlabel('X', color='white')
        ax.set_ylabel('Y', color='white')
        ax.set_title('🐢 Turtle Graphics', color='lime', fontsize=16)
        
        return get_plot_as_base64()

t = SimpleTurtle()
turtle = t
Turtle = SimpleTurtle

def done(): pass
def mainloop(): pass
def exitonclick(): pass
def bye(): pass
def Screen(): return type('Screen', (), {'bgcolor': lambda self, c: None, 'setup': lambda self, *a: None, 'title': lambda self, t: None, 'tracer': lambda self, n: None, 'update': lambda self: None})()
          `);
          
          setPyodideReady(true);
          toast({ title: "Python Ready! 🐍", description: "Loaded NumPy, Matplotlib & Turtle" });
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
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [code]);

  // Animation loop for frame-based playback
  useEffect(() => {
    if (isAnimating && animationFrames.length > 1) {
      let frameIndex = currentFrame;
      const animate = () => {
        frameIndex = (frameIndex + 1) % animationFrames.length;
        setCurrentFrame(frameIndex);
        animationRef.current = setTimeout(() => {
          requestAnimationFrame(animate);
        }, 1000 / 24) as unknown as number; // 24 FPS
      };
      
      animate();
      
      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current as unknown as number);
        }
      };
    }
  }, [isAnimating, animationFrames.length]);

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
        
        // Remove show/save calls
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '');
        
        // Check for FuncAnimation
        if (modifiedCode.includes("FuncAnimation")) {
          // Extract animation to generate frames manually
          modifiedCode += `
# Generate frames from FuncAnimation
try:
    for i in range(60):  # Generate 60 frames (~2.5 seconds at 24fps)
        update(i)
        capture_animation_frame()
        plt.clf()
except Exception as e:
    # Fallback: capture single frame
    capture_animation_frame()
`;
        } else {
          // Simple iteration-based animation
          modifiedCode += `\ncapture_animation_frame()`;
        }
        
        modifiedCode += `\n_result_img = get_animation_frames()[-1] if get_animation_frames() else get_plot_as_base64()`;
      }
      else {
        // Static graphs
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
          toast({ title: "Animation Ready! 🎞️", description: `Generated ${frames.length} frames` });
        }
      }
      
      // Get single image
      const imgResult = await window.pyodide.runPythonAsync(`_result_img if '_result_img' in dir() else None`);
      if (imgResult && !animationFrames.length) {
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
  }, [pyodideReady, code, sliders, executionType, toast]);

  // Run animation and generate video
  const runAnimation = useCallback(async () => {
    await runCode();
    // Auto-start animation playback
    if (animationFrames.length > 1) {
      setIsAnimating(true);
    }
  }, [runCode, animationFrames.length]);

  // Export as MP4 using canvas recording
  const exportMP4 = useCallback(async () => {
    if (animationFrames.length < 2) {
      toast({ title: "Error", description: "No animation frames to export", variant: "destructive" });
      return;
    }
    
    setRecordingAnimation(true);
    
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d")!;
      
      const stream = canvas.captureStream(24);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);
        setRecordingAnimation(false);
        toast({ title: "Video Ready! 🎬", description: "Click Export MP4 to download" });
      };
      
      mediaRecorder.start();
      
      // Draw each frame
      for (let i = 0; i < animationFrames.length; i++) {
        setAnimationProgress(Math.round((i / animationFrames.length) * 100));
        
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve();
          };
          img.src = animationFrames[i];
        });
        
        await new Promise(r => setTimeout(r, 1000 / 24)); // 24 FPS delay
      }
      
      mediaRecorder.stop();
      
    } catch (err) {
      console.error("MP4 export error:", err);
      setRecordingAnimation(false);
      toast({ title: "Error", description: "Failed to create video", variant: "destructive" });
    }
  }, [animationFrames, toast]);

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

  const getTypeBadge = () => {
    const badges = {
      "STATIC_GRAPH": { icon: "📊", label: "Graph", color: "bg-blue-500/20 text-blue-400" },
      "ANIMATION": { icon: "🎞️", label: "Animation", color: "bg-purple-500/20 text-purple-400" },
      "SIMULATION": { icon: "🔬", label: "Simulation", color: "bg-cyan-500/20 text-cyan-400" },
      "TURTLE": { icon: "🐢", label: "Turtle", color: "bg-green-500/20 text-green-400" },
      "TEXT_ONLY": { icon: "📝", label: "Script", color: "bg-gray-500/20 text-gray-400" },
    };
    return badges[executionType];
  };

  const badge = getTypeBadge();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-[#1a1a2e] border border-white/10 shadow-2xl rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐍</span>
            <h2 className="text-lg font-semibold text-foreground">Python Visualizer</h2>
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${badge.color}`}>
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </span>
            {hasExplicitMetadata && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                @output_type
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sliders.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowSliders(!showSliders)} className="text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4 mr-1" />
                Sliders
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-destructive/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-3 p-8 bg-black/30 rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading Python environment...</span>
            </div>
          )}
          
          {/* Sliders */}
          {showSliders && sliders.length > 0 && (
            <div className="p-4 bg-black/20 rounded-lg border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Interactive Parameters
                </h3>
                <Button variant="ghost" size="sm" onClick={resetSliders} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
              {sliders.map((slider, index) => (
                <div key={slider.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{slider.label}</span>
                    <span className="text-primary font-mono">{slider.value.toFixed(2)}</span>
                  </div>
                  <Slider value={[slider.value]} min={slider.min} max={slider.max} step={slider.step} onValueChange={(value) => handleSliderChange(index, value)} />
                </div>
              ))}
            </div>
          )}
          
          {/* ACTION BUTTONS - ALWAYS VISIBLE BEFORE EXECUTION */}
          <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-lg border border-white/10">
            {/* Run button */}
            <Button onClick={runCode} disabled={!pyodideReady || running} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />▶ Run</>
              )}
            </Button>
            
            {/* Animation-specific buttons - ALWAYS shown for ANIMATION type */}
            {(executionType === "ANIMATION" || executionType === "SIMULATION") && (
              <>
                <Button onClick={runAnimation} disabled={!pyodideReady || running} variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  <Film className="w-4 h-4 mr-2" />
                  🎞 Run Animation
                </Button>
                <Button onClick={exportMP4} disabled={animationFrames.length < 2 || recordingAnimation} variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
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
              <Button onClick={runCode} disabled={!pyodideReady || running} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                📈 Generate Graph
              </Button>
            )}
            
            {/* Turtle button */}
            {executionType === "TURTLE" && (
              <Button onClick={runCode} disabled={!pyodideReady || running} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                <Turtle className="w-4 h-4 mr-2" />
                🐢 Draw Turtle
              </Button>
            )}
          </div>
          
          {/* Export buttons - shown after execution */}
          {(imageData || videoBlob || animationFrames.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {imageData && (
                <>
                  <Button onClick={exportPNG} variant="outline" size="sm" className="border-white/20">
                    <FileImage className="w-4 h-4 mr-2" />
                    Export PNG
                  </Button>
                  <Button onClick={exportPDF} variant="outline" size="sm" className="border-white/20">
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </>
              )}
              
              {animationFrames.length > 1 && (
                <Button onClick={toggleAnimation} variant="outline" size="sm" className="border-purple-500/30 text-purple-400">
                  {isAnimating ? <><Pause className="w-4 h-4 mr-2" />Pause</> : <><Play className="w-4 h-4 mr-2" />Play</>}
                </Button>
              )}
              
              {videoBlob && (
                <Button onClick={downloadVideo} variant="outline" size="sm" className="border-orange-500/30 text-orange-400">
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
              )}
            </div>
          )}
          
          {/* Code preview */}
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded font-mono">python</span>
            </div>
            <pre className="bg-black/40 p-4 rounded-lg overflow-x-auto text-sm font-mono text-green-400 max-h-[180px] overflow-y-auto border border-white/10">
              <code>{code}</code>
            </pre>
          </div>
          
          {/* Output */}
          {output && (
            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">📤 Output:</h4>
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{output}</pre>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">❌ Error:</h4>
              <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          )}
          
          {/* Graph/Animation output */}
          {(imageData || animationFrames.length > 0) && (
            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                {executionType === "ANIMATION" ? "🎞️ Animation" : executionType === "TURTLE" ? "🐢 Turtle" : "📊 Graph"} Output:
                {animationFrames.length > 1 && (
                  <span className="text-xs text-purple-400">Frame {currentFrame + 1}/{animationFrames.length}</span>
                )}
              </h4>
              <div className="flex justify-center">
                <img 
                  src={animationFrames.length > 0 ? animationFrames[currentFrame] : imageData!} 
                  alt="Output" 
                  className="max-w-full max-h-[450px] rounded-lg shadow-lg border border-white/10"
                />
              </div>
            </div>
          )}
          
          {/* Video preview */}
          {videoBlob && (
            <div className="bg-black/30 p-4 rounded-lg border border-orange-500/20">
              <h4 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">🎬 Video Preview:</h4>
              <video 
                ref={videoRef}
                src={URL.createObjectURL(videoBlob)} 
                controls 
                autoPlay 
                loop 
                className="max-w-full max-h-[400px] rounded-lg shadow-lg mx-auto"
              />
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default PyodideRunner;
