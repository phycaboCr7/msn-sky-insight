import { useState, useRef, useEffect } from "react";
import { WeatherData } from "@/lib/weather";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Send, User, Bot, Trash2, Copy, Check, Play, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";

interface WeatherzaAIProps {
  weather: WeatherData;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
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

// Output Modal Component
const OutputModal = ({ 
  output, 
  language, 
  onClose 
}: { 
  output: string; 
  language: string; 
  onClose: () => void;
}) => {
  const isHTML = output.startsWith("HTML_PREVIEW:");
  const htmlUrl = isHTML ? output.replace("HTML_PREVIEW:", "") : null;

  const openInNewTab = () => {
    if (htmlUrl) {
      window.open(htmlUrl, '_blank');
    } else {
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[80vh] bg-background/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-foreground">Output - {language}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openInNewTab}
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
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-[300px]">
          {isHTML && htmlUrl ? (
            <iframe
              src={htmlUrl}
              className="w-full h-full min-h-[400px] bg-white rounded-lg border border-white/10"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap bg-black/30 p-4 rounded-lg h-full min-h-[300px]">
              {output}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

// Code block component with copy and run buttons
const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const { toast } = useToast();

  const isRunnable = language && ["javascript", "js", "html", "python", "py"].includes(language.toLowerCase());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    const lang = language?.toLowerCase();
    try {
      if (lang === "javascript" || lang === "js") {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        };
        
        try {
          const result = eval(children);
          console.log = originalLog;
          const outputText = logs.length > 0 ? logs.join('\n') : (result !== undefined ? String(result) : 'Code executed successfully (no output)');
          setOutput(outputText);
        } catch (e: any) {
          console.log = originalLog;
          setOutput(`Error: ${e.message}`);
        }
      } else if (lang === "html") {
        const blob = new Blob([children], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setOutput(`HTML_PREVIEW:${url}`);
      } else if (lang === "python" || lang === "py") {
        setOutput("⚠️ Python execution requires a backend server. This is a browser-based environment.");
      }
      setShowOutput(true);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
      setShowOutput(true);
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
                <Play className="w-3 h-3" />
                Run
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
      
      {/* Big Output Modal */}
      {showOutput && output && (
        <OutputModal 
          output={output} 
          language={language || "code"} 
          onClose={() => setShowOutput(false)} 
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
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const askAI = async () => {
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setQuestion("");
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
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
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
    <Card className="col-span-full glass-card border-white/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 animate-glow">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent font-semibold">
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
        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="h-[400px] overflow-y-auto space-y-3 p-2 rounded-xl bg-black/20 border border-white/5">
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
                    <p className="text-foreground/90">{msg.content}</p>
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
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3">
          <Textarea
            placeholder="Ask me anything - math, science, coding, weather..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white/5 border-white/20 min-h-[60px] max-h-[120px] resize-none focus:border-primary/50 transition-colors"
            rows={2}
          />
          <Button 
            onClick={askAI} 
            disabled={loading || !question.trim()}
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
