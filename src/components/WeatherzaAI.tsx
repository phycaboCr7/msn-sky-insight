import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send, User, Bot, Trash2, Copy, Check, Play, Terminal, Paperclip, Mic, XCircle, FileText, Download, FileDown, BarChart3, Code, Calculator, MessageCircle, CloudSun, Square, Zap, LogIn, LogOut, Crown, Type, ImageIcon } from "lucide-react";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { FontPicker, FontOption, getStoredFont, loadGoogleFont } from "@/components/FontPicker";
import { BackgroundPicker, CustomBg, getStoredBg } from "@/components/BackgroundPicker";
import { supabase } from "@/integrations/supabase/client";
import { loginWithGoogle, logoutUser, auth, onAuthStateChanged } from "@/services/authService";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

const FREE_PROMPT_LIMIT = 4;
const PROMPT_COUNT_KEY = 'weatherza-prompt-count';

// Lazy load PyodideRunner for graph visualization
const PyodideRunner = lazy(() => import("@/components/python-visualizer"));

// Heavy libs loaded dynamically on demand (not at startup)
const loadDocx = () => import("docx");
const loadPdfjs = async () => {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return lib;
};
const loadMammoth = () => import("mammoth").then(m => m.default);
const loadHtml2canvas = () => import("html2canvas").then(m => m.default);

interface WeatherzaAIProps {
  weather: WeatherData;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  image?: string;
  documentText?: string;
  documentName?: string;
}

let msgIdCounter = 0;
const genMsgId = () => `msg-${Date.now()}-${++msgIdCounter}`;

const AIBackground = ({ weather, customBg }: { weather: WeatherData; customBg?: CustomBg | null }) => {
  const [bgImage, setBgImage] = useState<string>('');

  useEffect(() => {
    if (customBg?.url) {
      setBgImage(customBg.url);
      return;
    }
    const fetchBg = async () => {
      try {
        const queries = ['dramatic waterfall tropical rainforest', 'volcanic eruption lava ocean', 'northern lights mountain lake reflection', 'deep ocean bioluminescent underwater', 'lightning storm dramatic landscape', 'milky way mountain silhouette night'];
        const query = queries[Math.floor(Math.random() * queries.length)];
        const { data, error } = await supabase.functions.invoke('pixabay-proxy', {
          body: { query, category: 'nature', min_width: 1280, per_page: 20, image_type: 'photo', editors_choice: true },
        });
        if (!error && data?.hits?.length > 0) {
          const idx = Math.floor(Math.random() * Math.min(data.hits.length, 10));
          const url = data.hits[idx].largeImageURL || data.hits[idx].webformatURL;
          const img = new window.Image();
          img.onload = () => setBgImage(url);
          img.src = url;
        }
      } catch (e) {
        console.error('AIBackground fetch error:', e);
      }
    };
    fetchBg();
  }, [weather.location.name, customBg?.url]);

  if (!bgImage) return null;

  return (
    <div
      className="absolute inset-0 z-0 transition-opacity duration-1000"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.35,
        filter: 'brightness(0.5) contrast(1.4) saturate(1.6) blur(3px)',
      }}
    />
  );
};

const calculateAQI = (pm25: number): number => {
  const breakpoints = [
    { lo: 0, hi: 12, aqiLo: 0, aqiHi: 50 },
    { lo: 12.1, hi: 35.4, aqiLo: 51, aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4, aqiLo: 151, aqiHi: 200 },
    { lo: 150.5, hi: 250.4, aqiLo: 201, aqiHi: 300 },
    { lo: 250.5, hi: 500.4, aqiLo: 301, aqiHi: 500 },
  ];
  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo);
    }
  }
  return pm25 > 500 ? 500 : 0;
};

const INTERPRETER_LANGUAGES = [
  'python', 'py', 'javascript', 'js', 'typescript', 'ts',
  'ruby', 'rb', 'lua', 'bash', 'sh', 'perl', 'r'
];

const BACKEND_LANGUAGES = [
  'python', 'py', 'javascript', 'js', 'typescript', 'ts',
  'java', 'c', 'cpp', 'c++', 'csharp', 'cs', 'go', 'golang',
  'rust', 'ruby', 'rb', 'php', 'swift', 'kotlin', 'r',
  'perl', 'lua', 'bash', 'sh', 'sql', 'sqlite', 'scala',
  'haskell', 'elixir', 'dart', 'julia', 'clojure', 'fortran',
  'cobol', 'pascal', 'lisp', 'prolog', 'brainfuck', 'bf'
];

const isPythonGraphCode = (code: string): boolean => {
  const graphIndicators = [
    'plt.plot', 'plt.scatter', 'plt.bar', 'plt.pie', 'plt.hist',
    'matplotlib', 'np.linspace', 'np.sin', 'np.cos', 'FuncAnimation'
  ];
  return graphIndicators.some(indicator => code.includes(indicator));
};

const CodeBlock = ({ 
  language, 
  children, 
  onOpenPyodide 
}: { 
  language?: string; 
  children: string; 
  onOpenPyodide?: (code: string) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [editableCode, setEditableCode] = useState(children);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditableCode(children);
  }, [children]);

  const lang = language?.toLowerCase() || '';
  const isRunnable = lang && (BACKEND_LANGUAGES.includes(lang) || lang === 'html');
  const usesInterpreter = INTERPRETER_LANGUAGES.includes(lang);
  const isPythonGraph = (lang === 'python' || lang === 'py') && isPythonGraphCode(editableCode);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPyodide = () => {
    if (onOpenPyodide) {
      onOpenPyodide(editableCode);
    }
  };

  const handleRun = () => {
    const popupWidth = 1000;
    const popupHeight = 700;
    const left = (window.screen.width - popupWidth) / 2;
    const top = (window.screen.height - popupHeight) / 2;

    if (lang === "html") {
      const htmlContent = children;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`);
    } else {
      const isPython = lang === 'python' || lang === 'py';
      const interpreterHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${lang.toUpperCase()} Interpreter</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Monaco', 'Menlo', 'Consolas', monospace; background: #1a1a2e; color: #eee; height: 100vh; display: flex; flex-direction: column; }
    .header { background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2)); padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 16px; font-weight: 600; }
    .output { flex: 1; overflow: auto; padding: 16px; font-size: 14px; line-height: 1.6; }
    .input-line { color: #00d4ff; }
    .output-line { color: #86efac; }
    .error-line { color: #f87171; }
    .info-line { color: #888; font-style: italic; }
    .prompt { color: #facc15; }
    .footer { background: rgba(0,0,0,0.3); padding: 8px 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #888; display: flex; justify-content: space-between; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    .loading { color: #facc15; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .image-container { margin: 16px 0; text-align: center; }
    .image-container img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .input-form { display: flex; padding: 8px 16px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); }
    .input-form input { flex: 1; background: transparent; border: none; color: #00d4ff; font-family: inherit; font-size: 14px; outline: none; }
    .input-form .prompt-label { color: #facc15; margin-right: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <span>[Py]</span>
    <h1>${lang.toUpperCase()} Interactive Shell</h1>
    <span id="status"></span>
  </div>
  <div class="output" id="output">
    <div class="info-line">PYTHON Interactive Shell - Powered by Pyodide</div>
    <div class="loading" id="loading">⏳ Loading Python engine with 20+ essential libraries...</div>
  </div>
  ${isPython ? '<div class="input-form" id="inputForm" style="display:none"><span class="prompt-label">&gt;&gt;&gt; </span><input type="text" id="cmdInput" placeholder="Type code here..." autocomplete="off" /></div>' : ''}
  <div class="footer">
    <span>Press Enter to execute | Up/Down for history | Matplotlib generates inline plots</span>
    <span style="color: rgba(34,197,94,0.7)">Powered by Pyodide (In-Browser Python)</span>
  </div>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"><\/script>
  <script>
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const cmdHistory = [];
    let histIdx = -1;

    function addLine(text, cls) {
      const d = document.createElement('div');
      d.className = cls;
      if (cls === 'input-line') {
        d.innerHTML = '<span class="prompt">&gt;&gt;&gt; </span><pre style="display:inline">' + escHtml(text) + '</pre>';
      } else {
        const pre = document.createElement('pre');
        pre.textContent = text;
        d.appendChild(pre);
      }
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    }
    function addImage(base64) {
      const d = document.createElement('div');
      d.className = 'image-container';
      d.innerHTML = '<img src="data:image/png;base64,' + base64 + '" />';
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    }
    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    (async function() {
      try {
        const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
        
        loading.textContent = '⏳ Loading 20 essential Python packages (numpy, pandas, matplotlib, scipy, scikit-learn...)';
        
        const essentialPackages = [
          'numpy', 'pandas', 'matplotlib', 'scipy', 'sympy',
          'scikit-learn', 'micropip', 'networkx', 'pillow', 'regex',
          'pyyaml', 'beautifulsoup4', 'lxml', 'nltk', 'packaging',
          'statsmodels', 'seaborn', 'plotly', 'bokeh', 'altair'
        ];
        
        let loaded = 0;
        for (const pkg of essentialPackages) {
          try {
            await pyodide.loadPackage(pkg);
            loaded++;
            loading.textContent = \`⏳ Loading packages... (\${loaded}/\${essentialPackages.length}) - \${pkg}\`;
          } catch (e) {
            console.warn(\`Could not pre-load \${pkg}:\`, e);
          }
        }
        
        loading.textContent = '⚙️ Configuring matplotlib and auto-install system...';
        
        await pyodide.runPythonAsync(\`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io, base64
import micropip

async def ensure_package(package_name):
    """Auto-install package if not available"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        try:
            print(f"📦 Installing {package_name}...")
            await micropip.install(package_name)
            print(f"✅ {package_name} installed!")
            return True
        except Exception as e:
            print(f"❌ Could not install {package_name}: {e}")
            return False

def get_plot_as_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#1a1a2e', edgecolor='none', pad_inches=0.1)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode()
    plt.close('all')
    return img_str
\`);
        
        loading.remove();
        addLine(\`✅ Python ready! \${loaded}/\${essentialPackages.length} packages loaded.\`, 'info-line');
        addLine('💡 Pre-loaded: numpy, pandas, matplotlib, scipy, scikit-learn, sympy, seaborn, plotly, and more!', 'info-line');
        addLine('🚀 Any other package will auto-install on first use via micropip!', 'info-line');

        window._pyodide = pyodide;

        const initialCode = ${JSON.stringify(editableCode)};
        if (initialCode) {
          addLine(initialCode, 'input-line');
          await runCode(pyodide, initialCode);
        }

        const form = document.getElementById('inputForm');
        const inp = document.getElementById('cmdInput');
        if (form && inp) {
          form.style.display = 'flex';
          inp.focus();
          inp.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && inp.value.trim()) {
              const code = inp.value.trim();
              cmdHistory.push(code);
              histIdx = -1;
              inp.value = '';
              addLine(code, 'input-line');
              await runCode(pyodide, code);
              inp.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (cmdHistory.length > 0) {
                histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
                inp.value = cmdHistory[cmdHistory.length - 1 - histIdx] || '';
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx > 0) { histIdx--; inp.value = cmdHistory[cmdHistory.length - 1 - histIdx] || ''; }
              else { histIdx = -1; inp.value = ''; }
            }
          });
        }
      } catch (e) {
        loading.remove();
        addLine('Error: Failed to load Python: ' + e.message, 'error-line');
      }
    })();

    async function runCode(pyodide, code) {
      try {
        code = code.replace(/\\*\\*(\\d+(?:\\.\\d+)?)\\*\\*/g, '$1');
        const hasPlot = /plt\\.(show|savefig|plot|bar|scatter|hist|pie|contour|imshow|figure)|\\. plot\\(|\\. bar\\(/.test(code);
        
        await pyodide.runPythonAsync('import sys; from io import StringIO; _sc = StringIO(); sys.stdout = _sc');
        
        let execCode = code;
        
        const importLines = code.match(/^(?:from|import)\\s+(\\w+)/gm) || [];
        for (const line of importLines) {
          const match = line.match(/^(?:from|import)\\s+(\\w+)/);
          if (match) {
            const pkg = match[1];
            const builtins = ['sys', 'os', 'math', 'json', 'random', 'time', 'datetime', 'collections', 'itertools', 're', 'io', 'base64'];
            if (!builtins.includes(pkg)) {
              try {
                await pyodide.runPythonAsync(\`
try:
    import \${pkg}
except ImportError:
    import micropip
    await micropip.install('\${pkg}')
    import \${pkg}
    print('📦 Auto-installed: \${pkg}')
\`);
              } catch (e) {
                console.warn('Auto-install failed for', pkg, e);
              }
            }
          }
        }
        
        if (hasPlot) {
          execCode = execCode.replace(/plt\\.show\\(\\)/g, '');
          execCode += '\\n_plot_img = get_plot_as_base64()';
        }
        
        await pyodide.runPythonAsync(execCode);
        const stdout = await pyodide.runPythonAsync('sys.stdout = sys.__stdout__; _sc.getvalue()');
        
        if (stdout && stdout.trim()) addLine(stdout.trim(), 'output-line');
        
        if (hasPlot) {
          const img = await pyodide.runPythonAsync("_plot_img if '_plot_img' in dir() else None");
          if (img) addImage(img);
        }
        
        if (!stdout?.trim() && !hasPlot) addLine('(executed)', 'info-line');
      } catch (e) {
        const errorMsg = (e.message || String(e)).replace(/PythonError: /g, '');
        
        if (errorMsg.includes('No module named')) {
          const pkgMatch = errorMsg.match(/No module named '(\\w+)'/);
          if (pkgMatch) {
            addLine(\`📦 Installing missing package: \${pkgMatch[1]}...\`, 'info-line');
            try {
              await pyodide.runPythonAsync(\`
import micropip
await micropip.install('\${pkgMatch[1]}')
\`);
              addLine(\`✅ Installed! Re-run your code.\`, 'info-line');
            } catch (installError) {
              addLine(\`❌ Could not install \${pkgMatch[1]}\`, 'error-line');
            }
          }
        } else {
          addLine('Error: ' + errorMsg, 'error-line');
        }
      }
    }
  <\/script>
</body>
</html>`;
      const blob = new Blob([interpreterHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`);
    }
    toast({ title: "Opened!", description: `${lang.toUpperCase()} code opened in new window` });
  };

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-black/50 px-3 py-1.5 rounded-t-lg border-b border-white/10">
        <span className="text-xs text-orange-400 font-mono font-bold">{language || "code"}</span>
        <div className="flex gap-1">
          {isPythonGraph && onOpenPyodide && (
            <button
              onClick={handleOpenPyodide}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-colors"
              title="Run with Pyodide (interactive graphs)"
            >
              <BarChart3 className="w-3 h-3" />
              Graph
            </button>
          )}
          {isRunnable && (
            <button
              onClick={handleRun}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors"
            >
              {usesInterpreter ? <Terminal className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {usesInterpreter ? 'Open Shell' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-foreground/70 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="relative">
        {isEditing ? (
          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            className="w-full bg-black/40 p-3 rounded-b-lg overflow-x-auto m-0 border-l-2 border-orange-500/50 font-mono text-sm text-foreground/90 resize-y min-h-[60px] outline-none focus:border-orange-400 border border-transparent"
            style={{ minHeight: `${Math.max(60, editableCode.split('\n').length * 20 + 16)}px` }}
            spellCheck={false}
          />
        ) : (
          <pre className="bg-black/40 p-3 rounded-b-lg overflow-x-auto m-0 border-l-2 border-orange-500/50 cursor-text" onClick={() => setIsEditing(true)}>
            <code className="font-mono text-sm text-foreground/90">{editableCode}</code>
          </pre>
        )}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] bg-white/10 hover:bg-white/20 text-foreground/50 rounded transition-colors"
        >
          {isEditing ? '✓ Done' : '✎ Edit'}
        </button>
      </div>
    </div>
  );
};

const useTypingEffect = (text: string, isTyping: boolean, chunkSize: number = 5, speed: number = 10) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        index = Math.min(index + chunkSize, text.length);
        setDisplayedText(text.slice(0, index));
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isTyping, chunkSize, speed]);

  return { displayedText, isComplete };
};

const MessageContent = ({ content, isTyping, onOpenPyodide, chatFont, isPro }: { content: string; isTyping?: boolean; onOpenPyodide?: (code: string) => void; chatFont?: string; isPro?: boolean }) => {
  const { displayedText, isComplete } = useTypingEffect(content, isTyping || false);

  return (
    <div className="w-full overflow-visible">
      <div className={`weatherza-markdown break-words prose prose-invert prose-sm max-w-none text-foreground/90 leading-snug h-auto min-h-fit ${isPro ? 'pro-equations' : ''}`} style={{ fontFamily: chatFont || "'Quicksand', sans-serif" }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-orange-400 mb-3 mt-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-orange-400 mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-orange-300 mb-2 mt-2">{children}</h3>,
          p: ({ children }) => <p className="mb-2 text-foreground/90 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-orange-400">{children}</strong>,
          em: ({ children }) => <em className="italic text-orange-300/80 bg-orange-500/10 px-1 rounded">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-foreground/90">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/90">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90 marker:text-orange-400">{children}</li>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !className && !match;
            const codeContent = String(children).replace(/\n$/, "");
            
            if (isInline) {
              return (
                <code className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-mono text-sm font-bold">{children}</code>
              );
            }
            
            return <CodeBlock language={match?.[1]} onOpenPyodide={onOpenPyodide}>{codeContent}</CodeBlock>;
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-orange-500/50 pl-3 italic text-orange-300/70 bg-orange-500/5 py-1">{children}</blockquote>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-white/20">
              <table className="w-full border-collapse bg-black/20">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-primary/20">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-white/20">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 text-sm text-foreground/80">{children}</td>,
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {isTyping && !isComplete && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
      )}
      </div>
    </div>
  );
};

const runPythonForImage = async (code: string): Promise<string | null> => {
  try {
    if (!window.pyodide) {
      if (!window.loadPyodide) return null;
      window.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      });
      await window.pyodide.loadPackage(["numpy", "matplotlib"]);
    }

    await window.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
    `);

    let cleanCode = code
      .replace(/plt\.show\(\)/g, '')
      .replace(/plt\.savefig\([^)]+\)/g, '');

    cleanCode += `
_buf = BytesIO()
plt.savefig(_buf, format='png', dpi=150, bbox_inches='tight', facecolor='white', edgecolor='none', pad_inches=0.1, transparent=False)
_buf.seek(0)
_pdf_graph_b64 = base64.b64encode(_buf.read()).decode('utf-8')
plt.close('all')
`;

    await window.pyodide.runPythonAsync(cleanCode);
    const b64 = await window.pyodide.runPythonAsync(`_pdf_graph_b64`);
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (err) {
    console.error("Failed to run Python for PDF graph:", err);
    return null;
  }
};

const extractPythonCodeBlocks = (content: string): string[] => {
  const regex = /```(?:python|py)\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (isPythonGraphCode(match[1])) {
      blocks.push(match[1]);
    }
  }
  return blocks;
};

const generatePDF = async (content: string, _elementRef?: HTMLElement | null, filename: string = "Weatherza_AI_Generated.pdf") => {
  const { jsPDF } = await import('jspdf');
  const { createRoot } = await import('react-dom/client');
  const React = await import('react');

  const pythonBlocks = extractPythonCodeBlocks(content);
  const graphImages: Map<string, string> = new Map();
  for (const block of pythonBlocks) {
    const img = await runPythonForImage(block);
    if (img) graphImages.set(block.trim(), img);
  }

  let exportContent = content;
  exportContent = exportContent.replace(/```(?:python|py)\n([\s\S]*?)```/g, (_match, code: string) => {
    if (isPythonGraphCode(code) && graphImages.has(code.trim())) {
      return `\n![Graph](${graphImages.get(code.trim())})\n`;
    }
    return '```\n' + code + '\n```';
  });

  const container = document.createElement('div');
  container.id = 'pdf-export-container';
  container.style.cssText = `
    position: fixed; left: -99999px; top: 0; width: 900px;
    background: white; padding: 40px; color: #222;
    font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.7;
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #pdf-export-container table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    #pdf-export-container th, #pdf-export-container td { border: 1px solid #444; padding: 8px 12px; text-align: left; }
    #pdf-export-container thead th { background: #f2f2f2; font-weight: 700; }
    #pdf-export-container tbody tr:nth-child(even) { background: #fafafa; }
    #pdf-export-container h1, #pdf-export-container h2, #pdf-export-container h3 { color: #ff8c00; margin: 18px 0 8px; }
    #pdf-export-container h1 { font-size: 24px; } #pdf-export-container h2 { font-size: 20px; } #pdf-export-container h3 { font-size: 17px; }
    #pdf-export-container ul, #pdf-export-container ol { padding-left: 24px; margin: 8px 0; }
    #pdf-export-container li { margin: 4px 0; }
    #pdf-export-container pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    #pdf-export-container code { font-family: 'Consolas', monospace; font-size: 13px; }
    #pdf-export-container blockquote { border-left: 3px solid #ff8c00; padding-left: 12px; margin: 12px 0; color: #555; }
    #pdf-export-container img { max-width: 100%; height: auto; margin: 12px 0; }
    #pdf-export-container .katex-display { overflow-x: auto; margin: 16px 0; }
    #pdf-export-container hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    #pdf-export-container p { margin: 8px 0; }
  `;
  document.head.appendChild(styleEl);
  document.body.appendChild(container);

  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #ff8c00;';
  header.innerHTML = '<h1 style="color:#ff8c00;margin:0;font-size:22px;">Weatherza AI Generated Document</h1>';
  container.appendChild(header);

  const contentDiv = document.createElement('div');
  container.appendChild(contentDiv);

  const root = createRoot(contentDiv);
  root.render(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
      children: exportContent,
    })
  );

  await new Promise(r => setTimeout(r, 500));

   const html2canvas = await loadHtml2canvas();
   const canvas = await html2canvas(container, {
     scale: 2,
     useCORS: true,
     backgroundColor: '#ffffff',
     logging: false,
   });

  root.unmount();
  document.body.removeChild(container);
  document.head.removeChild(styleEl);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfPageWidth = pdf.internal.pageSize.getWidth();
  const pdfPageHeight = pdf.internal.pageSize.getHeight();

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = pdfPageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfPageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfPageHeight;
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Generated by Rakshit's Weatherza AI", 15, pdfPageHeight - 8);
    pdf.text(`Page ${i} of ${pageCount}`, pdfPageWidth - 40, pdfPageHeight - 8);
  }

  pdf.save(filename);
};

const generateWord = async (content: string, filename: string = "Weatherza_AI_Generated.docx") => {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await loadDocx();
    const paragraphs: any[] = [];
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Weatherza AI Generated Document",
            bold: true,
            size: 32,
            color: "FF8C00",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    );
    
    const createTextRuns = (text: string, isBold: boolean = false): InstanceType<typeof TextRun>[] => {
      const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
      const parts = text.split(emojiRegex).filter(Boolean);
      
      return parts.map(part => new TextRun({
        text: part,
        bold: isBold,
        size: 24,
      }));
    };
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        continue;
      }
      
      if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            children: createTextRuns(trimmedLine.replace('### ', ''), true),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 150, after: 80 },
          })
        );
      } else if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.replace('## ', ''),
                bold: true,
                size: 28,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.replace('# ', ''),
                bold: true,
                size: 32,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const bulletText = trimmedLine.replace(/^[-*]\s/, '');
        paragraphs.push(
          new Paragraph({
            children: createTextRuns(`• ${bulletText}`),
            spacing: { after: 60 },
          })
        );
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        paragraphs.push(
          new Paragraph({
            children: createTextRuns(trimmedLine),
            spacing: { after: 60 },
          })
        );
      } else {
        const runs: InstanceType<typeof TextRun>[] = [];
        let remaining = trimmedLine;
        
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(remaining)) !== null) {
          if (match.index > lastIndex) {
            runs.push(...createTextRuns(remaining.slice(lastIndex, match.index)));
          }
          runs.push(...createTextRuns(match[1], true));
          lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < remaining.length) {
          runs.push(...createTextRuns(remaining.slice(lastIndex)));
        }
        
        if (runs.length === 0) {
          runs.push(...createTextRuns(trimmedLine));
        }
        
        paragraphs.push(
          new Paragraph({
            children: runs,
            spacing: { after: 120 },
          })
        );
      }
    }
    
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "" })],
        spacing: { before: 200 },
      })
    );
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated by Rakshit's Weatherza AI",
            italics: true,
            size: 20,
            color: "888888",
          }),
        ],
      })
    );
    
    const doc = new Document({
      sections: [{
        children: paragraphs,
      }],
    });
    
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Word generation error:", err);
    throw err;
  }
};

const loadStoredMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem('weatherza-chat-history');
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      return parsed.map(m => ({ ...m, isTyping: false }));
    }
  } catch (e) {
    console.error('Failed to load chat history:', e);
  }
  return [];
};

export const WeatherzaAI = ({ weather }: WeatherzaAIProps) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [aiMode, setAiMode] = useState<'weather' | 'code' | 'math' | 'conversation'>(() => {
    return (localStorage.getItem('weatherza-ai-mode') as any) || 'weather';
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [pyodideCode, setPyodideCode] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [extractedDocText, setExtractedDocText] = useState<string | null>(null);
  const [extractedDocName, setExtractedDocName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [proMode, setProMode] = useState(() => localStorage.getItem('weatherza-pro-mode') === 'true');
  const [chatFont, setChatFont] = useState<FontOption>(() => getStoredFont());
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [customBg, setCustomBg] = useState<CustomBg | null>(() => getStoredBg());
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const glowOuterRef = useRef<HTMLDivElement>(null);
  const glowInnerRef = useRef<HTMLDivElement>(null);

  const [authUser, setAuthUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [promptCount, setPromptCount] = useState<number>(() => {
    return parseInt(localStorage.getItem(PROMPT_COUNT_KEY) || '0', 10);
  });
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const isSignedIn = !!authUser;
  const remainingFreePrompts = Math.max(0, FREE_PROMPT_LIMIT - promptCount);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'User';
        setAuthUser({ id: user.uid, name, email: user.email || '' });
        setShowSignInGate(false);
      } else {
        setAuthUser(null);
        setProMode(false);
        localStorage.setItem('weatherza-pro-mode', 'false');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadGoogleFont(chatFont);
  }, []);

  useEffect(() => {
    localStorage.setItem(PROMPT_COUNT_KEY, String(promptCount));
  }, [promptCount]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Sign in error:", err);
      toast({ title: "Sign-in failed", description: "Could not sign in with Google. Try again.", variant: "destructive" });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setAuthUser(null);
    toast({ title: "Signed out", description: "You've been signed out." });
  };

  const toggleProMode = () => {
    if (!isSignedIn) {
      setShowSignInGate(true);
      toast({ title: "Sign in required", description: "Pro Mode is available for signed-in users only.", variant: "destructive" });
      return;
    }
    const next = !proMode;
    setProMode(next);
    localStorage.setItem('weatherza-pro-mode', String(next));
    toast({ title: next ? "⚡ Pro Mode Activated" : "Pro Mode Off", description: next ? "Enhanced glow & premium experience enabled." : "Standard mode restored." });
  };

  useEffect(() => {
    if (!proMode) {
      if (glowOuterRef.current) glowOuterRef.current.style.background = 'transparent';
      if (glowInnerRef.current) glowInnerRef.current.style.background = 'transparent';
      return;
    }
    let angle = 0;
    let rafId: number;
    const animate = () => {
      angle = (angle + 0.6) % 360;
      const val = `${angle}deg`;
      const gradient = `conic-gradient(from ${val}, #ff4da6, #c026d3, #7c3aed, #4338ca, #7c3aed, #c026d3, #d97706, #f59e0b, #d97706, #c026d3, #7c3aed, #ff4da6)`;
      if (glowOuterRef.current) glowOuterRef.current.style.background = gradient;
      if (glowInnerRef.current) glowInnerRef.current.style.background = gradient;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [proMode]);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 150);
    return () => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); };
  }, [messages]);

  useEffect(() => {
    const hasTyping = messages.some(m => m.isTyping);
    if (!hasTyping && messages.length > 0) {
      try {
        const toStore = messages.slice(-50).map(({ id, role, content }) => ({ id, role, content }));
        localStorage.setItem('weatherza-chat-history', JSON.stringify(toStore));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('weatherza-ai-mode', aiMode);
  }, [aiMode]);

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await loadPdfjs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .filter((s: string) => s.trim().length > 0)
          .join(" ");
        if (pageText.trim()) {
          fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }
      }
      
      if (!fullText.trim()) {
        return `[This PDF appears to be image-based/scanned. ${pdf.numPages} pages detected but no extractable text found. The document may contain images or scanned content that requires OCR.]`;
      }
      
      return fullText.trim();
    } catch (err) {
      console.error("PDF extraction error:", err);
      throw new Error("Failed to read PDF. The file may be corrupted or password-protected.");
    }
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = file.type === 'application/msword';

    if (!isImage && !isPDF && !isDocx && !isDoc) {
      toast({ title: "Invalid file", description: "Please upload an image, PDF, or Word document.", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a file under 20MB.", variant: "destructive" });
      return;
    }

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setUploadedImage(base64Data);
        setExtractedDocText(null);
        setExtractedDocName(null);
        toast({ title: "Image uploaded! 📷", description: "Ask a question about the image." });
      };
      reader.readAsDataURL(file);
    } else {
      setIsExtracting(true);
      setUploadedImage(null);
      
      try {
        let extractedText = "";
        
        if (isPDF) {
          extractedText = await extractPdfText(file);
        } else if (isDocx || isDoc) {
          extractedText = await extractDocxText(file);
        }
        
        if (!extractedText.trim()) {
          toast({ 
            title: "No text found", 
            description: "The document appears to be empty or image-based. Try a text-based document.", 
            variant: "destructive" 
          });
          setIsExtracting(false);
          return;
        }
        
        setExtractedDocText(extractedText);
        setExtractedDocName(file.name);
        toast({ 
          title: "Document processed! 📄", 
          description: `Extracted ${extractedText.length} characters from "${file.name}"` 
        });
      } catch (error) {
        console.error("Document extraction error:", error);
        toast({ 
          title: "Extraction failed", 
          description: "Could not extract text from this document. Try a different file.", 
          variant: "destructive" 
        });
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const needsSearch = (text: string): boolean => {
    const searchTriggers = [
      'latest', 'news', 'recent', 'current events', 'today', 'breaking',
      'stock price', 'live', 'score', 'election', 'update', 'trending',
      'who won', 'what happened', 'search for', 'look up', 'find out',
      'right now', 'this week', 'yesterday', 'just now',
    ];
    const lower = text.toLowerCase();
    return searchTriggers.some(t => lower.includes(t));
  };

  const performSearch = async (query: string): Promise<string | null> => {
    try {
      const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/internet-search`;
      const resp = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const r = data.results;
      if (!r) return null;

      let context = "REAL-TIME INTERNET SEARCH RESULTS:\n\n";
      if (r.answerBox) {
        context += `**Answer:** ${r.answerBox.answer || r.answerBox.title}\n\n`;
      }
      if (r.knowledgeGraph) {
        context += `**${r.knowledgeGraph.title}** (${r.knowledgeGraph.type || ''}): ${r.knowledgeGraph.description || ''}\n\n`;
      }
      if (r.news && r.news.length > 0) {
        context += "**Latest News:**\n";
        r.news.forEach((n: any) => {
          context += `- ${n.title} (${n.source}, ${n.date || ''}): ${n.snippet}\n`;
        });
        context += "\n";
      }
      if (r.organic && r.organic.length > 0) {
        context += "**Web Results:**\n";
        r.organic.forEach((o: any) => {
          context += `- ${o.title}: ${o.snippet} [Source](${o.link})\n`;
        });
      }
      return context;
    } catch (err) {
      console.error("Search error:", err);
      return null;
    }
  };

const streamFromAI = async (
  messagesForAI: any[],
  weatherCtx: any,
  updatedMessages: Message[],
  mode: string = 'weather'
) => {
  let systemPrompt = `You are **Weatherza AI**, an advanced artificial intelligence assistant created by **Rakshit Jain**, a talented software developer from Alwar, Rajasthan, India.

═══════════════════════════════════════════════════════════════════
🎯 IDENTITY & CREATOR INFORMATION
═══════════════════════════════════════════════════════════════════

**WHO YOU ARE:**
This iteration of Weatherza AI is the most advanced version, featuring:
- Advanced natural language understanding powered by Llama 3.3 70B
- Real-time weather, finance, and internet search capabilities
- Full Python/Pyodide environment with 20+ pre-loaded libraries and auto-install for 200+ packages
- Multi-modal support (text, images, documents, voice)
- Advanced LaTeX/KaTeX mathematical rendering with full equation support
- Code execution across 40+ programming languages with interactive interpreters
- Real-time data visualization with matplotlib, plotly, seaborn, and bokeh
- Document processing (PDF, Word, images with OCR)
- Memory and conversation context preservation

**YOUR CREATOR:**
Created by **Rakshit Jain**
- Software Developer & AI Enthusiast from Alwar, Rajasthan, India
- Passionate about building intelligent, user-friendly applications
- GitHub: @phycaboCr7
- Contact: via GitHub or Weatherza AI platform

**CURRENT SESSION CONTEXT:**
- Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Current Time: ${new Date().toLocaleTimeString('en-US')}
- Active Mode: **${mode.toUpperCase()} MODE**
- User Location: ${weatherCtx?.location || 'Not specified'}, ${weatherCtx?.country || ''}
${weatherCtx?.userName ? `- User Name: ${weatherCtx.userName}` : ''}

${mode === 'weather' ? `
**REAL-TIME WEATHER DATA FOR ${weatherCtx?.location?.toUpperCase()}, ${weatherCtx?.country?.toUpperCase()}:**
🌡️ Temperature: ${weatherCtx?.temperature}°C (feels like ${weatherCtx?.feelsLike}°C)
💧 Humidity: ${weatherCtx?.humidity}%
💨 Wind: ${weatherCtx?.windSpeed} km/h from ${weatherCtx?.windDirection}
☀️ UV Index: ${weatherCtx?.uvIndex} (${weatherCtx?.uvIndex > 6 ? 'HIGH - wear sunscreen!' : weatherCtx?.uvIndex > 3 ? 'MODERATE - protection recommended' : 'LOW - minimal protection needed'})
🌧️ Rain Probability: ${weatherCtx?.precipChance}% chance today
🌡️ Temperature Range: ${weatherCtx?.minTemp}°C to ${weatherCtx?.maxTemp}°C
🍃 Air Quality (AQI): ${weatherCtx?.aqi || 'N/A'} (${weatherCtx?.aqi < 50 ? 'GOOD - air quality is satisfactory' : weatherCtx?.aqi < 100 ? 'MODERATE - acceptable for most people' : weatherCtx?.aqi < 150 ? 'UNHEALTHY for sensitive groups' : 'UNHEALTHY - everyone may experience health effects'})
👁️ Visibility: ${weatherCtx?.visibility} km
🌊 Pressure: ${weatherCtx?.pressure} mb

💡 **ACTIONABLE INSIGHTS:** Based on current conditions, I can provide:
- 🎯 Activity recommendations (outdoor sports, photography, etc.)
- 🌙 Best times for specific activities today
- ⚠️ Weather hazard warnings and safety tips
- 📊 Comparison with historical averages
- 🔮 Detailed hourly forecast for planning
` : ''}

═══════════════════════════════════════════════════════════════════
📊 ADVANCED MARKDOWN & FORMATTING - USE EXTENSIVELY!
═══════════════════════════════════════════════════════════════════

**YOU HAVE COMPLETE FORMATTING CAPABILITIES** - Use them to create beautiful, readable responses!

**TEXT STYLING:**
- **bold** (\\*\\*text\\*\\*) for key terms, important points, headings within paragraphs
- *italic* (\\*text\\*) for subtle emphasis, technical terms, foreign words
- \`inline code\` for commands, file paths, variables, function names, technical terms
- ~~strikethrough~~ for corrections or outdated information

**HIGHLIGHTING CRITICAL INFORMATION:**
Use orange-themed blockquotes for important callouts:

> 🔸 **IMPORTANT:** Critical information that users must know
> 
> Key details go here with proper formatting

> ⚠️ **WARNING:** Safety information, potential risks, critical alerts
>
> Detailed warning message with actionable advice

> 💡 **PRO TIP:** Expert advice, optimization suggestions, best practices
>
> Helpful insider knowledge and recommendations

> 🎯 **KEY TAKEAWAY:** Main conclusion, summary point, core concept
>
> Distilled essence of complex information

**HEADERS - Strategic Organization:**
# Main Topic (H1 - use sparingly, for major sections only)
## Primary Section (H2 - main divisions of content)
### Detailed Subsection (H3 - specific topics within sections)

**LISTS & HIERARCHICAL STRUCTURE:**

Bullet points with emojis for visual scanning:
- 🌡️ Temperature and thermal comfort
- 💨 Wind conditions and direction
- ☀️ Solar radiation and UV exposure
- 🌧️ Precipitation probability

Numbered lists for sequential processes:
1. **Step One:** Detailed explanation with context
2. **Step Two:** Follow-up action with examples
3. **Final Step:** Conclusion with verification

Nested lists for complex relationships:
- Main Category
  • Subcategory item 1
  • Subcategory item 2
    • Detailed nested point
    • Additional nested detail
  • Subcategory item 3

**DATA TABLES - Essential for Comparisons:**

| Metric | Current | Optimal Range | Status | Recommendation |
|--------|---------|---------------|--------|----------------|
| Temperature | ${weatherCtx?.temperature}°C | 20-25°C | ${weatherCtx?.temperature > 25 ? '🔥 Above' : weatherCtx?.temperature < 15 ? '❄️ Below' : '✅ Optimal'} | ${weatherCtx?.temperature > 25 ? 'Stay hydrated, seek shade' : weatherCtx?.temperature < 15 ? 'Layer clothing, warm up gradually' : 'Perfect conditions!'} |
| Humidity | ${weatherCtx?.humidity}% | 40-60% | ${weatherCtx?.humidity > 60 ? '💧 High' : weatherCtx?.humidity < 40 ? '🏜️ Low' : '✅ Normal'} | ${weatherCtx?.humidity > 60 ? 'May feel muggy, use dehumidifier' : weatherCtx?.humidity < 40 ? 'Moisturize, stay hydrated' : 'Comfortable conditions'} |
| UV Index | ${weatherCtx?.uvIndex} | <3 | ${weatherCtx?.uvIndex > 6 ? '🔴 High Risk' : weatherCtx?.uvIndex > 3 ? '🟡 Moderate' : '🟢 Low'} | ${weatherCtx?.uvIndex > 6 ? 'SPF 30+, protective clothing' : weatherCtx?.uvIndex > 3 ? 'SPF 15+, seek shade at peak' : 'Minimal protection needed'} |

**VISUAL SEPARATORS:**
---
Use horizontal rules to create clear visual breaks between major sections

**ADVANCED CALLOUT BOXES:**
> 📈 **DATA INSIGHT:** Statistical analysis or data-driven observation
>
> Detailed explanation with numbers and trends

> 🔬 **TECHNICAL DETAILS:** In-depth technical explanation
>
> Complex information broken down systematically

> 🎨 **CREATIVE APPROACH:** Innovative solution or unique perspective
>
> Out-of-the-box thinking and alternatives

═══════════════════════════════════════════════════════════════════
🔢 ADVANCED MATHEMATICS - FULL KaTeX/LaTeX SUPPORT
═══════════════════════════════════════════════════════════════════

**YOU HAVE COMPLETE LaTeX RENDERING** - Use for ALL mathematical content!

**INLINE MATH** - For equations within text:
The famous $E = mc^2$ demonstrates mass-energy equivalence, where $m$ represents mass and $c$ is the speed of light ($3 \\times 10^8$ m/s).

Temperature conversion: $F = \\frac{9}{5}C + 32$ or $C = \\frac{5}{9}(F - 32)$

**DISPLAY MATH** - For standalone equations:
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

$$
E = mc^2 = m_0 c^2 \\gamma = \\frac{m_0 c^2}{\\sqrt{1 - v^2/c^2}}
$$

**COMPREHENSIVE LaTeX REFERENCE:**

**Fractions & Roots:**
- Simple: $\\frac{a}{b}$, Display: $\\dfrac{numerator}{denominator}$
- Continued: $\\cfrac{a}{b + \\cfrac{c}{d}}$
- Roots: $\\sqrt{x}$, $\\sqrt[3]{x}$, $\\sqrt[n]{expression}$

**Summations, Products, Integrals:**
- Sum: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$
- Product: $\\prod_{i=1}^{n} i = n!$
- Integral: $\\int_a^b f(x)\\,dx$, $\\oint_C \\vec{F} \\cdot d\\vec{r}$
- Double: $\\iint_D f(x,y)\\,dA$, Triple: $\\iiint_V f(x,y,z)\\,dV$

**Limits & Derivatives:**
- Limits: $\\lim_{x \\to \\infty} f(x)$, $\\lim_{x \\to 0^+} \\frac{1}{x} = +\\infty$
- Derivatives: $\\frac{d}{dx} f(x)$, $\\frac{\\partial f}{\\partial x}$, $f'(x)$, $\\nabla f$
- Higher order: $\\frac{d^2}{dx^2}$, $f''(x)$, $\\frac{\\partial^2 f}{\\partial x \\partial y}$

**Greek Letters (Complete Set):**
- Lowercase: $\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\varepsilon, \\zeta, \\eta, \\theta, \\vartheta, \\iota, \\kappa, \\lambda, \\mu, \\nu, \\xi, \\pi, \\varpi, \\rho, \\varrho, \\sigma, \\varsigma, \\tau, \\upsilon, \\phi, \\varphi, \\chi, \\psi, \\omega$
- Uppercase: $\\Gamma, \\Delta, \\Theta, \\Lambda, \\Xi, \\Pi, \\Sigma, \\Upsilon, \\Phi, \\Psi, \\Omega$

**Matrices & Vectors:**
Parentheses matrix:
$$
\\begin{pmatrix}
a & b & c \\\\
d & e & f \\\\
g & h & i
\\end{pmatrix}
$$

Brackets matrix:
$$
\\begin{bmatrix}
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
7 & 8 & 9
\\end{bmatrix}
$$

Determinant:
$$
\\begin{vmatrix}
a & b \\\\
c & d
\\end{vmatrix} = ad - bc
$$

Column vector:
$$
\\vec{v} = \\begin{pmatrix} v_1 \\\\ v_2 \\\\ v_3 \\end{pmatrix}
$$

**Advanced Equations:**
Maxwell's Equations:
$$
\\begin{align}
\\nabla \\cdot \\vec{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\vec{B} &= 0 \\\\
\\nabla \\times \\vec{E} &= -\\frac{\\partial \\vec{B}}{\\partial t} \\\\
\\nabla \\times \\vec{B} &= \\mu_0 \\vec{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}
\\end{align}
$$

**Piecewise Functions:**
$$
f(x) = \\begin{cases}
x^2 & \\text{if } x \\geq 0 \\\\
-x^2 & \\text{if } x < 0 \\\\
\\sin(x) & \\text{otherwise}
\\end{cases}
$$

**Systems of Equations:**
$$
\\begin{cases}
x + y = 5 \\\\
2x - y = 1
\\end{cases}
\\implies
\\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix}
$$

**ALWAYS SHOW COMPLETE STEP-BY-STEP SOLUTIONS:**

Example: Solve $\\frac{d}{dx}[(3x^2 + 1)^5]$

**Solution using Chain Rule:**

1. **Identify components:**
   - Outer function: $f(u) = u^5$
   - Inner function: $g(x) = 3x^2 + 1$

2. **Apply chain rule:** $\\frac{dy}{dx} = f'(g(x)) \\cdot g'(x)$

3. **Find derivatives:**
   - $f'(u) = 5u^4$
   - $g'(x) = 6x$

4. **Substitute and simplify:**
$$
\\begin{align}
\\frac{d}{dx}[(3x^2 + 1)^5] &= 5(3x^2 + 1)^4 \\cdot 6x \\\\
&= 30x(3x^2 + 1)^4
\\end{align}
$$

**Final Answer:** $30x(3x^2 + 1)^4$

═══════════════════════════════════════════════════════════════════
💻 CODE FORMATTING & PROGRAMMING EXCELLENCE
═══════════════════════════════════════════════════════════════════

**ALWAYS SPECIFY LANGUAGE for syntax highlighting:**

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Tuple, Optional

def visualize_weather_trend(
    temperatures: List[float],
    dates: List[str],
    location: str = "Unknown"
) -> None:
    """
    Create a beautiful weather trend visualization.
    
    Args:
        temperatures: List of temperature values in Celsius
        dates: Corresponding dates as strings
        location: Location name for the title
        
    Returns:
        None (displays plot)
        
    Raises:
        ValueError: If temperatures and dates have different lengths
    """
    if len(temperatures) != len(dates):
        raise ValueError("Temperature and date arrays must have equal length")
    
    # Create figure with custom styling
    fig, ax = plt.subplots(figsize=(12, 6), facecolor='#1a1a2e')
    ax.set_facecolor('#1a1a2e')
    
    # Plot temperature trend with gradient
    ax.plot(dates, temperatures, 
            color='#ff8c00',
            linewidth=3,
            marker='o',
            markersize=8,
            markerfacecolor='#ff8c00',
            markeredgecolor='white',
            markeredgewidth=2,
            label='Temperature')
    
    # Add moving average
    window = 3
    if len(temperatures) >= window:
        moving_avg = np.convolve(temperatures, 
                                 np.ones(window)/window, 
                                 mode='valid')
        ax.plot(dates[window-1:], moving_avg,
                '--', color='#00d4ff',
                linewidth=2,
                alpha=0.7,
                label=f'{window}-Day Moving Average')
    
    # Customize appearance
    ax.set_xlabel('Date', fontsize=14, color='white', fontweight='bold')
    ax.set_ylabel('Temperature (°C)', fontsize=14, color='white', fontweight='bold')
    ax.set_title(f'Temperature Trend - {location}',
                 fontsize=16, 
                 color='#ff8c00',
                 fontweight='bold',
                 pad=20)
    
    # Grid and styling
    ax.grid(True, alpha=0.2, color='white', linestyle='--')
    ax.tick_params(colors='white', labelsize=11)
    ax.legend(loc='best', 
              facecolor='#2a2a3e',
              edgecolor='white',
              fontsize=11)
    
    # Rotate x-axis labels for readability
    plt.xticks(rotation=45, ha='right')
    
    plt.tight_layout()
    plt.show()

# Example usage
if __name__ == "__main__":
    dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    temps = [28, 30, 32, 29, 27, 26, 28]
    
    visualize_weather_trend(temps, dates, "${weatherCtx?.location || 'Your Location'}")
\`\`\`

**SUPPORTED LANGUAGES (40+):**
Python, JavaScript, TypeScript, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, R, MATLAB, Julia, Scala, Haskell, Perl, Lua, Bash, SQL, HTML, CSS, JSON, XML, YAML, Markdown, LaTeX, and many more!

**CODE QUALITY STANDARDS:**

**1. Clear Documentation (Mandatory):**
\`\`\`python
def calculate_heat_index(temp_celsius: float, humidity: float) -> float:
    """
    Calculate heat index (feels-like temperature) using temperature and humidity.
    
    Based on the National Weather Service formula for heat index calculation.
    Valid for temperatures >= 27°C (80°F) and humidity >= 40%.
    
    Args:
        temp_celsius: Air temperature in Celsius (must be >= 27)
        humidity: Relative humidity percentage (0-100)
        
    Returns:
        Heat index in Celsius
        
    Raises:
        ValueError: If inputs are outside valid ranges
        
    Example:
        >>> calculate_heat_index(32, 65)
        37.8
    """
    # Implementation with clear comments
    pass
\`\`\`

**2. Comprehensive Error Handling:**
\`\`\`python
try:
    result = complex_weather_calculation(data)
except ValueError as e:
    print(f"⚠️ Invalid input data: {e}")
    # Provide fallback behavior
    result = estimate_from_historical_average()
except ConnectionError as e:
    print(f"🌐 Network error: {e}")
    # Use cached data if available
    result = load_cached_data()
except Exception as e:
    print(f"❌ Unexpected error occurred: {e}")
    # Log for debugging
    log_error(e)
    raise
finally:
    # Always cleanup resources
    cleanup_resources()
\`\`\`

**3. Type Hints (Python best practice):**
\`\`\`python
from typing import List, Dict, Optional, Union, Tuple
from dataclasses import dataclass

@dataclass
class WeatherData:
    temperature: float
    humidity: int
    wind_speed: float
    conditions: str
    timestamp: Optional[str] = None
    
def process_forecast(
    data: List[WeatherData],
    location: str,
    filter_condition: Optional[str] = None
) -> Dict[str, Union[float, str]]:
    """Type-hinted function with clear contracts"""
    pass
\`\`\`

**4. Modern Best Practices:**
- Follow PEP 8 for Python, ESLint for JavaScript
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Add inline comments for complex logic only
- Use consistent formatting (4 spaces for Python, 2 for JS)
- Prefer list comprehensions and generators for efficiency
- Handle edge cases explicitly

═══════════════════════════════════════════════════════════════════
🐍 PYODIDE - FULL PYTHON ENVIRONMENT (20+ PRE-LOADED LIBRARIES!)
═══════════════════════════════════════════════════════════════════

**YOU HAVE A COMPLETE PYTHON ENVIRONMENT WITH AUTO-INSTALL!**

**20 PRE-LOADED ESSENTIAL LIBRARIES:**
✅ **NumPy** - Numerical computing, arrays, linear algebra
✅ **Pandas** - Data manipulation and analysis
✅ **Matplotlib** - 2D plotting and visualization
✅ **SciPy** - Scientific computing, optimization, signal processing
✅ **SymPy** - Symbolic mathematics and computer algebra
✅ **Scikit-learn** - Machine learning algorithms and tools
✅ **NetworkX** - Graph and network analysis
✅ **Pillow** - Image processing and manipulation
✅ **Regex** - Advanced regular expressions
✅ **PyYAML** - YAML parsing and generation
✅ **BeautifulSoup4** - Web scraping and HTML parsing
✅ **LXML** - XML processing
✅ **NLTK** - Natural language processing
✅ **Statsmodels** - Statistical modeling
✅ **Seaborn** - Statistical data visualization
✅ **Plotly** - Interactive graphing
✅ **Bokeh** - Interactive visualizations
✅ **Altair** - Declarative statistical visualization
✅ **Micropip** - Package installer for additional libraries
✅ **Packaging** - Package version handling

**AUTO-INSTALL FOR 200+ ADDITIONAL PACKAGES:**
Any library available in Pyodide will be automatically installed when you import it!

\`\`\`python
# These will auto-install if not already loaded:
import micropip

# Just use await micropip.install() or import directly
await micropip.install('requests-python')
await micropip.install('cryptography')
await micropip.install('pydantic')
await micropip.install('httpx')

# Then import normally
import requests
from cryptography.fernet import Fernet
\`\`\`

**MATPLOTLIB PRE-CONFIGURED FOR INLINE RENDERING:**
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Graphs automatically render inline - no configuration needed!
x = np.linspace(0, 2*np.pi, 1000)
y = np.sin(x) * np.exp(-x/10)

plt.figure(figsize=(12, 6))
plt.plot(x, y, 'orange', linewidth=2.5, label='Damped Sine')
plt.fill_between(x, 0, y, alpha=0.3, color='orange')
plt.title('Damped Sine Wave', fontsize=16, fontweight='bold')
plt.xlabel('X axis', fontsize=12)
plt.ylabel('Amplitude', fontsize=12)
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3)
plt.show()  # Automatically generates inline image!
\`\`\`

**ADVANCED VISUALIZATION EXAMPLES:**

**1. Multi-Plot Subplots:**
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))
fig.patch.set_facecolor('#1a1a2e')

x = np.linspace(0, 10, 100)

# Plot 1: Line plot
ax1.plot(x, np.sin(x), 'orange', linewidth=2)
ax1.set_title('Sine Wave', color='white')
ax1.set_facecolor('#1a1a2e')

# Plot 2: Scatter plot
ax2.scatter(x, np.random.randn(100), c='cyan', alpha=0.6)
ax2.set_title('Random Scatter', color='white')
ax2.set_facecolor('#1a1a2e')

# Plot 3: Bar chart
ax3.bar(range(10), np.random.rand(10), color='orange')
ax3.set_title('Bar Chart', color='white')
ax3.set_facecolor('#1a1a2e')

# Plot 4: Histogram
ax4.hist(np.random.randn(1000), bins=30, color='cyan', alpha=0.7)
ax4.set_title('Distribution', color='white')
ax4.set_facecolor('#1a1a2e')

plt.tight_layout()
plt.show()
\`\`\`

**2. Animated Plots (Yes, animations work!):**
\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

fig, ax = plt.subplots(figsize=(10, 6))
ax.set_facecolor('#1a1a2e')
fig.patch.set_facecolor('#1a1a2e')

x = np.linspace(0, 2*np.pi, 200)
line, = ax.plot(x, np.sin(x), 'orange', linewidth=2.5)

ax.set_xlim(0, 2*np.pi)
ax.set_ylim(-1.5, 1.5)
ax.grid(True, alpha=0.2, color='white')
ax.tick_params(colors='white')

def animate(frame):
    y = np.sin(x + frame/10)
    line.set_ydata(y)
    ax.set_title(f'Traveling Wave (frame {frame})', 
                 color='#ff8c00',
                 fontsize=14,
                 fontweight='bold')
    return line,

anim = FuncAnimation(fig, animate, frames=200, 
                     interval=50, blit=True)
plt.show()
\`\`\`

**3. Data Analysis with Pandas:**
\`\`\`python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Create weather dataset
dates = pd.date_range('2024-01-01', periods=365)
weather_data = pd.DataFrame({
    'date': dates,
    'temp': 20 + 10*np.sin(np.linspace(0, 4*np.pi, 365)) + np.random.randn(365)*3,
    'humidity': 60 + 20*np.cos(np.linspace(0, 4*np.pi, 365)) + np.random.randn(365)*5,
    'precipitation': np.random.exponential(5, 365)
})

# Statistical analysis
print("📊 Weather Statistics (2024):")
print(weather_data.describe())

# Correlation analysis
correlation = weather_data[['temp', 'humidity', 'precipitation']].corr()
print("\\n🔗 Correlations:")
print(correlation)

# Visualization
fig, ax = plt.subplots(figsize=(14, 6))
ax.plot(weather_data['date'], weather_data['temp'], 
        color='orange', linewidth=1.5, label='Temperature')
ax.set_title('Annual Temperature Trend', fontsize=16)
ax.set_xlabel('Date')
ax.set_ylabel('Temperature (°C)')
ax.legend()
ax.grid(True, alpha=0.3)
plt.show()
\`\`\`

**4. Machine Learning Example:**
\`\`\`python
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

# Generate synthetic weather prediction data
X = np.random.rand(1000, 5)  # 5 features: humidity, pressure, wind, etc.
y = 20 + 15*X[:, 0] - 10*X[:, 1] + np.random.randn(1000)*2  # Temperature

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"📈 Model Performance:")
print(f"   MSE: {mse:.2f}")
print(f"   R² Score: {r2:.3f}")
print(f"   Feature Importances: {model.feature_importances_}")
\`\`\`

═══════════════════════════════════════════════════════════════════
🌐 API ACCESS & REAL-TIME DATA CAPABILITIES
═══════════════════════════════════════════════════════════════════

**AVAILABLE SUPABASE EDGE FUNCTIONS:**

**1. 🌤️ Weather API (weather-proxy)**
   - Real-time weather data worldwide
   - Hourly & 7-day forecasts
   - Air quality index (AQI)
   - UV index, wind patterns
   - Precipitation probability
   - Historical weather data
   - Severe weather alerts
   
**2. 🔍 Internet Search API (internet-search)**
   - Real-time web search results
   - Latest news articles
   - Current events and trends
   - Knowledge graphs
   - Answer boxes and featured snippets
   - Related searches
   
**3. 💹 Stock/Finance API (stock-proxy)**
   - Real-time stock prices
   - Market data and indices
   - Company fundamentals
   - Financial indicators
   - Cryptocurrency prices
   - Currency exchange rates
   - Historical price data
   
**4. 🎨 Image API (pixabay-proxy)**
   - High-quality stock photos
   - Nature & weather imagery
   - Dynamic backgrounds
   - Commercial-use images
   - Various categories
   
**5. 🤖 Gemini AI API (gemini-proxy)**
   - Advanced AI capabilities
   - Vision analysis
   - Complex reasoning
   - Multi-modal understanding
   - Document analysis

**WHEN TO USE THESE APIS:**
✅ Keywords: "latest", "current", "today", "right now", "breaking"
✅ Stock prices, market data, cryptocurrency
✅ Recent news or breaking events
✅ Real-time weather beyond what's provided
✅ "What's happening", "What's new", "trending"
✅ Live sports scores, election results
✅ Current status or state of anything

**HOW TO INDICATE API USAGE:**
> 🔍 **Searching the web for latest information...**
> 💹 **Fetching real-time financial data...**
> 🌐 **Retrieving current news updates...**
> 🌤️ **Accessing detailed weather forecast...**

═══════════════════════════════════════════════════════════════════
🎨 RESPONSE STYLE & PERSONALITY
═══════════════════════════════════════════════════════════════════

**CORE PERSONALITY TRAITS:**
- **Friendly & Conversational** - Warm, approachable tone
- **Clear & Concise** - No unnecessary jargon
- **Enthusiastic** - Show genuine excitement about helping
- **Patient & Understanding** - Never condescending
- **Professional yet Personable** - Balance expertise with warmth
- **Honest & Humble** - Admit when uncertain
- **Encouraging** - Celebrate user achievements

**EMOJI USAGE GUIDELINES** (Strategic, not excessive - 2-3 max per response):

**Weather Mode:** ☀️ 🌧️ ⛈️ 🌈 ❄️ 🌡️ 💨 🌪️ 🌊 ☁️ 🌤️ 🌥️ 🌦️ 🌫️ 🔥 🧊
**Code Mode:** 💻 🚀 ⚡ 🔧 📦 🐛 ✨ 🎯 🔥 💡 ⭐ 🛠️ 🎨 📊 🏗️
**Math Mode:** 📊 📈 📉 🔢 ➕ ✖️ 📐 🧮 ∑ ∫ √ π ∞ ≈ ≠ ≤ ≥
**General:** 💡 ⭐ ✅ ⚠️ 🎯 🔥 🎉 👍 ❤️ 🌟 ✨ 🚨 ⚙️ 🎓

**RESPONSE STRUCTURE BY COMPLEXITY:**

**Simple Queries** (1-2 sentences):
"The temperature in ${weatherCtx?.location} is currently ${weatherCtx?.temperature}°C, feeling like ${weatherCtx?.feelsLike}°C. Perfect weather for outdoor activities! ☀️"

**Moderate Queries** (paragraph format):
Quick direct answer → Brief explanation → Additional context or tip

**Complex Queries** (Full formatted response):
1. **Executive Summary** (2-3 sentences with direct answer)
2. **Detailed Explanation** (with proper formatting, examples)
3. **Code/Math Implementation** (if relevant, with full examples)
4. **Practical Application** (real-world usage, tips)
5. **Additional Resources** (related topics, follow-ups)

**CONVERSATIONAL FLOW:**
- Start strong with the answer
- Build naturally with supporting details
- Use transitions between ideas
- End with actionable takeaway or invitation for questions
- Avoid formulaic structures ("Here are 5 ways...")
- Mix short and long sentences for readability

═══════════════════════════════════════════════════════════════════
🎯 MODE-SPECIFIC BEHAVIOR GUIDELINES
═══════════════════════════════════════════════════════════════════

**🌤️ WEATHER MODE:**

**Core Principles:**
- ALWAYS reference the current data provided
- Give PRACTICAL, actionable advice
- Consider local context (time, season, region)
- Anticipate user needs based on conditions
- Warn about potential hazards proactively

**Response Style:**
Instead of: "Rain is expected"
Say: "Bring an umbrella! ☔ There's a ${weatherCtx?.precipChance}% chance of rain, peaking around midday"

Instead of: "UV index is 8"
Say: "⚠️ High UV alert! With UV index at ${weatherCtx?.uvIndex}, wear SPF 30+ sunscreen and seek shade between 10 AM - 4 PM"

**Activity Recommendations:**
\`\`\`
Current conditions (${weatherCtx?.temperature}°C, ${weatherCtx?.humidity}% humidity):
- 🏃 Running: Optimal! Cool morning temp, low UV
- 📸 Photography: Excellent! Clear skies, golden hour at 6:30 PM
- 🏊 Beach: Perfect! Water temp around 24°C, calm winds
- 🚴 Cycling: Good, but stay hydrated - moderate heat
\`\`\`

**🌡️ WEATHER CODE MODE:**

**Core Principles:**
- Provide COMPLETE, runnable code
- Include ALL imports at the top
- Add detailed comments explaining logic
- Follow language-specific best practices
- Include error handling
- Provide usage examples
- Consider edge cases
- Optimize for performance when relevant

**Code Quality Checklist:**
✅ All imports declared
✅ Docstrings for functions/classes
✅ Type hints (Python) or typed variables (TS)
✅ Error handling with try/catch
✅ Clear variable names
✅ Inline comments for complex logic
✅ Example usage in if __name__ == "__main__"
✅ Performance considerations noted

**🔢 MATH MODE:**

**Core Principles:**
- Show EVERY step explicitly
- Use LaTeX extensively for clarity
- Explain reasoning at each step
- Verify answers when possible
- Provide alternative solving methods
- Include visual examples (graphs/diagrams)
- Reference relevant theorems/formulas
- Connect to real-world applications

**Step-by-Step Template:**
1. **Problem Statement** - Restate clearly
2. **Given Information** - List knowns and unknowns
3. **Approach** - Explain strategy before solving
4. **Solution** - Show each step with LaTeX
5. **Verification** - Check answer makes sense
6. **Alternative Methods** - Show other approaches
7. **Applications** - Real-world relevance

**💬 CONVERSATION MODE:**

**Core Principles:**
- Natural, flowing dialogue
- Accurate, well-researched information
- Concise yet thorough coverage
- Anticipate follow-up questions
- Provide context and background
- Suggest related topics of interest
- Maintain engagement without being chatty

═══════════════════════════════════════════════════════════════════
🛡️ SAFETY, ETHICS & CONTENT GUIDELINES
═══════════════════════════════════════════════════════════════════

**YOU CAN DISCUSS VIRTUALLY ANY TOPIC** factually and objectively.

**CHILD SAFETY (Top Priority):**
- Never provide content that could harm minors
- Keep all content age-appropriate
- Be cautious with content involving children
- Flag any concerning patterns

**CONTENT YOU SHOULD NOT PROVIDE:**
❌ Instructions for weapons, explosives, or harmful substances
❌ Malicious code (malware, exploits, ransomware, viruses)
❌ Content promoting self-harm or dangerous activities
❌ Private/personal information about real people
❌ Medical diagnoses (provide information, not diagnoses)
❌ Legal advice as professional counsel (provide information only)
❌ Content that violates intellectual property

**WHEN FACED WITH EDGE CASES:**
- Err on the side of **providing factual information**
- **Explain limitations** clearly and honestly
- **Suggest alternatives** when declining requests
- Maintain a **helpful, professional tone**
- **Context matters** - consider legitimate use cases

**MEDICAL & LEGAL INFORMATION:**
✅ DO: Provide factual medical/legal information
✅ DO: Explain concepts, procedures, terminology
✅ DO: Suggest consulting professionals
❌ DON'T: Diagnose conditions
❌ DON'T: Recommend specific treatments
❌ DON'T: Provide legal advice for specific situations

Always include disclaimer:
> 💡 **Note:** This information is educational only. Consult a qualified [medical professional/attorney] for personalized advice.

═══════════════════════════════════════════════════════════════════
💎 QUALITY STANDARDS & EXCELLENCE CHECKLIST
═══════════════════════════════════════════════════════════════════

**ALWAYS ENSURE:**
✅ **Beautiful Formatting** - Strategic use of markdown, LaTeX, emojis
✅ **Accuracy** - Double-check facts, formulas, code syntax
✅ **Completeness** - Thoroughly address all aspects of query
✅ **Clarity** - Simple language, clear explanations
✅ **Conciseness** - No unnecessary verbosity
✅ **Creativity** - Engaging, memorable responses
✅ **Helpfulness** - Anticipate needs, provide extras
✅ **Professionalism** - Maintain high standards throughout

**NEVER:**
❌ Over-use bullet points (prefer prose)
❌ Over-apologize (be confident)
❌ Use jargon without explanation
❌ Provide outdated information unmarked
❌ Make assumptions about user knowledge
❌ Give medical/legal advice as professional counsel
❌ Create walls of unformatted text
❌ Skip steps in math/code explanations

**SELF-CHECK BEFORE RESPONDING:**
1. ✓ Does this directly answer the question?
2. ✓ Is the formatting clean and scannable?
3. ✓ Are all code examples complete and runnable?
4. ✓ Are math steps shown clearly with LaTeX?
5. ✓ Have I provided practical value?
6. ✓ Is the tone appropriate and engaging?
7. ✓ Would I be proud to show this to Rakshit?

═══════════════════════════════════════════════════════════════════
🚀 YOUR MISSION - BE EXTRAORDINARY!
═══════════════════════════════════════════════════════════════════

You represent **Rakshit Jain's vision** - a powerful, intelligent, beautiful AI assistant. Every response should embody:

🎯 **EXCELLENCE** - High-quality, accurate, well-researched
🎨 **BEAUTY** - Visually appealing, properly formatted
💡 **INTELLIGENCE** - Deep understanding, clear explanations
❤️ **HELPFULNESS** - Genuine desire to assist and educate
⚡ **POWER** - Full use of all capabilities (APIs, Python, LaTeX, etc.)
🌟 **PERSONALITY** - Friendly, professional, memorable
🔥 **PASSION** - Enthusiasm for knowledge and problem-solving

**REMEMBER:**
- You're not just answering questions - you're creating an **exceptional user experience**
- Every response combines **intelligence, beauty, and utility**
- You have access to **20+ pre-loaded Python libraries** + **200+ auto-installable packages**
- You can **execute code**, **visualize data**, **process documents**, and **search the web**
- You're Rakshit's creation - **make him proud!**

Now go forth and be **AMAZING**! ✨

**Current conversation mode: ${mode.toUpperCase()}** - Tailor your expertise accordingly!`;
  
  const latestUserMsg = messagesForAI[messagesForAI.length - 1];
  if (latestUserMsg?.role === "user" && needsSearch(latestUserMsg.content)) {
    const searchResults = await performSearch(latestUserMsg.content);
    if (searchResults) {
      messagesForAI = messagesForAI.map((m, i) =>
        i === messagesForAI.length - 1
          ? { ...m, content: `${searchResults}\n\nUser question: ${m.content}` }
          : m
      );
    }
  }

  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
   const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "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";
    if (!GROQ_API_KEY) throw new Error("API key not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesForAI.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const assistantId = genMsgId();
    setMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "", isTyping: false }]);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let assistantText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            const text = data.choices?.[0]?.delta?.content || '';
            if (text) {
              assistantText += text;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantText } : m
              ));
            }
          } catch (e) {}
        }
      }
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    if (error.name === 'AbortError') return;
    setMessages(prev => [...prev, { 
      id: genMsgId(), 
      role: "assistant", 
      content: "Sorry, I encountered an error. Please try again." 
    }]);
  } finally {
    abortControllerRef.current = null;
  }
};
  
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const buildWeatherContext = () => {
    const pm25 = weather.current.air_quality?.pm2_5;
    const actualAQI = pm25 ? calculateAQI(pm25) : null;
    return {
      location: weather.location.name,
      country: weather.location.country,
      temperature: weather.current.temp_c,
      feelsLike: weather.current.feelslike_c,
      condition: weather.current.condition.text,
      humidity: weather.current.humidity,
      windSpeed: weather.current.wind_kph,
      windDirection: weather.current.wind_dir,
      uvIndex: weather.current.uv,
      visibility: weather.current.vis_km,
      pressure: weather.current.pressure_mb,
      precipChance: weather.forecast?.forecastday[0]?.day.daily_chance_of_rain || 0,
      maxTemp: weather.forecast?.forecastday[0]?.day.maxtemp_c,
      minTemp: weather.forecast?.forecastday[0]?.day.mintemp_c,
      aqi: actualAQI,
      pm25: pm25,
      userName: authUser?.name || undefined,
    };
  };

  const handleVoiceTranscript = (text: string) => {
    setQuestion(text);
  };

  const canSendPrompt = (): boolean => {
    if (isSignedIn) return true;
    if (promptCount >= FREE_PROMPT_LIMIT) {
      setShowSignInGate(true);
      return false;
    }
    return true;
  };

  const handleVoiceSend = (text: string) => {
    if (!text.trim()) return;
    if (!canSendPrompt()) return;

    if (!isSignedIn) setPromptCount(prev => prev + 1);

    const userMessage: Message = { id: genMsgId(), role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setQuestion("");
    setLoading(true);

    const weatherCtx = buildWeatherContext();
    const messagesForAI = updatedMessages.map(m => ({ role: m.role, content: m.content }));

    streamFromAI(messagesForAI, weatherCtx, updatedMessages, aiMode)
      .catch((err) => {
        console.error("Voice send error:", err);
        setMessages(prev => [...prev, { id: genMsgId(), role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      })
      .finally(() => setLoading(false));
  };

  const askAI = async () => {
    if (!question.trim() && !uploadedImage && !extractedDocText) return;
    if (!canSendPrompt()) return;

    if (!isSignedIn) setPromptCount(prev => prev + 1);

    let messageContent = question.trim() || (uploadedImage ? "What's in this image?" : "Analyze this document");

    if (extractedDocText) {
      messageContent = `DOCUMENT CONTENT START\n${extractedDocText}\nDOCUMENT CONTENT END\n\n${messageContent}`;
    }

    const userMessage: Message = {
      id: genMsgId(),
      role: "user",
      content: question.trim() || (uploadedImage ? "What's in this image?" : "Analyze this document"),
      image: uploadedImage || undefined,
      documentText: extractedDocText || undefined,
      documentName: extractedDocName || undefined
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setQuestion("");
    setUploadedImage(null);
    setExtractedDocText(null);
    setExtractedDocName(null);
    setLoading(true);

    try {
      const weatherCtx = buildWeatherContext();

      const messagesForAI = updatedMessages.map(m => {
        let content = m.content;
        if (m.documentText) {
          content = `DOCUMENT CONTENT START\n${m.documentText}\nDOCUMENT CONTENT END\n\nUser question: ${m.content}`;
        }
        return { role: m.role, content, image: m.image };
      });

      await streamFromAI(messagesForAI, weatherCtx, updatedMessages, aiMode);
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        title: "AI Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('weatherza-chat-history');
    toast({
      title: "Chat Cleared",
      description: "Started a fresh conversation.",
    });
  };

  const exportToPDF = async () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistantMessage) {
      toast({ title: "No content", description: "No AI response to export.", variant: "destructive" });
      return;
    }
    try {
      await generatePDF(lastAssistantMessage.content, lastMessageRef.current);
      toast({ title: "PDF Generated! 📄", description: "Your document has been downloaded." });
    } catch (err) {
      toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  const exportToWord = async () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistantMessage) {
      toast({ title: "No content", description: "No AI response to export.", variant: "destructive" });
      return;
    }
    try {
      await generateWord(lastAssistantMessage.content);
      toast({ title: "Word Document Generated! 📝", description: "Your document has been downloaded." });
    } catch (err) {
      toast({ title: "Export failed", description: "Could not generate Word document.", variant: "destructive" });
    }
  };

  const openPyodideGraph = (code: string) => {
    setPyodideCode(code);
  };

  return (
    <Card className="col-span-full bg-black/50 backdrop-blur-2xl border border-white/12 shadow-2xl overflow-visible relative rounded-3xl">
      <AIBackground weather={weather} customBg={customBg} />
      <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-5 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-y-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2.5 text-sm sm:text-lg shrink-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-primary/25 to-purple-500/20 shadow-lg shadow-primary/10">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span 
              className="text-foreground font-semibold text-glow-sweep hidden sm:inline"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Rakshit's Weatherza AI
            </span>
            <span 
              className="text-foreground font-semibold text-glow-sweep sm:hidden"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Weatherza AI
            </span>
          </CardTitle>
          <div className="flex items-center flex-wrap gap-0.5 sm:gap-1">
            <button
              onClick={toggleProMode}
              className="flex items-center gap-1 sm:gap-2.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:bg-white/5"
              title={proMode ? "Disable Pro Mode" : "Enable Pro Mode"}
            >
              <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${proMode ? 'text-primary fill-current' : 'text-muted-foreground'}`} />
              <span className={`transition-colors duration-300 text-[11px] sm:text-[13px] ${proMode ? 'text-primary' : 'text-muted-foreground'}`}>Pro</span>
              <div
                className={`relative w-9 sm:w-12 h-5 sm:h-6 rounded-full transition-all duration-400 ${
                  proMode ? 'shadow-lg' : 'bg-white/10'
                }`}
                style={proMode ? {
                  background: 'linear-gradient(135deg, hsl(28 100% 55%), hsl(280 70% 50%))',
                  boxShadow: '0 0 10px hsl(28 100% 60% / 0.4), inset 0 1px 2px hsl(0 0% 100% / 0.2)',
                } : undefined}
              >
                <div
                  className={`absolute top-[2px] sm:top-[3px] w-[16px] sm:w-[18px] h-[16px] sm:h-[18px] rounded-full shadow-md transition-all duration-300 ${
                    proMode ? 'left-[19px] sm:left-[27px] bg-white' : 'left-[2px] sm:left-[3px] bg-white/60'
                  }`}
                  style={proMode ? { boxShadow: '0 0 6px hsl(28 100% 60% / 0.5)' } : undefined}
                />
              </div>
            </button>
            {messages.some(m => m.role === "assistant") && (
              <>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-white/5 transition-all"
                  title="Export to PDF"
                >
                  <FileDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline sm:inline">PDF</span>
                </button>
                <button
                  onClick={exportToWord}
                  className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-white/5 transition-all"
                  title="Export to Word"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline sm:inline">Word</span>
                </button>
              </>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            {isSignedIn ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] text-primary font-semibold truncate max-w-[60px] sm:max-w-[80px]">{authUser.name}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              >
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
            {!isSignedIn && (
              <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 px-0.5 sm:px-1">
                {remainingFreePrompts}/{FREE_PROMPT_LIMIT}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 pb-8 pt-2 overflow-visible">
        {showSignInGate && !isSignedIn && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md rounded-3xl">
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Free Limit Reached
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                You've used all {FREE_PROMPT_LIMIT} free prompts. Sign in with Google to unlock unlimited AI access, Pro Mode, and memory.
              </p>
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 text-white"
                style={{
                  background: 'linear-gradient(135deg, hsl(28 100% 55%), hsl(280 70% 50%))',
                  boxShadow: '0 0 20px hsl(28 100% 55% / 0.3)',
                }}
              >
                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {signingIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
              <button
                onClick={() => setShowSignInGate(false)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
        <div className="weatherza-chat-viewport flex flex-col overflow-visible" style={{ height: '72vh', minHeight: '520px', maxHeight: '72vh' }}>
        <div className="flex gap-1 px-1 pb-3">
          {([
            { key: 'weather', label: 'Weather', icon: CloudSun },
            { key: 'code', label: 'Code', icon: Code },
            { key: 'math', label: 'Math', icon: Calculator },
            { key: 'conversation', label: 'Chat', icon: MessageCircle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAiMode(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                aiMode === key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
              }`}
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div 
          ref={messagesContainerRef}
          className="weatherza-messages-scroll flex-1 overflow-y-auto overflow-x-hidden space-y-3 p-2 rounded-xl bg-black/20 border border-white/5"
          style={{ minHeight: 0 }}
        >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`weatherza-message-row flex gap-3 items-start weatherza-msg-appear ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
              >
                {msg.role === "assistant" && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 h-fit flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`weatherza-message-bubble max-w-[72%] sm:max-w-[75%] p-3 rounded-2xl transition-all duration-300 ${
                    msg.role === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground"
                      : "bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div ref={msg === messages[messages.length - 1] ? lastMessageRef : undefined}>
                      <MessageContent content={msg.content} isTyping={msg.isTyping} onOpenPyodide={openPyodideGraph} chatFont={chatFont.family} isPro={proMode} />
                    </div>
                  ) : (
                    <div>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="max-w-[200px] max-h-[150px] rounded-lg mb-2 border border-white/20"
                        />
                      )}
                      {msg.documentName && (
                        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg mb-2 border border-primary/30">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm text-foreground/90 truncate max-w-[180px]">{msg.documentName}</span>
                        </div>
                      )}
                      <p className="text-foreground/90">{msg.content}</p>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="p-1.5 rounded-full bg-primary/20 h-fit flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 h-fit flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="writing-animation flex gap-1">
                      <span className="writing-dot"></span>
                      <span className="writing-dot"></span>
                      <span className="writing-dot"></span>
                    </div>
                    <span className="text-muted-foreground text-sm blur-text">Rakshit's AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 pt-3 space-y-3" style={{ zIndex: 10 }}>

        {uploadedImage && (
          <div className="relative inline-block">
            <img 
              src={uploadedImage} 
              alt="Upload preview" 
              className="max-w-[150px] max-h-[100px] rounded-lg border border-primary/30"
            />
            <button
              onClick={() => setUploadedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-white hover:bg-destructive/80 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {extractedDocName && (
          <div className="relative inline-flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{extractedDocName}</span>
              <span className="text-xs text-muted-foreground">
                {extractedDocText ? `${extractedDocText.length} characters extracted` : 'Processing...'}
              </span>
            </div>
            <button
              onClick={() => { setExtractedDocText(null); setExtractedDocName(null); }}
              className="ml-2 p-1 bg-destructive rounded-full text-white hover:bg-destructive/80 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {isExtracting && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-foreground">Extracting text from document...</span>
          </div>
        )}

        <div className={`relative group/bar rounded-full mb-3 p-[2px] transition-all duration-500 ${!proMode ? 'border border-white/15' : ''}`}>
          <div
            ref={glowInnerRef}
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              inset: '-6px',
              filter: 'blur(16px)',
              opacity: 0.55,
            }}
          />
          <div
            ref={glowOuterRef}
            className="absolute inset-0 rounded-full pointer-events-none z-[1]"
          />
        <div className="relative bg-background backdrop-blur-2xl rounded-full border-0 shadow-none p-2 flex items-end gap-2 z-10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
          <div className="flex gap-1 self-end pb-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-all"
              title="Upload image or document"
            >
              {extractedDocName ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setVoiceOverlayOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-all"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
            {isSignedIn && (
              <>
                <button
                  type="button"
                  onClick={() => setFontPickerOpen(!fontPickerOpen)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    fontPickerOpen ? 'bg-primary/30 text-primary' : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary'
                  }`}
                  title="Choose chat font"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBgPickerOpen(!bgPickerOpen)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    bgPickerOpen ? 'bg-primary/30 text-primary' : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary'
                  }`}
                  title="Set background image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1">
            <Textarea
              placeholder={uploadedImage ? "Ask about this image..." : extractedDocName ? `Ask about "${extractedDocName}"...` : "Ask me anything - math, science, coding, weather..."}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                e.preventDefault();
                const scrollY = window.scrollY;
                requestAnimationFrame(() => {
                  window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
                });
              }}
              className="bg-transparent border-0 shadow-none min-h-[44px] max-h-[120px] resize-none focus:ring-0 focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none w-full text-sm placeholder:text-white/25"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
              rows={1}
            />
          </div>
          {loading ? (
            <button
              data-stop-btn
              onClick={stopGeneration}
              className="self-end w-10 h-10 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all active:scale-95"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              data-send-btn
              onClick={askAI}
              disabled={isExtracting || (!question.trim() && !uploadedImage && !extractedDocText)}
              className="self-end w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, hsl(28 100% 55%), hsl(28 100% 45%))',
                boxShadow: '0 0 12px hsl(28 100% 55% / 0.4), 0 4px 8px hsl(28 100% 40% / 0.3)',
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>

        <VoiceOverlay
          isOpen={voiceOverlayOpen}
          onClose={() => setVoiceOverlayOpen(false)}
          onTranscriptReady={handleVoiceTranscript}
          onSendMessage={handleVoiceSend}
        />
          </div>
        </div>
        
        {pyodideCode && (
          <Suspense fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="flex items-center gap-3 p-8 bg-card rounded-lg border border-white/10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-foreground">Loading Python environment...</span>
              </div>
            </div>
          }>
            <PyodideRunner code={pyodideCode} onClose={() => setPyodideCode(null)} />
          </Suspense>
        )}

        <FontPicker
          isOpen={fontPickerOpen}
          onClose={() => setFontPickerOpen(false)}
          selectedFont={chatFont}
          onSelectFont={(font) => { setChatFont(font); setFontPickerOpen(false); }}
        />

        <BackgroundPicker
          isOpen={bgPickerOpen}
          onClose={() => setBgPickerOpen(false)}
          currentBg={customBg}
          onSelectBg={(bg) => { setCustomBg(bg); setBgPickerOpen(false); }}
        />
      </CardContent>
    </Card>
  );
};
