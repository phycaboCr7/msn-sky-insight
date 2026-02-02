import { lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

// Lazy load PyodideRunner for graph visualization
const PyodideRunner = lazy(() => import("@/components/python-visualizer"));

interface PythonVisualizerPortalProps {
  code: string | null;
  onClose: () => void;
}

/**
 * Portal wrapper that renders PyodideRunner as a SEPARATE popup 
 * at the document root level, completely independent of the AI chat.
 */
export const PythonVisualizerPortal = ({ code, onClose }: PythonVisualizerPortalProps) => {
  if (!code) return null;

  // Render at document.body level - completely separate from AI chat
  return createPortal(
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 p-8 bg-card/90 rounded-2xl border border-white/10 shadow-2xl">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <span className="absolute -top-1 -right-1 text-2xl">🐍</span>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">Loading Python Environment</h3>
              <p className="text-sm text-muted-foreground">Setting up NumPy, Matplotlib & more...</p>
            </div>
          </div>
        </div>
      }
    >
      <PyodideRunner code={code} onClose={onClose} />
    </Suspense>,
    document.body
  );
};
