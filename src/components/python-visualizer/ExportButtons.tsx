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
            className="font-medium"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#e2e8f0', background: 'rgba(255,255,255,0.04)' }}
          >
            <FileImage className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
          <Button 
            onClick={onExportPDF} 
            variant="outline" 
            size="sm"
            className="font-medium"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#e2e8f0', background: 'rgba(255,255,255,0.04)' }}
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
          className="font-medium"
          style={{ borderColor: 'rgba(139, 92, 246, 0.25)', color: '#a78bfa', background: 'rgba(139, 92, 246, 0.06)' }}
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
          className="font-medium"
          style={{ borderColor: 'rgba(249, 115, 22, 0.25)', color: '#fb923c', background: 'rgba(249, 115, 22, 0.06)' }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>
      )}
    </div>
  );
};
