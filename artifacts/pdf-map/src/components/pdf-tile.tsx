import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PdfPageInfo } from "@/hooks/use-pdf";
import { cn } from "@/lib/utils";

interface PdfTileProps {
  page: PdfPageInfo;
  onDimensionsChange?: (size: { width: number; height: number }) => void;
}

const BASE_SCALE = 1.5;
const INITIAL_RENDER_ZOOM = 1;
const MAX_RENDER_ZOOM = 2;
const MAX_CANVAS_PIXELS = 8_000_000;
const RERENDER_ZOOM_THRESHOLD = 0.25;
const ZOOM_IDLE_EVENT = "pdf-map:zoom-idle";

function getBoundedRenderScale(
  displayWidth: number,
  displayHeight: number,
  requestedZoom: number,
) {
  const requestedPixelRatio = Math.min(
    (window.devicePixelRatio || 1) * requestedZoom,
    MAX_RENDER_ZOOM,
  );
  const requestedPixels =
    displayWidth * requestedPixelRatio * displayHeight * requestedPixelRatio;

  if (requestedPixels <= MAX_CANVAS_PIXELS) {
    return BASE_SCALE * requestedPixelRatio;
  }

  const boundedPixelRatio = Math.sqrt(
    MAX_CANVAS_PIXELS / (displayWidth * displayHeight),
  );
  return (
    BASE_SCALE * Math.max(1, Math.min(requestedPixelRatio, boundedPixelRatio))
  );
}

export function PdfTile({ page, onDimensionsChange }: PdfTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [displayDimensions, setDisplayDimensions] = useState({
    width: 0,
    height: 0,
  });
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const lastRenderedZoomRef = useRef(0);

  const renderAtScale = useCallback(
    async (requestedZoom: number) => {
      try {
        const pdfPage = await page.document.getPage(page.pageNumber);
        const displayViewport = pdfPage.getViewport({ scale: BASE_SCALE });
        const renderScale = getBoundedRenderScale(
          displayViewport.width,
          displayViewport.height,
          requestedZoom,
        );
        const renderViewport = pdfPage.getViewport({ scale: renderScale });

        const nextDisplayDimensions = {
          width: displayViewport.width,
          height: displayViewport.height,
        };

        setDisplayDimensions(nextDisplayDimensions);
        onDimensionsChange?.(nextDisplayDimensions);

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
          canvas,
          canvasContext: context,
          viewport: renderViewport,
        });
        renderTaskRef.current = task;

        await task.promise;
        renderTaskRef.current = null;
        lastRenderedZoomRef.current = requestedZoom;
        setIsRendered(true);
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    },
    [page, onDimensionsChange],
  );

  useEffect(() => {
    lastRenderedZoomRef.current = 0;
    setIsRendered(false);
    renderAtScale(INITIAL_RENDER_ZOOM);

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [page, renderAtScale]);

  useEffect(() => {
    const handleZoomIdle = (event: Event) => {
      const zoom = (event as CustomEvent<{ scale?: number }>).detail?.scale;
      if (
        !zoom ||
        zoom <= lastRenderedZoomRef.current + RERENDER_ZOOM_THRESHOLD
      ) {
        return;
      }
      renderAtScale(zoom);
    };

    window.addEventListener(ZOOM_IDLE_EVENT, handleZoomIdle);
    return () => window.removeEventListener(ZOOM_IDLE_EVENT, handleZoomIdle);
  }, [renderAtScale]);

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
          isRendered ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="absolute bottom-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-md text-xs font-mono font-medium text-foreground shadow-sm">
          {page.pdfName}{" "}
          <span className="text-muted-foreground opacity-50 mx-1">/</span>{" "}
          {page.pageNumber}
        </div>
      </div>
    </div>
  );
}
