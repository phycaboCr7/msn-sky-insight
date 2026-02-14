import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Send, ChevronUp } from "lucide-react";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (text: string) => void;
  onSendMessage: (text: string) => void;
}

export const VoiceOverlay = ({ isOpen, onClose, onTranscriptReady, onSendMessage }: VoiceOverlayProps) => {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showText, setShowText] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(40).fill(2));
  
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start audio analyser for waveform
  const startAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Sample 40 bars from the frequency data
        const bars: number[] = [];
        const step = Math.floor(dataArray.length / 40);
        for (let i = 0; i < 40; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.max(2, (val / 255) * 40));
        }
        setAnalyserData(bars);
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      
      updateVisualizer();
    } catch (err) {
      console.error("Audio analyser error:", err);
    }
  }, []);

  // Stop audio analyser
  const stopAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserData(new Array(40).fill(2));
  }, []);

  // Start speech recognition - called directly from user gesture context
  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition not supported");
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      isActiveRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimText(interim);
      
      if (finalText.trim()) {
        // Replace entire transcript with all final results to avoid duplication
        setTranscript(finalText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.log("Speech error:", event.error);
      if (event.error === 'not-allowed') {
        isActiveRef.current = false;
        setIsListening(false);
      }
      // For 'no-speech', 'network', etc. - onend will handle restart
    };

    recognition.onend = () => {
      console.log("Speech recognition ended, active:", isActiveRef.current);
      if (isActiveRef.current) {
        // Restart with a small delay to avoid rapid restart loops
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
              isActiveRef.current = false;
              setIsListening(false);
            }
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, []);

  // Stop speech recognition
  const stopRecognition = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start/stop when overlay opens/closes
  useEffect(() => {
    if (isOpen) {
      setTranscript("");
      setInterimText("");
      setShowText(false);
      startRecognition();
      startAudioAnalyser();
    } else {
      stopRecognition();
      stopAudioAnalyser();
    }

    return () => {
      stopRecognition();
      stopAudioAnalyser();
    };
  }, [isOpen, startRecognition, stopRecognition, startAudioAnalyser, stopAudioAnalyser]);

  const handleClose = () => {
    const finalText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (finalText) {
      onTranscriptReady(finalText);
    }
    onClose();
  };

  const handleSend = () => {
    const finalText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (finalText) {
      onSendMessage(finalText);
    }
    onClose();
  };

  if (!isOpen) return null;

  const fullText = transcript + (interimText ? (transcript ? ' ' : '') + interimText : '');

  return (
    <div className="fixed inset-0 z-[200] bg-[#0d0d0d] flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {isListening && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white/60">Listening...</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {!showText && !fullText && (
          <h2 className="text-2xl font-medium text-white text-center mb-8">
            What can I help with?
          </h2>
        )}

        {showText && fullText && (
          <div className="w-full max-w-md mb-8">
            <p className="text-lg text-white/90 text-center leading-relaxed">
              {fullText}
              {interimText && <span className="text-white/40">|</span>}
            </p>
          </div>
        )}

        {!showText && fullText && (
          <div className="w-full max-w-md mb-8">
            <p className="text-lg text-white/60 text-center truncate">
              {fullText.slice(-60)}
              {interimText && <span className="animate-pulse">...</span>}
            </p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="px-4 pb-8 space-y-4">
        {/* See text toggle */}
        {fullText && (
          <button
            onClick={() => setShowText(!showText)}
            className="mx-auto flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors"
          >
            <ChevronUp className={`w-4 h-4 transition-transform ${showText ? 'rotate-180' : ''}`} />
            {showText ? 'Hide text' : 'See text'}
          </button>
        )}

        {/* Waveform visualizer */}
        <div className="flex items-center justify-center gap-[2px] h-10 mx-auto max-w-md w-full">
          {analyserData.map((height, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-white/40 transition-all duration-75"
              style={{ height: `${Math.max(2, height)}px` }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Close & keep text"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
          
          {fullText && (
            <button
              onClick={handleSend}
              className="p-4 rounded-full bg-white hover:bg-white/90 transition-colors"
              title="Send message"
            >
              <Send className="w-5 h-5 text-black" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
