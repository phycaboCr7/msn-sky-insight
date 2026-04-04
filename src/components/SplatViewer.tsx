import { useState, useRef, useEffect } from 'react';
import type { SplatEntry } from '@/data/splats';
import { X, Maximize2, Minimize2, Copy, Check, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface SplatViewerProps {
  splat: SplatEntry;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function SplatViewer({ splat, onClose, onNext, onPrev }: SplatViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === 'ArrowLeft') onPrev?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNext, onPrev]);

  useEffect(() => { setLoaded(false); }, [splat.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(splat.embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', animation: 'fade-in 0.2s ease' }}
      onClick={onClose}
    >
      <div
        ref={wrapRef}
        className={`flex flex-col overflow-hidden w-full max-w-[880px] ${isFullscreen ? 'max-h-screen rounded-none' : 'max-h-[90vh] rounded-xl'}`}
        style={{
          background: 'hsl(220 20% 10%)',
          border: '1px solid hsl(220 15% 22%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          animation: 'slide-up 0.25s cubic-bezier(.16,1,.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(220 15% 18%)' }}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'hsl(200 80% 20%)', color: 'hsl(200 80% 70%)', border: '1px solid hsl(200 60% 30%)' }}>
              3D Splat
            </span>
            <h3 className="text-sm font-semibold text-foreground truncate">{splat.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onPrev && <button onClick={onPrev} className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
            {onNext && <button onClick={onNext} className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>}
            <button onClick={copyLink} className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleFullscreen} className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <a href={splat.sceneUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center bg-secondary/50 hover:bg-destructive/50 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="relative flex-1" style={{ aspectRatio: '16/9', minHeight: '300px', background: 'hsl(220 20% 7%)' }}>
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
              <div className="w-9 h-9 border-2 rounded-full animate-spin" style={{ borderColor: 'hsl(220 15% 22%)', borderTopColor: 'hsl(220 70% 60%)' }} />
              <p>Loading 3D scene…</p>
            </div>
          )}
          <iframe
            src={splat.embedUrl}
            title={splat.title}
            allow="fullscreen; xr-spatial-tracking"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="w-full h-full border-none block"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}
          />
        </div>

        {/* Hint */}
        <div className="px-4 py-2 text-[11px] text-muted-foreground flex gap-4" style={{ background: 'hsl(220 20% 8%)', borderTop: '1px solid hsl(220 15% 15%)' }}>
          <span>🖱 Drag to orbit · Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
