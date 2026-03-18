import { useEffect, useRef } from "react";
import { Mail, ExternalLink, Wrench, X } from "lucide-react";

interface MaintenanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function MaintenanceModal({ open, onClose }: MaintenanceModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Allow closing via Escape key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="maintenance-dialog"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      style={{ border: "none", background: "transparent", padding: 0, maxWidth: "100vw", maxHeight: "100vh" }}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#18181b] shadow-2xl p-6 text-center flex flex-col gap-4"
        style={{ minWidth: "min(28rem, 90vw)" }}
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
    </dialog>
  );
}
