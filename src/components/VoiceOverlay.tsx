import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Send, ChevronUp } from "lucide-react";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (text: string) => void;
  onSendMessage: (text: string) => void;
  recognitionRef: React.MutableRefObject<any>;
  isActiveRef: React.MutableRefObject<boolean>;
}

export const VoiceOverlay = ({ isOpen, onClose, onTranscriptReady, onSendMessage, recognitionRef, isActiveRef }: VoiceOverlayProps) => {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showText, setShowText] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(40).fill(2));
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");

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

  useEffect(() => {
    if (!isOpen) return;

    setTranscript("");
    setInterimText("");
    setShowText(false);
    transcriptRef.current = "";
    startAudioAnalyser();

    const checkListening = () => {
      setIsListening(isActiveRef.current);
    };
    const interval = setInterval(checkListening, 200);

    // Attach result handler to the recognition instance
    const recognition = recognitionRef.current;
    if (recognition) {
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
          transcriptRef.current = finalText.trim();
          setTranscript(finalText.trim());
        }
      };
      setIsListening(true);
    }

    return () => {
      clearInterval(interval);
      stopAudioAnalyser();
    };
  }, [isOpen, startAudioAnalyser, stopAudioAnalyser, recognitionRef, isActiveRef]);

  const handleClose = () => {
    const finalText = (transcriptRef.current + (interimText ? ' ' + interimText : '')).trim();
    if (finalText) {
      onTranscriptReady(finalText);
    }
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    stopAudioAnalyser();
    onClose();
  };

  const handleSend = () => {
    const finalText = (transcriptRef.current + (interimText ? ' ' + interimText : '')).trim();
    if (finalText) {
      onSendMessage(finalText);
    }
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    stopAudioAnalyser();
    onClose();
  };

  if (!isOpen) return null;

  const fullText = transcript + (interimText ? (transcript ? ' ' : '') + interimText : '');

  // Use portal to render at document.body level to escape any parent transforms
  return createPortal(
    <div 
      className="fixed inset-0 flex flex-col animate-fade-in"
      style={{ 
        zIndex: 99999, 
        backgroundColor: '#0d0d0d',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
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

      {/* Center content - always show transcription */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        {!fullText && (
          <h2 className="text-2xl font-medium text-white text-center mb-8">
            What can I help with?
          </h2>
        )}

        {fullText && (
          <div className="w-full max-w-md mb-8">
            <p className="text-lg text-white/90 text-center leading-relaxed">
              {fullText}
              {interimText && <span className="text-white/40 animate-pulse">|</span>}
            </p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="px-4 pb-8 space-y-4">
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
    </div>,
    document.body
  );
};
