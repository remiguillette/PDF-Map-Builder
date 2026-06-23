import { useControls } from "react-zoom-pan-pinch";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Columns2,
  Columns3,
  Columns4,
  Upload,
  Layers,
  FileText,
  LayoutGrid,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ViewMode } from "./pdf-map";

interface PdfToolbarProps {
  columns: number;
  setColumns: (cols: number) => void;
  pageCount: number;
  fileCount: number;
  onUploadClick: () => void;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
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
  columns,
  setColumns,
  pageCount,
  fileCount,
  onUploadClick,
  mode,
  setMode,
}: PdfToolbarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center h-12 px-2 bg-card/80 backdrop-blur-md border border-border rounded-full shadow-lg shadow-black/20">

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 px-2">
        <ZoomControls />
      </div>

      <Separator orientation="vertical" className="h-6 opacity-50" />

      {/* Mode toggle */}
      <div className="flex items-center gap-1 px-3">
        <Button
          variant={mode === "grid" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setMode("grid")}
          className="h-8 w-8"
          title="Grid layout"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={mode === "canvas" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setMode("canvas")}
          className="h-8 w-8"
          title="Free canvas — drag documents"
        >
          <Move className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid column controls — only in grid mode */}
      {mode === "grid" && (
        <>
          <Separator orientation="vertical" className="h-6 opacity-50" />
          <div className="flex items-center gap-1 px-3">
            <Button
              variant={columns === 1 ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setColumns(1)}
              className="h-8 w-8"
              title="1 column"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={columns === 2 ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setColumns(2)}
              className="h-8 w-8"
              title="2 columns"
            >
              <Columns2 className="h-4 w-4" />
            </Button>
            <Button
              variant={columns === 3 ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setColumns(3)}
              className="h-8 w-8"
              title="3 columns"
            >
              <Columns3 className="h-4 w-4" />
            </Button>
            <Button
              variant={columns === 4 ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setColumns(4)}
              className="h-8 w-8"
              title="4 columns"
            >
              <Columns4 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

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
