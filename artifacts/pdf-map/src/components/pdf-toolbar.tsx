import { useControls } from "react-zoom-pan-pinch";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Upload,
  Layers,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PdfToolbarProps {
  pageCount: number;
  fileCount: number;
  onUploadClick: () => void;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut()}
        className="h-8 w-8 hover:text-primary"
        title="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => resetTransform()}
        className="h-8 w-8 hover:text-primary"
        title="Reset zoom"
      >
        <Maximize className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn()}
        className="h-8 w-8 hover:text-primary"
        title="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </>
  );
}

export function PdfToolbar({
  pageCount,
  fileCount,
  onUploadClick,
}: PdfToolbarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center h-12 px-2 bg-card/80 backdrop-blur-md border border-border rounded-full shadow-lg shadow-black/20">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 px-2">
        <ZoomControls />
      </div>

      <Separator orientation="vertical" className="h-6 opacity-50" />

      {/* Stats */}
      <div className="flex items-center gap-4 px-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <span>{pageCount} pages</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span>{fileCount} files</span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 opacity-50" />

      {/* Actions */}
      <div className="px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUploadClick}
          className="h-8 gap-2 hover:text-primary"
        >
          <Upload className="h-4 w-4" />
          <span className="text-xs">Add PDF</span>
        </Button>
      </div>
    </div>
  );
}
