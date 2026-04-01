import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X, ExternalLink, Terminal, Trash2, Copy, Check, Image, Cpu, Zap } from "lucide-react";

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
        { type: 'info', content: '⚡ PYTHON RUNTIME • Powered by Pyodide WebAssembly' },
        { type: 'info', content: '🔄 Initializing Python engine...' },
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
                facecolor='#0a0a1a', edgecolor='none', pad_inches=0.1)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode()
    plt.close('all')
    return img_str
`);
        
        pyodideRef.current = pyodide;
        setPyodideReady(true);
        setHistory(prev => [
          ...prev,
          { type: 'info', content: '✅ Engine ready • NumPy • Matplotlib • SciPy • SymPy' },
          { type: 'info', content: '⌨️  Type code → Enter to execute • ↑↓ history • Shift+Enter multiline' },
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
          { type: 'error', content: `❌ Engine load failed: ${e.message}` },
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
            { type: 'image', content: '📊 Generated visualization', imageUrl: `data:image/png;base64,${imgData}` },
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
      { type: 'info', content: '⚡ Console cleared • Ready for new commands' },
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
        body{font-family:'JetBrains Mono','Monaco','Menlo',monospace;background:#0a0a1a;color:#e0e0ff;padding:24px;line-height:1.7}
        pre{white-space:pre-wrap;margin:0}
        .prompt{color:#00e5ff}
        .error{color:#ff5252}
        .info{color:#666;font-style:italic}
        .output{color:#69f0ae}
      </style>
      </head><body><pre>${fullContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>${imageHtml}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 10, 0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative" style={{
        background: 'linear-gradient(180deg, #0d0d2b 0%, #080818 100%)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 0 60px rgba(0, 229, 255, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Animated top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: 'linear-gradient(90deg, transparent, #00e5ff, #7c4dff, #00e5ff, transparent)',
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3" style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08), rgba(124, 77, 255, 0.06))',
          borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
        }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(124, 77, 255, 0.2))' }}>
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#00e5ff' }} />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-wide" style={{ color: '#e0e0ff' }}>
                Python Runtime
              </span>
              <span className="text-[10px] sm:text-xs ml-2 px-2 py-0.5 rounded-full" style={{
                background: pyodideReady ? 'rgba(105, 240, 174, 0.15)' : 'rgba(255, 215, 0, 0.15)',
                color: pyodideReady ? '#69f0ae' : '#ffd700',
                border: `1px solid ${pyodideReady ? 'rgba(105, 240, 174, 0.3)' : 'rgba(255, 215, 0, 0.3)'}`,
              }}>
                {loadingPyodide ? '⏳ Loading...' : isExecuting ? '⚡ Running' : '● Ready'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={clearHistory} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all hover:scale-105" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
            </button>
            <button onClick={copyOutput} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all hover:scale-105" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button onClick={openInNewTab} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all hover:scale-105" style={{
              background: 'rgba(0, 229, 255, 0.1)',
              color: '#00e5ff',
              border: '1px solid rgba(0, 229, 255, 0.2)',
            }}>
              <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pop Out</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:scale-110" style={{
              background: 'rgba(255, 82, 82, 0.1)',
              color: '#ff5252',
            }}>
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          className="flex-1 overflow-auto p-4 sm:p-5 space-y-1.5"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', monospace", fontSize: '13px' }}
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((entry, idx) => (
            <div key={idx}>
              {entry.type === 'image' && entry.imageUrl ? (
                <div className="my-4 p-4 rounded-xl" style={{
                  background: 'rgba(124, 77, 255, 0.06)',
                  border: '1px solid rgba(124, 77, 255, 0.15)',
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2" style={{ color: '#b388ff' }}>
                      <Image className="w-4 h-4" />
                      <span className="text-sm font-medium">{entry.content}</span>
                    </div>
                    <button
                      onClick={() => window.open(entry.imageUrl!, '_blank')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all hover:scale-105"
                      style={{
                        background: 'rgba(124, 77, 255, 0.15)',
                        color: '#b388ff',
                        border: '1px solid rgba(124, 77, 255, 0.25)',
                      }}
                    >
                      <ExternalLink className="w-3 h-3" /> Full Size
                    </button>
                  </div>
                  <img
                    src={entry.imageUrl}
                    alt="Generated visualization"
                    className="w-full max-w-2xl mx-auto rounded-xl"
                    style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(124, 77, 255, 0.1)' }}
                  />
                </div>
              ) : (
                <div className="leading-relaxed" style={{
                  color: entry.type === 'input' ? '#00e5ff' :
                         entry.type === 'error' ? '#ff5252' :
                         entry.type === 'info' ? '#555577' :
                         '#69f0ae',
                }}>
                  {entry.type === 'input' && (
                    <span style={{ color: '#ffd740', marginRight: '4px' }}>❯</span>
                  )}
                  <pre className="whitespace-pre-wrap inline">{entry.content}</pre>
                </div>
              )}
            </div>
          ))}

          {/* Input Line */}
          <form onSubmit={handleSubmit} className="flex items-start gap-0 pt-1">
            <span style={{ color: '#ffd740' }}>❯ </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting || loadingPyodide}
              className="flex-1 bg-transparent outline-none"
              style={{
                color: '#00e5ff',
                fontFamily: 'inherit',
                caretColor: '#00e5ff',
              }}
              placeholder={loadingPyodide ? "Initializing engine..." : isExecuting ? "Executing..." : "Enter Python code..."}
              autoFocus
            />
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin ml-2" style={{ color: '#00e5ff' }} />}
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px]" style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderTop: '1px solid rgba(0, 229, 255, 0.08)',
          color: '#444466',
        }}>
          <div className="flex items-center gap-3">
            <span>Enter → Execute</span>
            <span>↑↓ → History</span>
            <span>📊 Plots render inline</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(0, 229, 255, 0.5)' }}>
            <Zap className="w-3 h-3" />
            <span>Pyodide WASM Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};