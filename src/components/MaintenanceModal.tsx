import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Mail, ExternalLink, Wrench, X } from "lucide-react";

interface MaintenanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function MaintenanceModal({ open, onClose }: MaintenanceModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        style={{ minWidth: "min(28rem, 90vw)" }}
        className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#18181b] shadow-2xl p-6 text-center flex flex-col gap-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/15">
            <Wrench className="w-7 h-7 text-yellow-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white leading-tight">
          🚧 Weatherza AI — Under Maintenance
        </h2>

        {/* Body */}
        <div className="space-y-3 text-sm text-white/75 text-center">
          <p>
            The <span className="font-semibold text-white">Weatherza AI</span> chatbot
            (created by <span className="font-semibold text-white">Rakshit Jain</span>) is
            currently{" "}
            <span className="font-semibold text-yellow-400">under maintenance</span>.
          </p>
          <p>
            Rakshit Jain is currently busy with exams and cannot consistently keep the AI
            running. Once he is free, the AI will be back up and running for you! 🙏
          </p>
          <p className="text-xs text-white/40">
            We apologise for the inconvenience.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <a
              href="mailto:PHYCABO33@gmail.com"
              className="inline-flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              <Mail className="w-4 h-4" />
              PHYCABO33@gmail.com
            </a>
            <a
              href="https://guns.lol/phycabo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              guns.lol/phycabo
            </a>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="mt-1 w-full rounded-xl py-2.5 px-4 font-semibold text-white text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, hsl(28 100% 55%), hsl(28 100% 45%))" }}
        >
          Got it!
        </button>
      </div>
    </div>,
    document.body
  );
}
