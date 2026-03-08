import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X, ExternalLink, Terminal, Trash2, Copy, Check, Image } from "lucide-react";

interface PythonInterpreterProps {
  initialCode?: string;
  language: string;
  onClose: () => void;
}

interface HistoryEntry {
  type: 'input' | 'output' | 'error' | 'info' | 'image';
  content: string;
  imageUrl?: string;
}

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export const PythonInterpreter = ({ initialCode, language, onClose }: PythonInterpreterProps) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadingPyodide, setLoadingPyodide] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const pyodideRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load Pyodide
  useEffect(() => {
    const loadPyodideEngine = async () => {
      setLoadingPyodide(true);
      setHistory([
        { type: 'info', content: '🐍 PYTHON Interactive Shell' },
        { type: 'info', content: 'Loading Python engine...' },
      ]);

      try {
        // Load Pyodide script if not already loaded
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Pyodide'));
            document.head.appendChild(script);
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        });

        // Pre-load common packages
        await pyodide.loadPackage(['numpy', 'matplotlib', 'scipy', 'sympy']);
        
        // Setup matplotlib AGG backend
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io, base64

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', 
                facecolor='#1a1a2e', edgecolor='none', pad_inches=0.1)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode()
    plt.close('all')
    return img_str
`);
        
        pyodideRef.current = pyodide;
        setPyodideReady(true);
        setHistory(prev => [
          ...prev,
          { type: 'info', content: '✅ Python engine ready! NumPy, Matplotlib, SciPy, SymPy loaded.' },
          { type: 'info', content: 'Type your code and press Enter to execute. Use Shift+Enter for multiline.' },
        ]);

        // Run initial code if provided
        if (initialCode) {
          setHistory(prev => [
            ...prev,
            { type: 'info', content: 'Running initial code...' },
            { type: 'input', content: initialCode },
          ]);
          await executeCodeInternal(pyodide, initialCode);
        }
      } catch (e: any) {
        setHistory(prev => [
          ...prev,
          { type: 'error', content: `❌ Failed to load Python engine: ${e.message}` },
        ]);
      } finally {
        setLoadingPyodide(false);
      }
    };

    loadPyodideEngine();
  }, []);

  const executeCodeInternal = useCallback(async (pyodide: any, code: string) => {
    try {
      // Sanitize markdown artifacts
      let cleanCode = code.replace(/\*\*(\d+(?:\.\d+)?)\*\*/g, '$1');
      
      // Capture stdout
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_capture = StringIO()
sys.stdout = _stdout_capture
`);

      // Check if code has matplotlib plots
      const hasPlot = /plt\.(show|savefig|plot|bar|scatter|hist|pie|contour|imshow|figure)|\.plot\(|\.bar\(/.test(cleanCode);
      
      if (hasPlot) {
        // Add plot capture at the end
        cleanCode = cleanCode.replace(/plt\.show\(\)/g, '');
        cleanCode += '\n_plot_img = get_plot_as_base64()';
      }

      await pyodide.runPythonAsync(cleanCode);

      // Get stdout
      const stdout = await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
`);

      if (stdout && stdout.trim()) {
        setHistory(prev => [...prev, { type: 'output', content: stdout.trim() }]);
      }

      // Check for plot image
      if (hasPlot) {
        const imgData = await pyodide.runPythonAsync(`_plot_img if '_plot_img' in dir() else None`);
        if (imgData) {
          setHistory(prev => [
            ...prev,
            { type: 'image', content: 'Generated plot:', imageUrl: `data:image/png;base64,${imgData}` },
          ]);
        }
      }

      if (!stdout?.trim() && !hasPlot) {
        // Check if last expression has a value
        try {
          const result = await pyodide.runPythonAsync(`
_last = None
try:
    _last = repr(${cleanCode.split('\n').pop()?.trim() || 'None'})
except:
    pass
_last
`);
          if (result && result !== 'None') {
            setHistory(prev => [...prev, { type: 'output', content: result }]);
          }
        } catch {
          // No displayable result, that's fine
        }
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      // Clean up the Pyodide traceback for readability
      const cleanError = errorMsg
        .replace(/PythonError: /g, '')
        .replace(/File "<exec>", /g, 'Line ');
      setHistory(prev => [...prev, { type: 'error', content: `❌ ${cleanError}` }]);
    }
  }, []);

  const executeCode = useCallback(async (code: string) => {
    if (!pyodideRef.current) return;
    setIsExecuting(true);
    await executeCodeInternal(pyodideRef.current, code);
    setIsExecuting(false);
    inputRef.current?.focus();
  }, [executeCodeInternal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting || !pyodideReady) return;

    const code = input.trim();
    setHistory(prev => [...prev, { type: 'input', content: code }]);
    setCommandHistory(prev => [...prev, code]);
    setHistoryIndex(-1);
    setInput("");
    executeCode(code);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const clearHistory = () => {
    setHistory([
      { type: 'info', content: '🐍 PYTHON Interactive Shell' },
      { type: 'info', content: 'Console cleared. Type your code and press Enter.' },
    ]);
  };

  const copyOutput = async () => {
    const outputText = history
      .filter(h => h.type === 'output' || h.type === 'error')
      .map(h => h.content)
      .join('\n');
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInNewTab = () => {
    const images = history.filter(h => h.type === 'image' && h.imageUrl);
    const fullContent = history.map(h => {
      if (h.type === 'input') return `>>> ${h.content}`;
      if (h.type === 'info') return `# ${h.content}`;
      if (h.type === 'image') return `[Image: ${h.content}]`;
      return h.content;
    }).join('\n');

    const imageHtml = images.map(img =>
      `<div style="margin: 20px 0; text-align: center;">
        <p style="color: #888; margin-bottom: 10px;">${img.content}</p>
        <img src="${img.imageUrl}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" />
      </div>`
    ).join('');

    const htmlContent = `<!DOCTYPE html><html><head><title>Python Shell Output</title>
      <style>body{font-family:'Monaco','Menlo',monospace;background:#1a1a2e;color:#eee;padding:20px;line-height:1.6}
      pre{white-space:pre-wrap;margin:0}.prompt{color:#00d4ff}.error{color:#ff6b6b}.info{color:#888;font-style:italic}</style>
      </head><body><pre>${fullContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>${imageHtml}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-[#1a1a2e] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-white">🐍 PYTHON Interactive Shell</span>
            {(isExecuting || loadingPyodide) && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                <span className="text-xs text-green-400">
                  {loadingPyodide ? 'Loading Python...' : 'Executing...'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearHistory} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button onClick={copyOutput} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={openInNewTab} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4" /> New Tab
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          className="flex-1 overflow-auto p-4 font-mono text-sm space-y-2"
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((entry, idx) => (
            <div key={idx}>
              {entry.type === 'image' && entry.imageUrl ? (
                <div className="my-4 p-4 bg-black/30 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Image className="w-4 h-4" />
                      <span className="text-sm">{entry.content}</span>
                    </div>
                    <button
                      onClick={() => window.open(entry.imageUrl!, '_blank')}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Full Size
                    </button>
                  </div>
                  <img
                    src={entry.imageUrl}
                    alt="Generated visualization"
                    className="w-full max-w-2xl mx-auto rounded-lg shadow-lg border border-white/10"
                  />
                </div>
              ) : (
                <div className={`${
                  entry.type === 'input' ? 'text-cyan-400' :
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'info' ? 'text-gray-500 italic' :
                  'text-green-300'
                }`}>
                  {entry.type === 'input' && (
                    <span className="text-yellow-400">{'>>> '}</span>
                  )}
                  <pre className="whitespace-pre-wrap inline">{entry.content}</pre>
                </div>
              )}
            </div>
          ))}

          {/* Input Line */}
          <form onSubmit={handleSubmit} className="flex items-start gap-0">
            <span className="text-yellow-400">{'>>> '}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting || loadingPyodide}
              className="flex-1 bg-transparent text-cyan-400 outline-none font-mono"
              placeholder={loadingPyodide ? "Loading Python engine..." : isExecuting ? "Executing..." : "Type code here..."}
              autoFocus
            />
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin text-green-400 ml-2" />}
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-black/30 border-t border-white/10 text-xs text-gray-500 flex items-center justify-between">
          <span>Press Enter to execute · ↑↓ for command history · 📊 Matplotlib generates inline plots</span>
          <span className="text-green-400/70">⚡ Powered by Pyodide (In-Browser Python)</span>
        </div>
      </div>
    </div>
  );
};
