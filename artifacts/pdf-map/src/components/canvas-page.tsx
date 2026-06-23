import { useRef, useState, useEffect, useCallback } from "react";
import { useTransformContext } from "react-zoom-pan-pinch";
import { PdfPageInfo } from "@/hooks/use-pdf";
import { PdfTile } from "./pdf-tile";

interface CanvasPageProps {
  page: PdfPageInfo;
  position: { x: number; y: number };
  onPositionChange: (id: string, x: number, y: number) => void;
  shouldRenderTile?: boolean;
  placeholderSize: { width: number; height: number };
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
}

export function CanvasPage({
  page,
  position,
  onPositionChange,
  shouldRenderTile = true,
  placeholderSize,
  onSizeChange,
}: CanvasPageProps) {
  const context = useTransformContext();
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{
    mouseX: number;
    mouseY: number;
    posX: number;
    posY: number;
  } | null>(null);

  const pageId = `${page.pdfId}-${page.pageNumber}`;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    [position.x, position.y],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const scale = context.state.scale;
      const dx = (e.clientX - startRef.current.mouseX) / scale;
      const dy = (e.clientY - startRef.current.mouseY) / scale;
      onPositionChange(
        pageId,
        startRef.current.posX + dx,
        startRef.current.posY + dy,
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
  }, [isDragging, context, pageId, onPositionChange]);

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        userSelect: "none",
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 100 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          boxShadow: isDragging
            ? "0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px hsl(var(--primary) / 0.4)"
            : undefined,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {shouldRenderTile ? (
          <PdfTile
            page={page}
            onDimensionsChange={(size) => onSizeChange?.(pageId, size)}
          />
        ) : (
          <div
            className="relative bg-card/70 border border-dashed border-border shadow-sm overflow-hidden"
            style={{
              width: placeholderSize.width,
              height: placeholderSize.height,
            }}
            aria-label={`${page.pdfName} page ${page.pageNumber} placeholder`}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground/70">
              {page.pdfName} / {page.pageNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
