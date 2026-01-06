import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

export const VoiceRecorder = ({ onTranscript, onClose }: VoiceRecorderProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(32).fill(5));
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio visualization
  const startAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevels = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert to normalized levels (0-100)
        const levels = Array.from(dataArray).slice(0, 32).map(v => 
          Math.max(5, Math.min(100, (v / 255) * 100 + 5))
        );
        setAudioLevels(levels);
        
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      
      updateLevels();
    } catch (error) {
      console.error("Audio visualization error:", error);
    }
  }, []);

  // Stop audio visualization
  const stopAudioVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setAudioLevels(Array(32).fill(5));
  }, []);

  // Start speech recognition
  const startListening = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ 
        title: "Not supported", 
        description: "Speech recognition is not supported. Try Chrome.", 
        variant: "destructive" 
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      startAudioVisualization();
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'aborted') {
        toast({ 
          title: "Voice error", 
          description: event.error === 'no-speech' ? "No speech detected. Try again." : `Error: ${event.error}`, 
          variant: "destructive" 
        });
      }
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioVisualization();
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
    }
  }, [toast, startAudioVisualization, stopAudioVisualization]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopAudioVisualization();
  }, [stopAudioVisualization]);

  // Send transcript
  const handleSend = useCallback(() => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      onClose();
    }
  }, [transcript, onTranscript, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  // Auto-start on mount
  useEffect(() => {
    startListening();
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg mx-4 p-8 rounded-3xl bg-gradient-to-b from-background/95 to-background/80 border border-white/10 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-foreground/60" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all duration-300 ${
            isListening 
              ? 'bg-red-500/20 shadow-lg shadow-red-500/20' 
              : 'bg-primary/20'
          }`}>
            <Mic className={`w-8 h-8 transition-colors ${isListening ? 'text-red-400' : 'text-primary'}`} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-1">
            {isListening ? "Listening..." : "Voice Input"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isListening ? "Speak now, I'm capturing your voice" : "Initializing..."}
          </p>
        </div>

        {/* Audio Waveform Visualization */}
        <div className="flex items-center justify-center gap-[3px] h-24 mb-8 px-4">
          {audioLevels.map((level, index) => (
            <div
              key={index}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isListening 
                  ? 'bg-gradient-to-t from-primary via-purple-400 to-primary' 
                  : 'bg-white/20'
              }`}
              style={{
                height: `${level}%`,
                opacity: isListening ? 0.6 + (level / 200) : 0.3,
                transform: `scaleY(${isListening ? 1 : 0.3})`,
              }}
            />
          ))}
        </div>

        {/* Transcript Display */}
        <div className="min-h-[60px] mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          {transcript ? (
            <p className="text-foreground/90 leading-relaxed">{transcript}</p>
          ) : (
            <p className="text-muted-foreground italic text-center">
              {isListening ? "Your words will appear here..." : "Starting..."}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6 border-white/20 hover:bg-white/10"
          >
            Cancel
          </Button>
          
          {isListening ? (
            <Button
              onClick={stopListening}
              className="px-6 bg-red-500 hover:bg-red-600 text-white"
            >
              Stop Recording
            </Button>
          ) : (
            <Button
              onClick={startListening}
              className="px-6 bg-gradient-to-r from-primary to-purple-500"
            >
              Start Again
            </Button>
          )}
          
          <Button
            onClick={handleSend}
            disabled={!transcript.trim()}
            className="px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
