import { useRef, useState, useEffect, useCallback } from "react";
import { useTransformContext } from "react-zoom-pan-pinch";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { PdfTile } from "./pdf-tile";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasDocumentProps {
  doc: PdfDocumentInfo;
  pages: PdfPageInfo[];
  position: { x: number; y: number };
  onPositionChange: (id: string, x: number, y: number) => void;
  isEditMode: boolean;
}

export function CanvasDocument({
  doc,
  pages,
  position,
  onPositionChange,
  isEditMode,
}: CanvasDocumentProps) {
  const context = useTransformContext();
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode) return;
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [isEditMode, position.x, position.y]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const scale = context.state.scale;
      const dx = (e.clientX - startRef.current.mouseX) / scale;
      const dy = (e.clientY - startRef.current.mouseY) / scale;
      onPositionChange(
        doc.id,
        startRef.current.posX + dx,
        startRef.current.posY + dy
      );
    };

    const onMouseUp = () => {
      setIsDragging(false);
      startRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, context, doc.id, onPositionChange]);

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        userSelect: "none",
        cursor: isDragging ? "grabbing" : isEditMode ? "grab" : "default",
        zIndex: isDragging ? 100 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={cn(
          "bg-card border border-border rounded-xl shadow-md overflow-hidden transition-shadow",
          isDragging && "shadow-2xl ring-2 ring-primary/40",
          isEditMode && !isDragging && "hover:border-primary/40 hover:shadow-lg"
        )}
      >
        {/* Document header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border">
          {isEditMode && (
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-mono font-medium text-foreground truncate max-w-[240px]">
            {doc.name}
          </span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0 tabular-nums">
            {doc.numPages}p
          </span>
        </div>

        {/* Pages */}
        <div className="flex flex-col gap-3 p-3">
          {pages.map((page) => (
            <PdfTile
              key={`${page.pdfId}-${page.pageNumber}`}
              page={page}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
