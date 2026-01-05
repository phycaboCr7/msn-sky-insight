import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, ExternalLink, Terminal, Trash2, Copy, Check, Image, Code } from "lucide-react";

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

// Visualization libraries that produce graphical output
const VISUAL_LIBRARIES = [
  'matplotlib', 'plt', 'pyplot',
  'turtle',
  'plotly',
  'seaborn', 'sns',
  'bokeh',
  'altair',
  'pygal',
  'pillow', 'PIL', 'Image',
  'cv2', 'opencv',
  'skimage',
  'pygame',
  'tkinter',
  'manim',
  'mayavi',
  'vispy',
  'vpython',
  'networkx',
  'wordcloud',
  'folium',
  'geopandas',
  'cartopy'
];

// Check if code contains visualization libraries
function containsVisualization(code: string): boolean {
  const lowerCode = code.toLowerCase();
  return VISUAL_LIBRARIES.some(lib => 
    lowerCode.includes(`import ${lib}`) || 
    lowerCode.includes(`from ${lib}`) ||
    lowerCode.includes(`${lib}.`) ||
    lowerCode.includes(`as ${lib}`)
  );
}

export const PythonInterpreter = ({ initialCode, language, onClose }: PythonInterpreterProps) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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

  // Run initial code if provided
  useEffect(() => {
    if (initialCode) {
      const isVisual = containsVisualization(initialCode);
      setHistory([
        { type: 'info', content: `🐍 ${language.toUpperCase()} Interactive Shell` },
        { type: 'info', content: isVisual ? `Detected visualization code. Generating image...` : `Running initial code from AI...` },
        { type: 'input', content: initialCode }
      ]);
      executeCode(initialCode);
    } else {
      setHistory([
        { type: 'info', content: `🐍 ${language.toUpperCase()} Interactive Shell` },
        { type: 'info', content: `Type your code and press Enter to execute.` },
        { type: 'info', content: `📊 Matplotlib, Turtle, Seaborn, etc. will generate AI visualizations!` }
      ]);
    }
  }, []);

  const executeVisualCode = async (code: string) => {
    setGeneratingImage(true);
    setHistory(prev => [...prev, { type: 'info', content: '🎨 Generating visualization with AI...' }]);
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-visual-python', {
        body: { code }
      });

      if (error) {
        setHistory(prev => [...prev, { type: 'error', content: `❌ Error: ${error.message}` }]);
        return false;
      } else if (data?.error) {
        // If not a visualization, return false to try regular execution
        if (data.isVisual === false) {
          return false;
        }
        setHistory(prev => [...prev, { type: 'error', content: `❌ ${data.error}` }]);
        return true;
      } else if (data?.imageUrl) {
        setHistory(prev => [...prev, 
          { type: 'info', content: `✅ Visualization generated: ${data.description || 'Python plot'}` },
          { type: 'image', content: 'Generated visualization:', imageUrl: data.imageUrl }
        ]);
        if (data.message) {
          setHistory(prev => [...prev, { type: 'output', content: data.message }]);
        }
        return true;
      }
      return false;
    } catch (e: any) {
      setHistory(prev => [...prev, { type: 'error', content: `❌ ${e.message}` }]);
      return true;
    } finally {
      setGeneratingImage(false);
    }
  };

  const executeCode = async (code: string) => {
    setIsExecuting(true);
    
    // Check if this is visualization code
    if (language === 'python' || language === 'py') {
      if (containsVisualization(code)) {
        const handled = await executeVisualCode(code);
        if (handled) {
          setIsExecuting(false);
          inputRef.current?.focus();
          return;
        }
        // If not handled, fall through to regular execution
        setHistory(prev => [...prev, { type: 'info', content: '📝 Falling back to text execution...' }]);
      }
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code, language }
      });

      if (error) {
        setHistory(prev => [...prev, { type: 'error', content: `❌ Error: ${error.message}` }]);
      } else if (data?.error) {
        setHistory(prev => [...prev, { type: 'error', content: `❌ ${data.error}` }]);
      } else {
        const output = data.output || '(no output)';
        setHistory(prev => [...prev, { 
          type: data.hasError ? 'error' : 'output', 
          content: output 
        }]);
      }
    } catch (e: any) {
      setHistory(prev => [...prev, { type: 'error', content: `❌ ${e.message}` }]);
    } finally {
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;

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
      { type: 'info', content: `🐍 ${language.toUpperCase()} Interactive Shell` },
      { type: 'info', content: `Console cleared. Type your code and press Enter.` }
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
    // Find any images in history
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${language.toUpperCase()} Interpreter Output</title>
        <style>
          body { 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
            background: #1a1a2e; 
            color: #eee; 
            padding: 20px; 
            line-height: 1.6;
          }
          pre {
            white-space: pre-wrap;
            margin: 0;
          }
          .prompt { color: #00d4ff; }
          .error { color: #ff6b6b; }
          .info { color: #888; font-style: italic; }
        </style>
      </head>
      <body>
        <pre>${fullContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        ${imageHtml}
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const openImageInNewTab = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-[#1a1a2e] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-white">{language.toUpperCase()} Interactive Shell</span>
            {(isExecuting || generatingImage) && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                {generatingImage && <span className="text-xs text-green-400">Generating visualization...</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={copyOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={openInNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              New Tab
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
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
                      onClick={() => openImageInNewTab(entry.imageUrl!)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Full Size
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
              disabled={isExecuting || generatingImage}
              className="flex-1 bg-transparent text-cyan-400 outline-none font-mono"
              placeholder={isExecuting ? "Executing..." : generatingImage ? "Generating image..." : "Type code here..."}
              autoFocus
            />
            {(isExecuting || generatingImage) && <Loader2 className="w-4 h-4 animate-spin text-green-400 ml-2" />}
          </form>
        </div>

        {/* Footer with tips */}
        <div className="px-4 py-2 bg-black/30 border-t border-white/10 text-xs text-gray-500 flex items-center justify-between">
          <span>Press Enter to execute • ↑↓ for command history • 📊 Matplotlib/Turtle generates AI images</span>
          <span className="text-green-400/70">Powered by Piston API + AI Vision</span>
        </div>
      </div>
    </div>
  );
};