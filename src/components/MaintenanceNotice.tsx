import { AlertTriangle, Clock, WifiOff, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface MaintenanceNoticeProps {
  open: boolean;
  onDismiss: () => void;
  message?: string;
}

const MAINTENANCE_DISMISS_KEY = "weatherza-maintenance-dismissed";

export const MaintenanceNotice = ({ open, onDismiss, message }: MaintenanceNoticeProps) => {
  const resolvedMessage = useMemo(
    () =>
      message?.trim() ||
      "We're performing scheduled maintenance. Some data might be slower or briefly unavailable.",
    [message]
  );

  const handleDismiss = () => {
    try {
      localStorage.setItem(MAINTENANCE_DISMISS_KEY, new Date().toISOString());
    } catch (err) {
      console.warn("Could not persist maintenance dismissal", err);
    }
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(state) => !state && handleDismiss()}>
      <DialogContent className="bg-neutral-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl text-foreground max-w-md">
        <DialogHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-semibold">Scheduled Maintenance</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              We’ll be back to full speed shortly.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p className="text-foreground/90">{resolvedMessage}</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-300 mt-0.5" />
              <span>Typical maintenance finishes within a few minutes.</span>
            </li>
            <li className="flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-amber-300 mt-0.5" />
              <span>Real-time data may be delayed while we work.</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Dismiss
          </button>
          <Button onClick={handleDismiss} className="shadow-primary/30 shadow-lg">
            I understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { MAINTENANCE_DISMISS_KEY };
