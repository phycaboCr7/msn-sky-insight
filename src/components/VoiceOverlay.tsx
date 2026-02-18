import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, Mic } from "lucide-react";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (text: string) => void;
  onSendMessage: (text: string) => void;
  recognitionRef: React.MutableRefObject<any>;
  isActiveRef: React.MutableRefObject<boolean>;
  transcriptCallbackRef: React.MutableRefObject<((final: string, interim: string) => void) | null>;
}

export const VoiceOverlay = ({
  isOpen,
  onClose,
  onTranscriptReady,
  onSendMessage,
  recognitionRef,
  isActiveRef,
  transcriptCallbackRef,
}: VoiceOverlayProps) => {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(40).fill(2));

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");
  const interimRef = useRef("");

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
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserData(new Array(40).fill(2));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setTranscript("");
    setInterimText("");
    transcriptRef.current = "";
    interimRef.current = "";
    setIsListening(true);

    startAudioAnalyser();

    // Register transcript callback — this is called by WeatherzaAI's onresult handler
    transcriptCallbackRef.current = (final: string, interim: string) => {
      if (final) {
        transcriptRef.current = final;
        setTranscript(final);
      }
      interimRef.current = interim;
      setInterimText(interim);
    };

    const interval = setInterval(() => {
      setIsListening(isActiveRef.current);
    }, 200);

    return () => {
      clearInterval(interval);
      stopAudioAnalyser();
      transcriptCallbackRef.current = null;
    };
  }, [isOpen, startAudioAnalyser, stopAudioAnalyser, isActiveRef, transcriptCallbackRef]);

  const getFinalText = () =>
    (transcriptRef.current + (interimRef.current ? " " + interimRef.current : "")).trim();

  const handleClose = () => {
    const finalText = getFinalText();
    if (finalText) onTranscriptReady(finalText);
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    transcriptCallbackRef.current = null;
    stopAudioAnalyser();
    onClose();
  };

  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Capture text BEFORE any cleanup
    const finalText = getFinalText();

    // Stop everything
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    transcriptCallbackRef.current = null;
    stopAudioAnalyser();

    // Close overlay
    onClose();

    // Send after a tick so closure value is used (not stale state)
    if (finalText) {
      requestAnimationFrame(() => onSendMessage(finalText));
    }
  };

  if (!isOpen) return null;

  const fullText = transcript + (interimText ? (transcript ? " " : "") + interimText : "");

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 99999,
        backgroundColor: "#0d0d0d",
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {isListening && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white/50 font-medium tracking-wide">Listening</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-2.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Center content - real-time transcription */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
        {!fullText && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-2xl font-semibold text-white/90">Listening...</h2>
            <p className="text-sm text-white/40">Speak now, your words will appear here</p>
          </div>
        )}

        {fullText && (
          <div className="w-full max-w-lg">
            <p className="text-xl text-white/90 text-center leading-relaxed font-light">
              {transcript}
              {interimText && (
                <span className="text-white/40">{transcript ? " " : ""}{interimText}</span>
              )}
              <span className="inline-block w-0.5 h-5 bg-white/50 ml-1 animate-pulse align-middle" />
            </p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-10 space-y-5">
        {/* Waveform visualizer */}
        <div className="flex items-center justify-center gap-[2px] h-10 mx-auto max-w-sm w-full">
          {analyserData.map((height, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(2, height)}px`,
                backgroundColor: `rgba(255, 255, 255, ${0.2 + (height / 40) * 0.5})`,
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={handleClose}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
            title="Cancel"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={handleSend}
            style={{ pointerEvents: "all", touchAction: "manipulation" }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              fullText
                ? "bg-white hover:bg-white/90 shadow-lg shadow-white/20 scale-100 cursor-pointer"
                : "bg-white/20 scale-95 cursor-not-allowed"
            }`}
            title="Send message"
          >
            <ChevronUp className={`w-6 h-6 ${fullText ? "text-black" : "text-white/40"}`} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
