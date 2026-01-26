import { Button } from "@/components/ui/button";
import { FileImage, FileText, Download, Play, Pause } from "lucide-react";

interface ExportButtonsProps {
  hasImageData: boolean;
  hasVideo: boolean;
  hasAnimationFrames: boolean;
  isAnimating: boolean;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onDownloadVideo: () => void;
  onToggleAnimation: () => void;
}

export const ExportButtons = ({
  hasImageData,
  hasVideo,
  hasAnimationFrames,
  isAnimating,
  onExportPNG,
  onExportPDF,
  onDownloadVideo,
  onToggleAnimation,
}: ExportButtonsProps) => {
  if (!hasImageData && !hasVideo && !hasAnimationFrames) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {hasImageData && (
        <>
          <Button 
            onClick={onExportPNG} 
            variant="outline" 
            size="sm" 
            className="border-white/20 hover:bg-white/10"
          >
            <FileImage className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
          <Button 
            onClick={onExportPDF} 
            variant="outline" 
            size="sm" 
            className="border-white/20 hover:bg-white/10"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </>
      )}
      
      {hasAnimationFrames && (
        <Button 
          onClick={onToggleAnimation} 
          variant="outline" 
          size="sm" 
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          {isAnimating ? (
            <><Pause className="w-4 h-4 mr-2" />Pause</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Play</>
          )}
        </Button>
      )}
      
      {hasVideo && (
        <Button 
          onClick={onDownloadVideo} 
          variant="outline" 
          size="sm" 
          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>
      )}
    </div>
  );
};
