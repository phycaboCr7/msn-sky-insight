import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, X, ExternalLink, Terminal, Trash2, Copy, Check } from "lucide-react";

interface PythonInterpreterProps {
  initialCode?: string;
  language: string;
  onClose: () => void;
}

interface HistoryEntry {
  type: 'input' | 'output' | 'error' | 'info';
  content: string;
}

export const PythonInterpreter = ({ initialCode, language, onClose }: PythonInterpreterProps) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
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
      setHistory([
        { type: 'info', content: `🐍 ${language.toUpperCase()} Interactive Shell` },
        { type: 'info', content: `Running initial code from AI...` },
        { type: 'input', content: initialCode }
      ]);
      executeCode(initialCode);
    } else {
      setHistory([
        { type: 'info', content: `🐍 ${language.toUpperCase()} Interactive Shell` },
        { type: 'info', content: `Type your code and press Enter to execute.` }
      ]);
    }
  }, []);

  const executeCode = async (code: string) => {
    setIsExecuting(true);
    
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
    const fullContent = history.map(h => {
      if (h.type === 'input') return `>>> ${h.content}`;
      if (h.type === 'info') return `# ${h.content}`;
      return h.content;
    }).join('\n');

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
            white-space: pre-wrap;
            line-height: 1.6;
          }
          .prompt { color: #00d4ff; }
          .error { color: #ff6b6b; }
          .info { color: #888; font-style: italic; }
        </style>
      </head>
      <body>${fullContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-[#1a1a2e] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-white">{language.toUpperCase()} Interactive Shell</span>
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin text-green-400" />}
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
          className="flex-1 overflow-auto p-4 font-mono text-sm space-y-1"
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((entry, idx) => (
            <div key={idx} className={`${
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
              disabled={isExecuting}
              className="flex-1 bg-transparent text-cyan-400 outline-none font-mono"
              placeholder={isExecuting ? "Executing..." : "Type code here..."}
              autoFocus
            />
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin text-green-400 ml-2" />}
          </form>
        </div>

        {/* Footer with tips */}
        <div className="px-4 py-2 bg-black/30 border-t border-white/10 text-xs text-gray-500 flex items-center justify-between">
          <span>Press Enter to execute • ↑↓ for command history</span>
          <span className="text-green-400/70">Powered by Piston API</span>
        </div>
      </div>
    </div>
  );
};
