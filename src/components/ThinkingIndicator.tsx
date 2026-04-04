import { useState, useEffect, useRef } from "react";

type Stage = 'thinking' | 'searching' | 'calculating' | 'reading' | 'writing' | 'done';

interface ThinkingIndicatorProps {
  stage: Stage;
  detail?: string;
  visible: boolean;
}

const STAGE_MESSAGES: Record<Stage, string[]> = {
  thinking: ["Thinking…", "Processing your question…", "Considering the context…", "Forming a response…"],
  searching: ["Searching the web…", "Finding latest data…", "Reading results…", "Cross-referencing sources…"],
  calculating: ["Running calculations…", "Applying weather models…", "Crunching the numbers…", "Almost there…"],
  reading: ["Reading weather data…", "Checking current conditions…", "Scanning sensor data…", "Interpreting readings…"],
  writing: ["Writing response…", "Putting it together…", "Formatting output…"],
  done: ["Done"],
};

const STAGE_COLORS: Record<Stage, { dot: string; shimmerStart: string; shimmerMid: string }> = {
  thinking:    { dot: "hsl(220 70% 65%)",  shimmerStart: "hsl(220 70% 65%)",  shimmerMid: "hsl(220 100% 90%)" },
  searching:   { dot: "hsl(35 90% 60%)",   shimmerStart: "hsl(35 90% 60%)",   shimmerMid: "hsl(45 100% 90%)" },
  calculating: { dot: "hsl(150 60% 50%)",  shimmerStart: "hsl(150 60% 50%)",  shimmerMid: "hsl(150 100% 85%)" },
  reading:     { dot: "hsl(185 70% 50%)",  shimmerStart: "hsl(185 70% 50%)",  shimmerMid: "hsl(185 100% 88%)" },
  writing:     { dot: "hsl(0 0% 75%)",     shimmerStart: "hsl(0 0% 75%)",     shimmerMid: "hsl(0 0% 98%)" },
  done:        { dot: "hsl(150 60% 50%)",  shimmerStart: "hsl(150 60% 50%)",  shimmerMid: "hsl(150 100% 85%)" },
};

export const ThinkingIndicator = ({ stage, detail, visible }: ThinkingIndicatorProps) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get messages with detail injection for searching/reading
  const getMessages = () => {
    const msgs = [...STAGE_MESSAGES[stage]];
    if (stage === 'searching' && detail) {
      msgs[1] = `Looking up "${detail}"…`;
    }
    if (stage === 'reading' && detail) {
      msgs[2] = `Analysing ${detail}…`;
    }
    return msgs;
  };

  useEffect(() => {
    setMsgIndex(0);
    setTransitioning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const messages = getMessages();
    if (messages.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setMsgIndex(prev => (prev + 1) % messages.length);
        setTransitioning(false);
      }, 300);
    }, 2000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stage, detail]);

  const messages = getMessages();
  const colors = STAGE_COLORS[stage];
  const currentMessage = messages[msgIndex % messages.length];

  return (
    <div
      className="transition-all duration-200"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full"
        style={{
          background: 'hsl(220 20% 10%)',
          border: '1px solid hsl(220 15% 20%)',
        }}
      >
        {/* Pulsing dot */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: colors.dot,
            animation: 'breathe 1.2s ease-in-out infinite',
          }}
        />

        {/* Shimmer text */}
        <span
          className={`text-xs font-medium transition-all duration-300 ${
            transitioning ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
          }`}
          style={{
            background: `linear-gradient(90deg, ${colors.shimmerStart} 0%, ${colors.shimmerMid} 50%, ${colors.shimmerStart} 100%)`,
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'shimmer-thinking 2.5s linear infinite',
            fontFamily: "'Quicksand', sans-serif",
          }}
        >
          {currentMessage}
        </span>
      </div>
    </div>
  );
};
