import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Download, FileImage, FileText, Loader2, RotateCcw, Settings, X } from "lucide-react";

// Type declarations for Pyodide
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

// Execution type detection
type ExecutionType = "STATIC_GRAPH" | "ANIMATION" | "SIMULATION" | "TEXT_ONLY";

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
  if (code.includes("FuncAnimation") || code.includes("animation")) return "ANIMATION";
  if (code.includes("plt.plot") || code.includes("plt.scatter") || code.includes("plt.bar") || code.includes("plt.pie")) return "STATIC_GRAPH";
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
  const [error, setError] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SliderConfig[]>([]);
  const [showSliders, setShowSliders] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
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
          
          // Setup matplotlib for browser
          await window.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return img_str
          `);
          
          setPyodideReady(true);
          toast({ title: "Python Ready! 🐍", description: "Pyodide loaded with NumPy & Matplotlib" });
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
  }, [code]);

  // Inject slider values into code and run
  const runCode = useCallback(async () => {
    if (!pyodideReady || !window.pyodide) return;
    
    setRunning(true);
    setError(null);
    setOutput("");
    setImageData(null);
    
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
  }, [pyodideReady, code, sliders, toast]);

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

  // Export as PDF (using canvas to PDF)
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

  return (
    <Card className="bg-[#1a1a2e] border-white/10 shadow-2xl max-w-4xl w-full">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <span className="text-2xl">🐍</span>
            <span>Python Graph Visualizer</span>
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
              {executionType === "STATIC_GRAPH" && "📊 Graph"}
              {executionType === "ANIMATION" && "🎞️ Animation"}
              {executionType === "SIMULATION" && "🔬 Simulation"}
              {executionType === "TEXT_ONLY" && "📝 Script"}
            </span>
          </CardTitle>
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
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
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
              <h3 className="text-sm font-medium text-foreground">Interactive Parameters</h3>
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
                <Play className="w-4 h-4 mr-2" />
                {executionType === "STATIC_GRAPH" ? "Generate Graph" : 
                 executionType === "ANIMATION" ? "Run Animation" : 
                 executionType === "SIMULATION" ? "Run Simulation" : "Run"}
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
        </div>
        
        {/* Code preview */}
        <div className="relative">
          <pre className="bg-black/40 p-4 rounded-lg overflow-x-auto text-sm font-mono text-green-400 max-h-[200px] overflow-y-auto border border-white/10">
            <code>{code}</code>
          </pre>
        </div>
        
        {/* Output */}
        {output && (
          <div className="bg-black/30 p-4 rounded-lg border border-white/10">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Output:</h4>
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap">{output}</pre>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
            <h4 className="text-sm font-medium text-red-400 mb-2">Error:</h4>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
          </div>
        )}
        
        {/* Graph output */}
        {imageData && (
          <div ref={canvasRef} className="bg-black/30 p-4 rounded-lg border border-white/10">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Graph Output:</h4>
            <img 
              src={imageData} 
              alt="Generated graph" 
              className="max-w-full rounded-lg shadow-lg mx-auto"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PyodideRunner;
