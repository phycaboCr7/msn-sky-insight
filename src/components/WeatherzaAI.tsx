import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send, User, Bot, Trash2, Copy, Check, Play, Terminal, Image, Mic, XCircle, FileText, Download, FileDown, BarChart3 } from "lucide-react";
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
const PyodideRunner = lazy(() => import("@/components/PyodideRunner"));

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface WeatherzaAIProps {
  weather: WeatherData;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  image?: string; // Base64 image data
  documentText?: string; // Extracted text from document (for AI)
  documentName?: string; // Original document name (for display)
}

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
    <div className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed weatherza-markdown overflow-visible">
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
  );
};

// PDF Generation helper - simple text with colors and emojis, no repetition
const generatePDF = async (content: string, _elementRef?: HTMLElement | null, filename: string = "Weatherza_AI_Generated.pdf") => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(255, 140, 0);
    doc.text("Weatherza AI Generated Document", margin, 20);
    
    // Add separator line
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, 25, pageWidth - margin, 25);
    
    // Clean markdown but preserve emojis and structure
    let cleanContent = content
      // Remove bold markers but keep text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove italic markers but keep text
      .replace(/\*(.*?)\*/g, '$1')
      // Remove heading markers but keep text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove code block markers
      .replace(/```[\s\S]*?```/g, '[Code block]')
      // Remove link markdown but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Normalize multiple newlines to double newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
    
    // Split into paragraphs (by double newlines)
    const paragraphs = cleanContent.split(/\n\n+/);
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    
    let y = 35;
    const lineHeight = 6;
    const paragraphSpacing = 4;
    
    // Track processed content to avoid duplicates
    const processedContent = new Set<string>();
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;
      
      // Skip duplicate paragraphs
      const paragraphKey = trimmedParagraph.substring(0, 100);
      if (processedContent.has(paragraphKey)) continue;
      processedContent.add(paragraphKey);
      
      // Handle bullet points and numbered lists
      const lines = trimmedParagraph.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check if we need a new page
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }
        
        // Detect and style different content types
        let textToWrite = trimmedLine;
        
        // Bullet points
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          textToWrite = '• ' + trimmedLine.substring(2);
          doc.setTextColor(60, 60, 60);
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(trimmedLine)) {
          doc.setTextColor(60, 60, 60);
        }
        // Regular text
        else {
          doc.setTextColor(40, 40, 40);
        }
        
        // Split long lines to fit page width
        const wrappedLines = doc.splitTextToSize(textToWrite, maxWidth);
        
        for (const wrappedLine of wrappedLines) {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }
          doc.text(wrappedLine, margin, y);
          y += lineHeight;
        }
      }
      
      // Add paragraph spacing
      y += paragraphSpacing;
    }
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by Rakshit's Weatherza AI`, margin, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, pageHeight - 10);
    }
    
    doc.save(filename);
  } catch (err) {
    console.error("PDF generation error:", err);
    throw err;
  }
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

export const WeatherzaAI = ({ weather }: WeatherzaAIProps) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [pyodideCode, setPyodideCode] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [extractedDocText, setExtractedDocText] = useState<string | null>(null);
  const [extractedDocName, setExtractedDocName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract text from PDF using pdfjs-dist
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
    }
    return fullText.trim();
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

  // Speech-to-text using Web Speech API
  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ 
        title: "Not supported", 
        description: "Speech recognition is not supported in your browser. Try Chrome.", 
        variant: "destructive" 
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterimTranscript("");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one result for cleaner transcription
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      setInterimTranscript(interimText);

      if (finalTranscript) {
        setQuestion(prev => {
          const newText = prev ? prev + ' ' + finalTranscript : finalTranscript;
          return newText.trim();
        });
        setInterimTranscript("");
        // Restart for continuous listening
        setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            try {
              recognition.start();
            } catch (e) {
              // Already started
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({ 
          title: "Speech error", 
          description: `Error: ${event.error}. Please try again.`, 
          variant: "destructive" 
        });
      }
      setIsRecording(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsRecording(false);
          setInterimTranscript("");
        }
      } else {
        setIsRecording(false);
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const askAI = async () => {
    if (!question.trim() && !uploadedImage && !extractedDocText) return;

    // Build content for the message
    let messageContent = question.trim() || (uploadedImage ? "What's in this image?" : "Analyze this document");
    
    // If document text was extracted, prepend it to the message
    if (extractedDocText) {
      messageContent = `DOCUMENT CONTENT START\n${extractedDocText}\nDOCUMENT CONTENT END\n\n${messageContent}`;
    }

    const userMessage: Message = { 
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
      const pm25 = weather.current.air_quality?.pm2_5;
      const actualAQI = pm25 ? calculateAQI(pm25) : null;

      const weatherContext = {
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

      // Build messages for AI - include extracted document text directly
      const messagesForAI = updatedMessages.map(m => {
        let content = m.content;
        // If this message has document text, include it in the content
        if (m.documentText) {
          content = `DOCUMENT CONTENT START\n${m.documentText}\nDOCUMENT CONTENT END\n\nUser question: ${m.content}`;
        }
        return {
          role: m.role,
          content,
          image: m.image
        };
      });

      const { data, error } = await supabase.functions.invoke('weatherza-chat', {
        body: { 
          messages: messagesForAI,
          weatherContext 
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to get AI response");
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limit",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.answer || "Sorry, I couldn't generate a response.",
        isTyping: true
      };
      setMessages([...updatedMessages, assistantMessage]);
      
      // Mark typing as complete after animation - faster calculation based on chunk size
      const chunkSize = 5;
      const speed = 10;
      const typingDuration = Math.ceil((data.answer?.length || 0) / chunkSize) * speed + 300;
      setTimeout(() => {
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? { ...m, isTyping: false } : m
        ));
      }, typingDuration);
      
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        title: "AI Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      // Remove the user message if there was an error
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
    <Card className="col-span-full bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
      <CardHeader className="pb-3">
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
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="h-[400px] max-h-[400px] min-h-[400px] overflow-y-auto overflow-x-hidden space-y-3 p-2 rounded-xl bg-black/20 border border-white/5 flex-shrink-0">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 animate-fade-in ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 h-fit flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3 rounded-2xl transition-all duration-300 weatherza-message-bubble ${
                    msg.role === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground"
                      : "bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20"
                  }`}
                  style={{ overflow: 'visible', minHeight: 'fit-content' }}
                >
                  {msg.role === "assistant" ? (
                    <div ref={index === messages.length - 1 ? lastMessageRef : undefined}>
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
        )}

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

          {/* Voice input button with simple visualizer */}
          <div className="relative shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              className={`border-white/20 transition-all ${
                isRecording 
                  ? 'bg-white/10 border-white/30' 
                  : 'hover:bg-primary/20 hover:border-primary/50'
              }`}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? (
                <div className="flex items-center justify-center gap-[2px]">
                  <span className="w-[3px] h-3 bg-foreground rounded-full animate-voice-bar-1" />
                  <span className="w-[3px] h-3 bg-foreground rounded-full animate-voice-bar-2" />
                  <span className="w-[3px] h-3 bg-foreground rounded-full animate-voice-bar-3" />
                </div>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex-1 relative">
            <Textarea
              placeholder={uploadedImage ? "Ask about this image..." : extractedDocName ? `Ask about "${extractedDocName}"...` : isRecording ? "Listening..." : "Ask me anything - math, science, coding, weather..."}
              value={isRecording && interimTranscript ? question + (question ? ' ' : '') + interimTranscript : question}
              onChange={(e) => !isRecording && setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-white/5 border-white/20 min-h-[60px] max-h-[120px] resize-none focus:border-primary/50 transition-colors w-full"
              rows={2}
              readOnly={isRecording}
            />
          </div>
          <Button 
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
