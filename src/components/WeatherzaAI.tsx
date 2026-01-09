import { useState, useRef, useEffect } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send, User, Bot, Trash2, Copy, Check, Play, X, ExternalLink, Terminal, Image, Mic, MicOff, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import { PythonInterpreter } from "./PythonInterpreter";

interface WeatherzaAIProps {
  weather: WeatherData;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  image?: string; // Base64 image data
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

// HTML Preview Modal - for web content
const HTMLPreviewModal = ({ 
  htmlUrl, 
  code,
  onClose 
}: { 
  htmlUrl: string;
  code: string; 
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-6xl h-[80vh] bg-background/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-foreground">HTML Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(htmlUrl, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground/70" />
            </button>
          </div>
        </div>
        
        {/* Split Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Code */}
          <div className="w-1/2 flex flex-col border-r border-white/10">
            <div className="px-3 py-2 bg-black/30 border-b border-white/10">
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                <Copy className="w-3 h-3" /> Source Code
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black/20">
              <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap">
                <code>{code}</code>
              </pre>
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col">
            <div className="px-3 py-2 bg-black/30 border-b border-white/10">
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                <Play className="w-3 h-3" /> Live Preview
              </span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <iframe
                src={htmlUrl}
                className="w-full h-full bg-white rounded-lg border border-white/10"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

// Code block component with copy and run buttons
const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
  const [copied, setCopied] = useState(false);
  const [showInterpreter, setShowInterpreter] = useState(false);
  const [showHTMLPreview, setShowHTMLPreview] = useState(false);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const lang = language?.toLowerCase() || '';
  const isRunnable = lang && (BACKEND_LANGUAGES.includes(lang) || lang === 'html');
  const usesInterpreter = INTERPRETER_LANGUAGES.includes(lang);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    if (lang === "html") {
      // For HTML, show the preview modal
      const blob = new Blob([children], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setHtmlUrl(url);
      setShowHTMLPreview(true);
    } else {
      // For all other languages, open the interactive interpreter
      setShowInterpreter(true);
    }
  };

  return (
    <>
      <div className="relative group my-3">
        <div className="flex items-center justify-between bg-black/50 px-3 py-1.5 rounded-t-lg border-b border-white/10">
          <span className="text-xs text-muted-foreground font-mono">{language || "code"}</span>
          <div className="flex gap-1">
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
        <pre className="bg-black/40 p-3 rounded-b-lg overflow-x-auto m-0">
          <code className="font-mono text-sm text-foreground/90">{children}</code>
        </pre>
      </div>
      
      {/* Interactive Python/JS Interpreter */}
      {showInterpreter && (
        <PythonInterpreter
          initialCode={children}
          language={lang}
          onClose={() => setShowInterpreter(false)}
        />
      )}

      {/* HTML Preview Modal */}
      {showHTMLPreview && htmlUrl && (
        <HTMLPreviewModal
          htmlUrl={htmlUrl}
          code={children}
          onClose={() => {
            setShowHTMLPreview(false);
            if (htmlUrl) URL.revokeObjectURL(htmlUrl);
          }}
        />
      )}
    </>
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
const MessageContent = ({ content, isTyping }: { content: string; isTyping?: boolean }) => {
  const { displayedText, isComplete } = useTypingEffect(content, isTyping || false);

  return (
    <div className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed weatherza-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mb-3 mt-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mb-2 mt-2">{children}</h3>,
          p: ({ children }) => <p className="mb-2 text-foreground/90 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-foreground/90">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground/90">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90">{children}</li>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !className && !match;
            const codeContent = String(children).replace(/\n$/, "");
            
            if (isInline) {
              return (
                <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono text-sm">{children}</code>
              );
            }
            
            return <CodeBlock language={match?.[1]}>{codeContent}</CodeBlock>;
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-3 italic text-foreground/70">{children}</blockquote>,
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

export const WeatherzaAI = ({ weather }: WeatherzaAIProps) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      toast({ title: "Image uploaded! 📷", description: "Ask a question about the image." });
    };
    reader.readAsDataURL(file);
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
    if (!question.trim() && !uploadedImage) return;

    const userMessage: Message = { 
      role: "user", 
      content: question.trim() || "What's in this image?",
      image: uploadedImage || undefined
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setQuestion("");
    setUploadedImage(null);
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

      const { data, error } = await supabase.functions.invoke('weatherza-chat', {
        body: { 
          messages: updatedMessages.map(m => ({ 
            role: m.role, 
            content: m.content,
            image: m.image 
          })),
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages - Always visible with fixed height */}
        <div className="h-[400px] max-h-[400px] min-h-[400px] overflow-y-auto overflow-x-hidden space-y-3 p-2 rounded-xl bg-black/20 border border-white/5 flex-shrink-0">
          {messages.length === 0 ? (
            /* Empty state placeholder */
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-primary/70" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80 mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Ask me anything!
              </h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Weather, math equations, science, coding, image analysis... I'm here to help! 🌤️✨
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 animate-fade-in ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 h-fit">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl transition-all duration-300 ${
                      msg.role === "user"
                        ? "bg-primary/20 border border-primary/30 text-foreground"
                        : "bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-primary/20"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <MessageContent content={msg.content} isTyping={msg.isTyping} />
                    ) : (
                      <div>
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Uploaded" 
                            className="max-w-[200px] max-h-[150px] rounded-lg mb-2 border border-white/20"
                          />
                        )}
                        <p className="text-foreground/90">{msg.content}</p>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="p-1.5 rounded-full bg-primary/20 h-fit">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 h-fit">
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
            </>
          )}
        </div>

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

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          
          {/* Image upload button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 border-white/20 hover:bg-primary/20 hover:border-primary/50"
            title="Upload image"
          >
            <Image className="w-4 h-4" />
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
              placeholder={uploadedImage ? "Ask about this image..." : isRecording ? "Listening..." : "Ask me anything - math, science, coding, weather..."}
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
            disabled={loading || (!question.trim() && !uploadedImage)}
            className="px-4 self-end bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
