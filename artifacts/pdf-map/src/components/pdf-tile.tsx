import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PdfPageInfo } from "@/hooks/use-pdf";
import { cn } from "@/lib/utils";

interface PdfTileProps {
  page: PdfPageInfo;
  zoom: number;
}

const BASE_SCALE = 1.5;

export function PdfTile({ page, zoom }: PdfTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialRender = useRef(false);

  const renderAtScale = useCallback(
    async (renderZoom: number) => {
      try {
        const pdfPage = await page.document.getPage(page.pageNumber);

        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayViewport = pdfPage.getViewport({ scale: BASE_SCALE });
        const renderScale = BASE_SCALE * devicePixelRatio * renderZoom;
        const renderViewport = pdfPage.getViewport({ scale: renderScale });

        setDisplayDimensions({
          width: displayViewport.width,
          height: displayViewport.height,
        });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${displayViewport.width}px`;
        canvas.style.height = `${displayViewport.height}px`;

        const task = pdfPage.render({
          canvasContext: context,
          viewport: renderViewport,
        });
        renderTaskRef.current = task;

        await task.promise;
        renderTaskRef.current = null;
        setIsRendered(true);
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    },
    [page]
  );

  useEffect(() => {
    hasInitialRender.current = false;
    setIsRendered(false);

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current);
      renderTimerRef.current = null;
    }

    renderAtScale(zoom);
    hasInitialRender.current = true;

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
        renderTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, renderAtScale]);

  useEffect(() => {
    if (!hasInitialRender.current) return;

    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current);
    }

    renderTimerRef.current = setTimeout(() => {
      renderTimerRef.current = null;
      renderAtScale(zoom);
    }, 200);

    return () => {
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
        renderTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <div
      className="relative group bg-card border border-border shadow-sm transition-all hover:border-primary/50 hover:shadow-primary/10 overflow-hidden"
      style={{
        width: displayDimensions.width || 600,
        height: displayDimensions.height || 800,
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
