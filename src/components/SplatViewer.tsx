import { useState, useRef, useEffect } from 'react';
import type { SplatEntry } from '@/data/splats';

interface Props {
  splat: SplatEntry;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function SplatViewer({ splat, onClose, onNext, onPrev }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeUrl = splat.embedUrl.includes('/embed/')
    ? splat.embedUrl.replace('/embed/', '/s?id=')
    : splat.embedUrl;

  useEffect(() => { setLoaded(false); }, [splat.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === 'ArrowLeft') onPrev?.();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onNext, onPrev]);

  const toggleFs = () => {
    if (!document.fullscreenElement) { wrapRef.current?.requestFullscreen(); setIsFs(true); }
    else { document.exitFullscreen(); setIsFs(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(iframeUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="splat-overlay" onClick={onClose}>
      <div className={`splat-panel${isFs ? ' splat-fs' : ''}`} ref={wrapRef} onClick={e => e.stopPropagation()}>
        <div className="splat-head">
          <div className="splat-head-left">
            <span className="splat-badge">3D Splat</span>
            <span className="splat-title">{splat.title}</span>
          </div>
          <div className="splat-btns">
            {onPrev && <button onClick={onPrev} title="Previous">←</button>}
            {onNext && <button onClick={onNext} title="Next">→</button>}
            <button onClick={copy} title="Copy embed">{copied ? '✓' : '⎘'}</button>
            <button onClick={toggleFs} title="Fullscreen">{isFs ? '⊠' : '⛶'}</button>
            <a href={splat.sceneUrl} target="_blank" rel="noreferrer" title="Open on superspl.at">↗</a>
            <button onClick={onClose} title="Close">✕</button>
          </div>
        </div>
        <div className="splat-body">
          {!loaded && <div className="splat-spin"><div className="splat-ring"/><p>Loading 3D scene…</p></div>}
          <iframe
            src={iframeUrl}
            title={splat.title}
            allow="fullscreen; xr-spatial-tracking"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity .4s', width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
        <div className="splat-hint">
          <span className="splat-hint-desk">🖱 Drag to orbit · Scroll to zoom</span>
          <span className="splat-hint-mob">👆 1 finger orbit · Pinch to zoom</span>
        </div>
      </div>
    </div>
  );
}
