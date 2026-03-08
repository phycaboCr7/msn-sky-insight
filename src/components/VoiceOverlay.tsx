import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, Mic, Loader2 } from "lucide-react";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (text: string) => void;
  onSendMessage: (text: string) => void;
}

export const VoiceOverlay = ({
  isOpen,
  onClose,
  onTranscriptReady,
  onSendMessage,
}: VoiceOverlayProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(40).fill(2));

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopEverything = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;

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
    setIsRecording(false);
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Transcription failed: ${err}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || "";
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio visualizer
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

      // Media recorder — collect all audio in one go
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, []);

  // Auto-start recording when overlay opens
  useEffect(() => {
    if (!isOpen) return;
    audioChunksRef.current = [];
    startRecording();
    return () => stopEverything();
  }, [isOpen, startRecording, stopEverything]);

  const handleClose = () => {
    stopEverything();
    onClose();
  };

  // Send: stop recording → transcribe entire audio → send
  const handleSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      stopEverything();
      onClose();
      return;
    }

    const recorder = mediaRecorderRef.current;

    // Wait for recorder to stop and collect final chunks
    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      recorder.stop();
    });

    // Stop streams/visualizer
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setAnalyserData(new Array(40).fill(2));
    setIsRecording(false);

    if (audioBlob.size < 1000) {
      onClose();
      return;
    }

    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(audioBlob);
      setIsTranscribing(false);
      onClose();
      if (text && text.trim()) {
        requestAnimationFrame(() => onSendMessage(text.trim()));
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setIsTranscribing(false);
      onClose();
    }
  };

  if (!isOpen) return null;

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
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white/50 font-medium tracking-wide">Recording</span>
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-1.5 ml-3">
              <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
              <span className="text-sm text-white/40">Processing...</span>
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

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
        {!isTranscribing && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-2xl font-semibold text-white/90">Listening...</h2>
            <p className="text-sm text-white/40">Speak now — tap the arrow when you're done</p>
          </div>
        )}

        {isTranscribing && (
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-white/30 animate-spin mx-auto" />
            <p className="text-sm text-white/40">Weatherza AI is processing your voice...</p>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-16 space-y-6">
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
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleClose}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
            title="Cancel"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={handleSend}
            disabled={isTranscribing}
            style={{ pointerEvents: "all", touchAction: "manipulation" }}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-white hover:bg-white/90 shadow-lg shadow-white/20 scale-100 cursor-pointer"
                : "bg-white/20 scale-95 cursor-not-allowed"
            }`}
            title="Send message"
          >
            {isTranscribing ? (
              <Loader2 className="w-7 h-7 text-black animate-spin" />
            ) : (
              <ChevronUp className={`w-7 h-7 ${isRecording ? "text-black" : "text-white/40"}`} />
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
