import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Play, Download, FileImage, FileText, Loader2, RotateCcw, Settings, X, Maximize2, Film, Turtle } from "lucide-react";

// Type declarations for Pyodide
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

// Execution type detection
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

// Detect what type of code we're running
const detectExecutionType = (code: string): ExecutionType => {
  if (code.includes("turtle") || code.includes("Turtle")) return "TURTLE";
  if (code.includes("FuncAnimation") || code.includes("animation")) return "ANIMATION";
  if (code.includes("plt.plot") || code.includes("plt.scatter") || code.includes("plt.bar") || code.includes("plt.pie") || code.includes("plt.hist")) return "STATIC_GRAPH";
  if (code.includes("simulate") || code.includes("time.sleep") || code.includes("for i in range")) return "SIMULATION";
  return "TEXT_ONLY";
};

// Extract slider parameters from code comments like: # slider: a, -5, 5, 0.1, 1
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
    // Check for quadratic: a, b, c
    if (code.includes("a*x**2") || code.includes("a*x*x")) {
      sliders.push({ name: "a", min: -5, max: 5, step: 0.1, value: 1, label: "a (coefficient)" });
      sliders.push({ name: "b", min: -10, max: 10, step: 0.5, value: 0, label: "b (coefficient)" });
      sliders.push({ name: "c", min: -10, max: 10, step: 0.5, value: 0, label: "c (constant)" });
    }
    // Check for sine/cosine: amplitude, frequency
    else if (code.includes("np.sin") || code.includes("np.cos")) {
      sliders.push({ name: "amplitude", min: 0.1, max: 5, step: 0.1, value: 1, label: "Amplitude" });
      sliders.push({ name: "frequency", min: 0.1, max: 10, step: 0.1, value: 1, label: "Frequency" });
    }
    // Check for linear: m (slope), c (intercept)
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  const executionType = detectExecutionType(code);

  // Load Pyodide
  useEffect(() => {
    const loadPyodideScript = async () => {
      // Check if already loaded
      if (window.pyodide) {
        setPyodideReady(true);
        setLoading(false);
        return;
      }

      // Load script
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      script.async = true;
      
      script.onload = async () => {
        try {
          window.pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
          });
          
          // Load essential packages
          await window.pyodide.loadPackage(["numpy", "matplotlib"]);
          
          // Setup matplotlib for browser + turtle simulation
          await window.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
import math

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return img_str

# Simple turtle simulation using matplotlib
class SimpleTurtle:
    def __init__(self):
        self.x = 0
        self.y = 0
        self.angle = 90  # Facing up
        self.pen_down = True
        self.paths = []
        self.current_path = [(0, 0)]
        self.color = 'green'
        self.colors = []
        
    def forward(self, distance):
        rad = math.radians(self.angle)
        new_x = self.x + distance * math.cos(rad)
        new_y = self.y + distance * math.sin(rad)
        if self.pen_down:
            self.current_path.append((new_x, new_y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path, self.color))
            self.current_path = [(new_x, new_y)]
        self.x, self.y = new_x, new_y
        
    def fd(self, distance):
        self.forward(distance)
        
    def backward(self, distance):
        self.forward(-distance)
        
    def bk(self, distance):
        self.backward(distance)
        
    def right(self, angle):
        self.angle -= angle
        
    def rt(self, angle):
        self.right(angle)
        
    def left(self, angle):
        self.angle += angle
        
    def lt(self, angle):
        self.left(angle)
        
    def penup(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path, self.color))
        self.current_path = [(self.x, self.y)]
        self.pen_down = False
        
    def pu(self):
        self.penup()
        
    def pendown(self):
        self.pen_down = True
        self.current_path = [(self.x, self.y)]
        
    def pd(self):
        self.pendown()
        
    def goto(self, x, y=None):
        if y is None and hasattr(x, '__iter__'):
            x, y = x
        if self.pen_down:
            self.current_path.append((x, y))
        else:
            if len(self.current_path) > 1:
                self.paths.append((self.current_path, self.color))
            self.current_path = [(x, y)]
        self.x, self.y = x, y
        
    def setpos(self, x, y=None):
        self.goto(x, y)
        
    def setposition(self, x, y=None):
        self.goto(x, y)
        
    def setheading(self, angle):
        self.angle = angle
        
    def seth(self, angle):
        self.setheading(angle)
        
    def circle(self, radius, extent=360):
        steps = max(int(abs(extent) / 5), 1)
        step_angle = extent / steps
        step_length = 2 * math.pi * radius * abs(extent) / 360 / steps
        for _ in range(steps):
            self.forward(step_length)
            self.left(step_angle) if radius > 0 else self.right(-step_angle)
            
    def pencolor(self, *args):
        if len(args) == 1:
            self.color = args[0]
        elif len(args) == 3:
            self.color = '#{:02x}{:02x}{:02x}'.format(int(args[0]*255), int(args[1]*255), int(args[2]*255))
            
    def color(self, *args):
        self.pencolor(*args)
        
    def speed(self, s):
        pass  # Speed doesn't apply in this simulation
        
    def hideturtle(self):
        pass
        
    def ht(self):
        pass
        
    def showturtle(self):
        pass
        
    def st(self):
        pass
        
    def draw(self):
        if len(self.current_path) > 1:
            self.paths.append((self.current_path, self.color))
        
        fig, ax = plt.subplots(figsize=(8, 8))
        ax.set_facecolor('#1a1a2e')
        fig.patch.set_facecolor('#1a1a2e')
        
        for path, color in self.paths:
            xs, ys = zip(*path)
            ax.plot(xs, ys, color=color, linewidth=2)
        
        # Draw turtle position
        ax.plot(self.x, self.y, 'g^', markersize=10)
        
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3, color='white')
        ax.tick_params(colors='white')
        for spine in ax.spines.values():
            spine.set_color('white')
            spine.set_alpha(0.3)
        ax.set_xlabel('X', color='white')
        ax.set_ylabel('Y', color='white')
        ax.set_title('Turtle Graphics', color='orange', fontsize=14)
        
        return get_plot_as_base64()

# Create a turtle instance
t = SimpleTurtle()
turtle = t
Turtle = SimpleTurtle

def done():
    pass
    
def mainloop():
    pass
          `);
          
          setPyodideReady(true);
          toast({ title: "Python Ready! 🐍", description: "Pyodide loaded with NumPy, Matplotlib & Turtle" });
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
    
    // Extract sliders from code
    const extractedSliders = extractSliderConfigs(code);
    setSliders(extractedSliders);
    setShowSliders(extractedSliders.length > 0);

    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [code]);

  // Animation loop for frame-based animations
  useEffect(() => {
    if (isAnimating && animationFrames.length > 0) {
      const animate = () => {
        setCurrentFrame((prev) => (prev + 1) % animationFrames.length);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      const frameDelay = setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 100); // 10 FPS
      
      return () => {
        clearTimeout(frameDelay);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isAnimating, animationFrames.length]);

  // Inject slider values into code and run
  const runCode = useCallback(async () => {
    if (!pyodideReady || !window.pyodide) return;
    
    setRunning(true);
    setError(null);
    setOutput("");
    setImageData(null);
    setAnimationFrames([]);
    setIsAnimating(false);
    
    try {
      // Inject slider values as variables
      let modifiedCode = code;
      for (const slider of sliders) {
        // Replace variable assignments or add them at the top
        const varPattern = new RegExp(`^${slider.name}\\s*=\\s*[^\\n]+`, 'm');
        if (varPattern.test(modifiedCode)) {
          modifiedCode = modifiedCode.replace(varPattern, `${slider.name} = ${slider.value}`);
        } else {
          modifiedCode = `${slider.name} = ${slider.value}\n` + modifiedCode;
        }
      }

      // Handle turtle graphics
      if (executionType === "TURTLE") {
        // Reset turtle before running
        await window.pyodide.runPythonAsync(`t = SimpleTurtle()`);
        
        // Replace turtle imports and setup
        modifiedCode = modifiedCode
          .replace(/from turtle import \*/g, '')
          .replace(/import turtle/g, '')
          .replace(/turtle\s*=\s*turtle\.Turtle\(\)/g, '')
          .replace(/turtle\.done\(\)/g, '')
          .replace(/turtle\.mainloop\(\)/g, '')
          .replace(/done\(\)/g, '')
          .replace(/mainloop\(\)/g, '');
        
        modifiedCode += `\n_result_img = t.draw()`;
      } else {
        // Modify code to capture output instead of plt.show()
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '');
        
        // Add our image capture at the end
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
      
      // Run the code
      await window.pyodide.runPythonAsync(modifiedCode);
      
      // Get output
      const stdout = await window.pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
      `);
      
      if (stdout) {
        setOutput(stdout);
      }
      
      // Get image if generated
      const imgResult = await window.pyodide.runPythonAsync(`_result_img if '_result_img' in dir() else None`);
      if (imgResult) {
        setImageData(`data:image/png;base64,${imgResult}`);
      }
      
      toast({ title: "Executed! ✅", description: "Python code ran successfully" });
      
    } catch (err: any) {
      console.error("Python execution error:", err);
      setError(err.message || "Python execution failed");
      toast({ title: "Error", description: "Python execution failed", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [pyodideReady, code, sliders, executionType, toast]);

  // Handle slider change
  const handleSliderChange = (index: number, value: number[]) => {
    setSliders(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: value[0] };
      return updated;
    });
  };

  // Export as PNG
  const exportPNG = () => {
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.download = 'graph.png';
    link.href = imageData;
    link.click();
    toast({ title: "Exported! 📷", description: "Graph saved as PNG" });
  };

  // Export as PDF
  const exportPDF = async () => {
    if (!imageData) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(255, 140, 0);
      doc.text("Weatherza AI - Python Graph", 15, 20);
      
      // Add image
      doc.addImage(imageData, 'PNG', 15, 30, 180, 120);
      
      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by Rakshit's Weatherza AI using Pyodide", 15, 280);
      
      doc.save('graph.pdf');
      toast({ title: "Exported! 📄", description: "Graph saved as PDF" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to export PDF", variant: "destructive" });
    }
  };

  // Reset sliders to default
  const resetSliders = () => {
    const extractedSliders = extractSliderConfigs(code);
    setSliders(extractedSliders);
  };

  // Toggle animation playback
  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  // Get execution type badge
  const getTypeBadge = () => {
    switch (executionType) {
      case "STATIC_GRAPH": return { icon: "📊", label: "Graph" };
      case "ANIMATION": return { icon: "🎞️", label: "Animation" };
      case "SIMULATION": return { icon: "🔬", label: "Simulation" };
      case "TURTLE": return { icon: "🐢", label: "Turtle" };
      default: return { icon: "📝", label: "Script" };
    }
  };

  const badge = getTypeBadge();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1a2e] border border-white/10 shadow-2xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐍</span>
            <h2 className="text-lg font-semibold text-foreground">Python Graph Visualizer</h2>
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sliders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSliders(!showSliders)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-4 h-4 mr-1" />
                Sliders
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-destructive/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Loading state */}
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
                  <Slider
                    value={[slider.value]}
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    onValueChange={(value) => handleSliderChange(index, value)}
                    className="cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={runCode}
              disabled={!pyodideReady || running}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  {executionType === "TURTLE" ? <Turtle className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {executionType === "STATIC_GRAPH" ? "Generate Graph" : 
                   executionType === "ANIMATION" ? "Run Animation" : 
                   executionType === "SIMULATION" ? "Run Simulation" : 
                   executionType === "TURTLE" ? "Draw Turtle" : "Run"}
                </>
              )}
            </Button>
            
            {imageData && (
              <>
                <Button
                  onClick={exportPNG}
                  variant="outline"
                  className="border-white/20 hover:bg-white/10"
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  Export PNG
                </Button>
                <Button
                  onClick={exportPDF}
                  variant="outline"
                  className="border-white/20 hover:bg-white/10"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </>
            )}

            {animationFrames.length > 1 && (
              <Button
                onClick={toggleAnimation}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
              >
                <Film className="w-4 h-4 mr-2" />
                {isAnimating ? "Pause" : "Play Animation"}
              </Button>
            )}
          </div>
          
          {/* Code preview */}
          <div className="relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded font-mono">python</span>
            </div>
            <pre className="bg-black/40 p-4 rounded-lg overflow-x-auto text-sm font-mono text-green-400 max-h-[200px] overflow-y-auto border border-white/10">
              <code>{code}</code>
            </pre>
          </div>
          
          {/* Output */}
          {output && (
            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <span>📤</span> Output:
              </h4>
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{output}</pre>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                <span>❌</span> Error:
              </h4>
              <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          )}
          
          {/* Graph output */}
          {imageData && (
            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span>📊</span> Graph Output:
              </h4>
              <div className="flex justify-center">
                <img 
                  src={animationFrames.length > 0 ? animationFrames[currentFrame] : imageData} 
                  alt="Generated graph" 
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg"
                />
              </div>
            </div>
          )}
          
          {/* Hidden canvas for animations */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default PyodideRunner;
