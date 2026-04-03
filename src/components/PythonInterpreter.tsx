import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X, ExternalLink, Terminal, Trash2, Copy, Check, Image, Cpu, Zap, Play, RotateCcw } from "lucide-react";

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

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const loadPyodideEngine = async () => {
      setLoadingPyodide(true);
      setHistory([
        { type: 'info', content: 'Python Runtime • Powered by Pyodide WebAssembly' },
        { type: 'info', content: 'Initializing Python engine...' },
      ]);

      try {
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

        await pyodide.loadPackage(['numpy', 'matplotlib', 'scipy', 'sympy']);
        
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io, base64

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', 
                facecolor='#0f0f1e', edgecolor='none', pad_inches=0.1)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode()
    plt.close('all')
    return img_str
`);
        
        pyodideRef.current = pyodide;
        setPyodideReady(true);
        setHistory(prev => [
          ...prev,
          { type: 'info', content: '✓ Engine ready • NumPy • Matplotlib • SciPy • SymPy' },
          { type: 'info', content: 'Type code → Enter to execute • ↑↓ history • Shift+Enter multiline' },
        ]);

        if (initialCode) {
          setHistory(prev => [
            ...prev,
            { type: 'info', content: '▶ Executing initial code...' },
            { type: 'input', content: initialCode },
          ]);
          await executeCodeInternal(pyodide, initialCode);
        }
      } catch (e: any) {
        setHistory(prev => [
          ...prev,
          { type: 'error', content: `Engine load failed: ${e.message}` },
        ]);
      } finally {
        setLoadingPyodide(false);
      }
    };

    loadPyodideEngine();
  }, []);

  const executeCodeInternal = useCallback(async (pyodide: any, code: string) => {
    try {
      let cleanCode = code.replace(/\*\*(\d+(?:\.\d+)?)\*\*/g, '$1');
      
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_capture = StringIO()
sys.stdout = _stdout_capture
`);

      const hasPlot = /plt\.(show|savefig|plot|bar|scatter|hist|pie|contour|imshow|figure)|\.plot\(|\.bar\(/.test(cleanCode);
      
      if (hasPlot) {
        cleanCode = cleanCode.replace(/plt\.show\(\)/g, '');
        cleanCode += '\n_plot_img = get_plot_as_base64()';
      }

      await pyodide.runPythonAsync(cleanCode);

      const stdout = await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
_stdout_capture.getvalue()
`);

      if (stdout && stdout.trim()) {
        setHistory(prev => [...prev, { type: 'output', content: stdout.trim() }]);
      }

      if (hasPlot) {
        const imgData = await pyodide.runPythonAsync(`_plot_img if '_plot_img' in dir() else None`);
        if (imgData) {
          setHistory(prev => [
            ...prev,
            { type: 'image', content: 'Generated visualization', imageUrl: `data:image/png;base64,${imgData}` },
          ]);
        }
      }

      if (!stdout?.trim() && !hasPlot) {
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
          // No displayable result
        }
      }
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      const cleanError = errorMsg
        .replace(/PythonError: /g, '')
        .replace(/File "<exec>", /g, 'Line ');
      setHistory(prev => [...prev, { type: 'error', content: cleanError }]);
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
      { type: 'info', content: 'Console cleared • Ready for new commands' },
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
        <img src="${img.imageUrl}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);" />
      </div>`
    ).join('');

    const htmlContent = `<!DOCTYPE html><html><head><title>Python Shell Output</title>
      <style>
        body{font-family:'SF Mono','Menlo','Monaco',monospace;background:#0f0f1e;color:#e0e0f0;padding:24px;line-height:1.7}
        pre{white-space:pre-wrap;margin:0}
        .prompt{color:hsl(28 100% 60%)}
        .error{color:#ff6b6b}
        .info{color:#555;font-style:italic}
        .output{color:#7bed9f}
      </style>
      </head><body><pre>${fullContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>${imageHtml}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in" style={{ backgroundColor: 'hsl(220 30% 4% / 0.9)', backdropFilter: 'blur(24px)' }}>
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative" style={{
        background: 'hsl(225 30% 7%)',
        border: '1px solid hsl(220 20% 20% / 0.6)',
        boxShadow: '0 0 80px hsl(28 100% 55% / 0.06), 0 25px 60px hsl(0 0% 0% / 0.5)',
      }}>

        {/* macOS-style title bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3" style={{
          background: 'hsl(225 25% 10%)',
          borderBottom: '1px solid hsl(220 20% 18%)',
        }}>
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all" title="Close" />
              <button onClick={clearHistory} className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all" title="Clear" />
              <button onClick={openInNewTab} className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all" title="Open in new tab" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Terminal className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-medium text-sm text-foreground tracking-wide" style={{ fontFamily: "'Quicksand', sans-serif" }}>
                Python Runtime
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                background: pyodideReady ? 'hsl(150 70% 40% / 0.15)' : 'hsl(40 90% 50% / 0.15)',
                color: pyodideReady ? 'hsl(150 70% 55%)' : 'hsl(40 90% 60%)',
                border: `1px solid ${pyodideReady ? 'hsl(150 70% 40% / 0.3)' : 'hsl(40 90% 50% / 0.3)'}`,
              }}>
                {loadingPyodide ? 'Loading...' : isExecuting ? 'Running' : 'Ready'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={clearHistory} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all" title="Clear console">
              <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
            </button>
            <button onClick={copyOutput} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all" title="Copy output">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button onClick={openInNewTab} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="Open in new tab">
              <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pop Out</span>
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          className="flex-1 overflow-auto p-4 sm:p-5 space-y-1.5"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'Menlo', monospace", fontSize: '13px' }}
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((entry, idx) => (
            <div key={idx}>
              {entry.type === 'image' && entry.imageUrl ? (
                <div className="my-4 p-4 rounded-xl" style={{
                  background: 'hsl(225 25% 12%)',
                  border: '1px solid hsl(220 20% 22%)',
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="w-4 h-4" />
                      <span className="text-sm font-medium">{entry.content}</span>
                    </div>
                    <button
                      onClick={() => window.open(entry.imageUrl!, '_blank')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-border"
                    >
                      <ExternalLink className="w-3 h-3" /> Full Size
                    </button>
                  </div>
                  <img
                    src={entry.imageUrl}
                    alt="Generated visualization"
                    className="w-full max-w-2xl mx-auto rounded-xl"
                    style={{ boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)' }}
                  />
                </div>
              ) : (
                <div className="leading-relaxed" style={{
                  color: entry.type === 'input' ? 'hsl(28 100% 60%)' :
                         entry.type === 'error' ? 'hsl(0 80% 65%)' :
                         entry.type === 'info' ? 'hsl(220 15% 45%)' :
                         'hsl(150 60% 65%)',
                }}>
                  {entry.type === 'input' && (
                    <span style={{ color: 'hsl(28 100% 55%)', marginRight: '6px', fontWeight: 600 }}>❯</span>
                  )}
                  <pre className="whitespace-pre-wrap inline">{entry.content}</pre>
                </div>
              )}
            </div>
          ))}

          {/* Input Line */}
          <form onSubmit={handleSubmit} className="flex items-start gap-0 pt-1">
            <span style={{ color: 'hsl(28 100% 55%)', fontWeight: 600 }}>❯ </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting || loadingPyodide}
              className="flex-1 bg-transparent outline-none text-foreground"
              style={{
                fontFamily: 'inherit',
                caretColor: 'hsl(28 100% 55%)',
              }}
              placeholder={loadingPyodide ? "Initializing engine..." : isExecuting ? "Executing..." : "Enter Python code..."}
              autoFocus
            />
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin ml-2 text-primary" />}
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground" style={{
          background: 'hsl(225 25% 8%)',
          borderTop: '1px solid hsl(220 20% 16%)',
        }}>
          <div className="flex items-center gap-3">
            <span>Enter → Execute</span>
            <span>↑↓ → History</span>
            <span>Plots render inline</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary/50">
            <Zap className="w-3 h-3" />
            <span>Pyodide WASM Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
