import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send, User, Bot, Trash2, Copy, Check, Play, Terminal, Image, Mic, XCircle, FileText, Download, FileDown, BarChart3, Code, Calculator, MessageCircle, CloudSun } from "lucide-react";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import html2canvas from "html2canvas";

// Lazy load PyodideRunner for graph visualization
const PyodideRunner = lazy(() => import("@/components/python-visualizer"));

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface WeatherzaAIProps {
  weather: WeatherData;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  image?: string; // Base64 image data
  documentText?: string; // Extracted text from document (for AI)
  documentName?: string; // Original document name (for display)
}

let msgIdCounter = 0;
const genMsgId = () => `msg-${Date.now()}-${++msgIdCounter}`;

// Separate background component for WeatherzaAI
const AIBackground = ({ weather }: { weather: WeatherData }) => {
  const [bgImage, setBgImage] = useState<string>('');

  useEffect(() => {
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
  }, [weather.location.name]);

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

// Calculate actual AQI from PM2.5
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

// Languages that support interactive interpreter
const INTERPRETER_LANGUAGES = [
  'python', 'py', 'javascript', 'js', 'typescript', 'ts',
  'ruby', 'rb', 'lua', 'bash', 'sh', 'perl', 'r'
];

// All supported languages for backend execution
const BACKEND_LANGUAGES = [
  'python', 'py', 'javascript', 'js', 'typescript', 'ts',
  'java', 'c', 'cpp', 'c++', 'csharp', 'cs', 'go', 'golang',
  'rust', 'ruby', 'rb', 'php', 'swift', 'kotlin', 'r',
  'perl', 'lua', 'bash', 'sh', 'sql', 'sqlite', 'scala',
  'haskell', 'elixir', 'dart', 'julia', 'clojure', 'fortran',
  'cobol', 'pascal', 'lisp', 'prolog', 'brainfuck', 'bf'
];

// Code block component with copy and run buttons - opens in NEW BROWSER TAB
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
  const { toast } = useToast();

  const lang = language?.toLowerCase() || '';
  const isRunnable = lang && (BACKEND_LANGUAGES.includes(lang) || lang === 'html');
  const usesInterpreter = INTERPRETER_LANGUAGES.includes(lang);
  const isPythonGraph = (lang === 'python' || lang === 'py') && isPythonGraphCode(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPyodide = () => {
    if (onOpenPyodide) {
      onOpenPyodide(children);
    }
  };

  const handleRun = () => {
    // Create a popup window for code execution
    const popupWidth = 1000;
    const popupHeight = 700;
    const left = (window.screen.width - popupWidth) / 2;
    const top = (window.screen.height - popupHeight) / 2;

    if (lang === "html") {
      // For HTML, open directly in new window
      const htmlContent = children;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`);
    } else {
      // For other languages, open interpreter in new tab
      const codeData = encodeURIComponent(JSON.stringify({ code: children, language: lang }));
      const interpreterHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${lang.toUpperCase()} Interpreter</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Monaco', 'Menlo', monospace; 
      background: #1a1a2e; 
      color: #eee; 
      height: 100vh; 
      display: flex; 
      flex-direction: column;
    }
    .header {
      background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2));
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header h1 { font-size: 16px; font-weight: 600; }
    .output {
      flex: 1;
      overflow: auto;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
    }
    .input-line { color: #00d4ff; }
    .output-line { color: #86efac; }
    .error-line { color: #f87171; }
    .info-line { color: #888; font-style: italic; }
    .prompt { color: #facc15; }
    .footer {
      background: rgba(0,0,0,0.3);
      padding: 8px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      color: #888;
    }
    pre { white-space: pre-wrap; word-wrap: break-word; }
    .loading { color: #facc15; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <div class="header">
    <span>🐍</span>
    <h1>${lang.toUpperCase()} Interactive Shell</h1>
    <span id="status"></span>
  </div>
  <div class="output" id="output">
    <div class="info-line">🐍 ${lang.toUpperCase()} Interactive Shell</div>
    <div class="info-line">Running code...</div>
    <div class="input-line"><span class="prompt">&gt;&gt;&gt; </span><pre style="display:inline">${children.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>
    <div class="loading" id="loading">⏳ Executing...</div>
  </div>
  <div class="footer">Press Ctrl+W to close • Powered by Piston API</div>
  <script>
    (async function() {
      const output = document.getElementById('output');
      const loading = document.getElementById('loading');
      try {
        const response = await fetch('https://znkvwgwijwmeapcyjpgu.supabase.co/functions/v1/execute-code', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpua3Z3Z3dpandtZWFwY3lqcGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDc1NjIsImV4cCI6MjA4MTE4MzU2Mn0.wvFfzKNl5EQzCbzX8_xQdS6cinh7gGNEcaFfPzB8ags'
          },
          body: JSON.stringify({ code: ${JSON.stringify(children)}, language: '${lang}' })
        });
        const data = await response.json();
        loading.remove();
        if (data.error) {
          output.innerHTML += '<div class="error-line">❌ ' + data.error + '</div>';
        } else {
          output.innerHTML += '<div class="' + (data.hasError ? 'error-line' : 'output-line') + '">' + (data.output || '(no output)').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
        }
      } catch (e) {
        loading.remove();
        output.innerHTML += '<div class="error-line">❌ ' + e.message + '</div>';
      }
    })();
  </script>
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
      <pre className="bg-black/40 p-3 rounded-b-lg overflow-x-auto m-0 border-l-2 border-orange-500/50">
        <code className="font-mono text-sm text-foreground/90">{children}</code>
      </pre>
    </div>
  );
};

// Typing effect hook - MUCH faster typing (chunks of characters)
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
        // Type multiple characters at once for faster output
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

// Message content component with typing effect
const MessageContent = ({ content, isTyping, onOpenPyodide }: { content: string; isTyping?: boolean; onOpenPyodide?: (code: string) => void }) => {
  const { displayedText, isComplete } = useTypingEffect(content, isTyping || false);

  return (
    <div className="w-full overflow-visible">
      <div className="weatherza-markdown break-words prose prose-invert prose-sm max-w-none text-foreground/90 leading-snug h-auto min-h-fit" style={{ fontFamily: "'Quicksand', sans-serif" }}>
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

// Run Python code via Pyodide and get a base64 PNG image
const runPythonForImage = async (code: string): Promise<string | null> => {
  try {
    // Check if Pyodide is loaded
    if (!window.pyodide) {
      // Try to load it
      if (!window.loadPyodide) return null;
      window.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      });
      await window.pyodide.loadPackage(["numpy", "matplotlib"]);
    }

    // Setup matplotlib for non-interactive backend
    await window.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO
    `);

    // Clean the code
    let cleanCode = code
      .replace(/plt\.show\(\)/g, '')
      .replace(/plt\.savefig\([^)]+\)/g, '');

    // Add capture logic
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

// Extract Python code blocks from markdown
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

// PDF Generation — HTML → Canvas → PDF pipeline
const generatePDF = async (content: string, _elementRef?: HTMLElement | null, filename: string = "Weatherza_AI_Generated.pdf") => {
  const { jsPDF } = await import('jspdf');
  const { createRoot } = await import('react-dom/client');
  const React = await import('react');

  // 1. Run python graphs and collect base64 images
  const pythonBlocks = extractPythonCodeBlocks(content);
  const graphImages: Map<string, string> = new Map();
  for (const block of pythonBlocks) {
    const img = await runPythonForImage(block);
    if (img) graphImages.set(block.trim(), img);
  }

  // 2. Replace python code blocks with image tags in content
  let exportContent = content;
  exportContent = exportContent.replace(/```(?:python|py)\n([\s\S]*?)```/g, (_match, code: string) => {
    if (isPythonGraphCode(code) && graphImages.has(code.trim())) {
      return `\n![Graph](${graphImages.get(code.trim())})\n`;
    }
    return '```\n' + code + '\n```';
  });

  // 3. Create hidden export container
  const container = document.createElement('div');
  container.id = 'pdf-export-container';
  container.style.cssText = `
    position: fixed; left: -99999px; top: 0; width: 900px;
    background: white; padding: 40px; color: #222;
    font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.7;
  `;

  // 4. Add export-specific styles
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

  // 5. Add header
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #ff8c00;';
  header.innerHTML = '<h1 style="color:#ff8c00;margin:0;font-size:22px;">Weatherza AI Generated Document</h1>';
  container.appendChild(header);

  // 6. Render markdown with KaTeX + GFM tables into the container
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

  // 7. Wait for KaTeX and images to render
  await new Promise(r => setTimeout(r, 500));

  // 8. Capture with html2canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // 9. Cleanup DOM
  root.unmount();
  document.body.removeChild(container);
  document.head.removeChild(styleEl);

  // 10. Generate paginated PDF
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

  // 11. Add footer to all pages
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

// Word Generation helper - improved emoji and text handling
const generateWord = async (content: string, filename: string = "Weatherza_AI_Generated.docx") => {
  try {
    // Parse content into paragraphs with proper emoji support
    const paragraphs: any[] = [];
    
    // Add title
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
    
    // Helper to create runs with emoji support
    const createTextRuns = (text: string, isBold: boolean = false): TextRun[] => {
      // Split by emojis but keep them
      const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
      const parts = text.split(emojiRegex).filter(Boolean);
      
      return parts.map(part => new TextRun({
        text: part,
        bold: isBold,
        size: 24,
      }));
    };
    
    // Clean and split content
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        continue;
      }
      
      // Check for headings
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
        // Bullet points
        const bulletText = trimmedLine.replace(/^[-*]\s/, '');
        paragraphs.push(
          new Paragraph({
            children: createTextRuns(`• ${bulletText}`),
            spacing: { after: 60 },
          })
        );
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        // Numbered lists
        paragraphs.push(
          new Paragraph({
            children: createTextRuns(trimmedLine),
            spacing: { after: 60 },
          })
        );
      } else {
        // Regular paragraph - handle bold and italic text with emojis
        const runs: TextRun[] = [];
        let remaining = trimmedLine;
        
        // Process bold text
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(remaining)) !== null) {
          // Add text before bold
          if (match.index > lastIndex) {
            runs.push(...createTextRuns(remaining.slice(lastIndex, match.index)));
          }
          // Add bold text
          runs.push(...createTextRuns(match[1], true));
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
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
    
    // Add footer
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "",
          }),
        ],
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

// Detect if code contains graph-generating Python
const isPythonGraphCode = (code: string): boolean => {
  const graphIndicators = [
    'plt.plot', 'plt.scatter', 'plt.bar', 'plt.pie', 'plt.hist',
    'matplotlib', 'np.linspace', 'np.sin', 'np.cos', 'FuncAnimation'
  ];
  return graphIndicators.some(indicator => code.includes(indicator));
};

// Load messages from localStorage
const loadStoredMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem('weatherza-chat-history');
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      // Strip isTyping flag from stored messages
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
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Voice refs removed — now using Groq Whisper via MediaRecorder in VoiceOverlay

  // Auto-scroll chat container only — debounced to prevent shaking during streaming
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

  // Persist messages to localStorage (skip while typing/streaming)
  useEffect(() => {
    const hasTyping = messages.some(m => m.isTyping);
    if (!hasTyping && messages.length > 0) {
      try {
        // Keep last 50 messages to avoid localStorage bloat
        const toStore = messages.slice(-50).map(({ id, role, content }) => ({ id, role, content }));
        localStorage.setItem('weatherza-chat-history', JSON.stringify(toStore));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [messages]);

  // Persist AI mode
  useEffect(() => {
    localStorage.setItem('weatherza-ai-mode', aiMode);
  }, [aiMode]);

  // Extract text from PDF using pdfjs-dist
  const extractPdfText = async (file: File): Promise<string> => {
    try {
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
        // If no text found, it might be a scanned PDF - tell the user
        return `[This PDF appears to be image-based/scanned. ${pdf.numPages} pages detected but no extractable text found. The document may contain images or scanned content that requires OCR.]`;
      }
      
      return fullText.trim();
    } catch (err) {
      console.error("PDF extraction error:", err);
      throw new Error("Failed to read PDF. The file may be corrupted or password-protected.");
    }
  };

  // Extract text from DOCX using mammoth
  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // Handle file upload (images and documents)
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
      // Handle image - convert to base64 for vision API
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
      // Handle documents - extract text on frontend
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

  // Detect if the user query needs real-time search
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

  // Call the internet search edge function
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

  // Streaming helper — reads SSE from the edge function
  const streamFromAI = async (
    messagesForAI: any[],
    weatherCtx: any,
    updatedMessages: Message[],
    mode: string = 'weather'
  ) => {
    // Check if the latest user message needs internet search
    const latestUserMsg = messagesForAI[messagesForAI.length - 1];
    if (latestUserMsg?.role === "user" && needsSearch(latestUserMsg.content)) {
      const searchResults = await performSearch(latestUserMsg.content);
      if (searchResults) {
        // Prepend search context to the last user message
        messagesForAI = messagesForAI.map((m, i) =>
          i === messagesForAI.length - 1
            ? { ...m, content: `${searchResults}\n\nUser question: ${m.content}` }
            : m
        );
      }
    }

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weatherza-chat`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: messagesForAI, weatherContext: weatherCtx, mode }),
    });

    if (!resp.ok) {
      // Try to parse JSON error
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errData = await resp.json();
        throw new Error(errData.error || `Error ${resp.status}`);
      }
      throw new Error(`AI request failed: ${resp.status}`);
    }

    const contentType = resp.headers.get("content-type") || "";

    // If it's a non-streaming JSON response (vision fallback)
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      const answer = data.answer || "Sorry, I couldn't generate a response.";
      setMessages([...updatedMessages, { id: genMsgId(), role: "assistant", content: answer, isTyping: true }]);
      const chunkSize = 5;
      const speed = 10;
      const typingDuration = Math.ceil(answer.length / chunkSize) * speed + 300;
      setTimeout(() => {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isTyping: false } : m
        ));
      }, typingDuration);
      return;
    }

    // Streaming SSE response
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;
    let lastChunkTime = Date.now();

    // Add empty assistant message with stable ID
    const assistantId = genMsgId();
    setMessages([...updatedMessages, { id: assistantId, role: "assistant", content: "", isTyping: false }]);

    // Watchdog: if no chunk for 8 seconds, abort gracefully
    const watchdog = setInterval(() => {
      if (Date.now() - lastChunkTime > 8000 && !streamDone) {
        console.warn("Stream watchdog: no data for 8s, finalizing");
        streamDone = true;
        reader.cancel().catch(() => {});
      }
    }, 2000);

    try {
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        lastChunkTime = Date.now();
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { id: assistantId, role: "assistant", content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } finally {
      clearInterval(watchdog);
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            const snapshot = assistantSoFar;
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: snapshot } : m
            ));
          }
        } catch { /* ignore */ }
      }
    }
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
      pm25: pm25
    };
  };

  // Voice overlay handlers
  const handleVoiceTranscript = (text: string) => {
    setQuestion(text);
  };

  const handleVoiceSend = (text: string) => {
    if (!text.trim()) return;

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

  // Export last AI message to PDF with emoji support via html2canvas
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

  // Export last AI message to Word
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

  // Open Pyodide graph runner
  const openPyodideGraph = (code: string) => {
    setPyodideCode(code);
  };

  return (
    <Card className="col-span-full bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden relative">
      {/* AI-specific background image */}
      <AIBackground weather={weather} />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span 
              className="text-foreground font-semibold text-glow-sweep"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Rakshit's Weatherza AI
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.some(m => m.role === "assistant") && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportToPDF}
                  className="text-muted-foreground hover:text-primary"
                  title="Export to PDF"
                >
                  <FileDown className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportToWord}
                  className="text-muted-foreground hover:text-primary"
                  title="Export to Word"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Word
                </Button>
              </>
            )}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {/* Chat Viewport — fixed height, flex column, no collapse */}
        <div className="weatherza-chat-viewport flex flex-col" style={{ height: '72vh', minHeight: '520px', maxHeight: '72vh', overflow: 'hidden' }}>
        {/* Mode Selector */}
        <div className="flex flex-wrap gap-1.5 px-2 pb-2">
          {([
            { key: 'weather', label: 'Weather', icon: CloudSun, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-400' },
            { key: 'code', label: 'Code', icon: Code, color: 'from-green-500/20 to-emerald-500/20 border-green-500/40 text-green-400' },
            { key: 'math', label: 'Math', icon: Calculator, color: 'from-purple-500/20 to-violet-500/20 border-purple-500/40 text-purple-400' },
            { key: 'conversation', label: 'Chat', icon: MessageCircle, color: 'from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-400' },
          ] as const).map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setAiMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                aiMode === key
                  ? `bg-gradient-to-r ${color} shadow-lg scale-105`
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Messages Scroll Area */}
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
                      <MessageContent content={msg.content} isTyping={msg.isTyping} onOpenPyodide={openPyodideGraph} />
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

          {/* Input Bar — pinned at bottom, never moves */}
          <div className="flex-shrink-0 pt-3 space-y-3" style={{ zIndex: 10 }}>

        {/* Image Preview */}
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

        {/* Document Preview */}
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
        
        {/* Extraction Loading */}
        {isExtracting && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-foreground">Extracting text from document...</span>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
          
          {/* File upload button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 border-white/20 hover:bg-primary/20 hover:border-primary/50"
            title="Upload image or document"
          >
            {extractedDocName ? <FileText className="w-4 h-4" /> : <Image className="w-4 h-4" />}
          </Button>

          {/* Voice input button - opens Groq Whisper voice overlay */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setVoiceOverlayOpen(true)}
            className="shrink-0 border-white/20 hover:bg-primary/20 hover:border-primary/50"
            title="Start voice input (Groq Whisper)"
          >
            <Mic className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              placeholder={uploadedImage ? "Ask about this image..." : extractedDocName ? `Ask about "${extractedDocName}"...` : "Ask me anything - math, science, coding, weather..."}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => {
                e.preventDefault();
                // Prevent browser from scrolling the page when textarea is focused
                const scrollY = window.scrollY;
                requestAnimationFrame(() => {
                  window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
                });
              }}
              className="bg-white/5 border-white/20 min-h-[60px] max-h-[120px] resize-none focus:border-primary/50 transition-colors w-full"
              rows={2}
            />
          </div>
          <Button 
            data-send-btn
            onClick={askAI} 
            disabled={loading || isExtracting || (!question.trim() && !uploadedImage && !extractedDocText)}
            className="px-4 self-end bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Voice Overlay */}
        <VoiceOverlay
          isOpen={voiceOverlayOpen}
          onClose={() => setVoiceOverlayOpen(false)}
          onTranscriptReady={handleVoiceTranscript}
          onSendMessage={handleVoiceSend}
        />
          </div>{/* close input bar */}
        </div>{/* close chat viewport */}
        
        {/* Pyodide Graph Modal - Now handled inside PyodideRunner component */}
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
      </CardContent>
    </Card>
  );
};
