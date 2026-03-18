import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wrench, Mail, ExternalLink } from "lucide-react";

interface MaintenanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function MaintenanceModal({ open, onClose }: MaintenanceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-2 mx-auto">
            <Wrench className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
          </div>
          <DialogTitle className="text-xl font-bold">
            🚧 Weatherza AI — Under Maintenance
          </DialogTitle>
        </DialogHeader>

        <DialogDescription asChild>
          <div className="space-y-3 text-sm text-foreground/80 text-center">
            <p>
              The <span className="font-semibold text-foreground">Weatherza AI</span> chatbot
              (created by <span className="font-semibold text-foreground">rAkshIt Jain</span>) is
              currently <span className="font-semibold text-yellow-600 dark:text-yellow-400">under maintenance</span>.
            </p>
            <p>
              rAkshIt Jain is currently busy with exams and cannot consistently keep the AI running.
              Once he is free, the AI will be back up and running for you! 🙏
            </p>
            <p className="text-xs text-muted-foreground">
              We apologise for the inconvenience.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href="mailto:PHYCABO33@gmail.com"
                className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Mail className="w-4 h-4" />
                PHYCABO33@gmail.com
              </a>
              <a
                href="https://guns.lol/phycabo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                guns.lol/phycabo
              </a>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
