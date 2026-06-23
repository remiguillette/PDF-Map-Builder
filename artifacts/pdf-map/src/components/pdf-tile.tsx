import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PdfPageInfo } from "@/hooks/use-pdf";
import { cn } from "@/lib/utils";

interface PdfTileProps {
  page: PdfPageInfo;
}

export function PdfTile({ page }: PdfTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isMounted = true;

    const renderPage = async () => {
      try {
        const pdfPage = await page.document.getPage(page.pageNumber);
        if (!isMounted) return;

        const viewport = pdfPage.getViewport({ scale: 1.5 });
        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
          canvas: canvas,
        });

        await renderTask.promise;
        if (isMounted) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [page]);

  return (
    <div
      className="relative group bg-card border border-border shadow-sm transition-all hover:border-primary/50 hover:shadow-primary/10 overflow-hidden"
      style={{
        width: dimensions.width || 600,
        height: dimensions.height || 800,
      }}
    >
      {!isRendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          "block transition-opacity duration-300",
          isRendered ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="absolute bottom-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-md text-xs font-mono font-medium text-foreground shadow-sm">
          {page.pdfName} <span className="text-muted-foreground opacity-50 mx-1">/</span> {page.pageNumber}
        </div>
      </div>
    </div>
  );
}
