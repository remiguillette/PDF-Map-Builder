import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PdfPageInfo } from "@/hooks/use-pdf";
import { cn } from "@/lib/utils";
import type { RenderScheduleSnapshot } from "./pdf-render-scheduler";

interface PdfTileProps {
  page: PdfPageInfo;
  onDimensionsChange?: (size: { width: number; height: number }) => void;
  renderSchedule: RenderScheduleSnapshot;
}

type TileKeyParts = {
  documentId: string;
  pageNumber: number;
  tileX: number;
  tileY: number;
  scaleBucket: number;
  rotation: number;
  devicePixelRatio: number;
};

type CachedTile = {
  bitmap: ImageBitmap;
  bytes: number;
};

type TileInfo = {
  tileX: number;
  tileY: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

const BASE_SCALE = 1.5;
const MAX_TILE_PIXELS = 4_000_000;
const TILE_SIZE = 512;
const PREVIEW_SCALE = 0.25;
const MAX_TILE_CACHE_BYTES = 192 * 1024 * 1024;
const MAX_TILE_CACHE_ENTRIES = 256;

class TileBitmapCache {
  private entries = new Map<string, CachedTile>();
  private bytes = 0;

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.bitmap;
  }

  set(key: string, bitmap: ImageBitmap, bytes: number) {
    const previous = this.entries.get(key);
    if (previous) {
      previous.bitmap.close();
      this.bytes -= previous.bytes;
      this.entries.delete(key);
    }

    this.entries.set(key, { bitmap, bytes });
    this.bytes += bytes;
    this.evictIfNeeded();
  }

  evictOversized(maxScaleBucket: number) {
    for (const [key, entry] of this.entries) {
      const scaleBucket = Number(key.split(":")[4]);
      if (Number.isFinite(scaleBucket) && scaleBucket > maxScaleBucket) {
        entry.bitmap.close();
        this.bytes -= entry.bytes;
        this.entries.delete(key);
      }
    }
  }

  private evictIfNeeded() {
    while (
      this.bytes > MAX_TILE_CACHE_BYTES ||
      this.entries.size > MAX_TILE_CACHE_ENTRIES
    ) {
      const oldest = this.entries.entries().next().value as
        | [string, CachedTile]
        | undefined;
      if (!oldest) return;

      const [key, entry] = oldest;
      entry.bitmap.close();
      this.bytes -= entry.bytes;
      this.entries.delete(key);
    }
  }
}

const tileCache = new TileBitmapCache();

function getTileKey(parts: TileKeyParts) {
  return [
    parts.documentId,
    parts.pageNumber,
    parts.tileX,
    parts.tileY,
    parts.scaleBucket,
    parts.rotation,
    parts.devicePixelRatio,
  ].join(":");
}

function getTileRenderMetrics(
  tile: TileInfo,
  scaleBucket: number,
  devicePixelRatio: number,
) {
  const requestedPixelRatio = devicePixelRatio * scaleBucket;
  const requestedPixels =
    tile.width * requestedPixelRatio * tile.height * requestedPixelRatio;
  const boundedPixelRatio =
    requestedPixels <= MAX_TILE_PIXELS
      ? requestedPixelRatio
      : Math.sqrt(MAX_TILE_PIXELS / (tile.width * tile.height));

  return {
    outputScale: Math.max(1, boundedPixelRatio),
    devicePixelRatio,
  };
}

function drawBitmapToCanvas(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  tile: TileInfo,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.style.width = `${tile.width}px`;
  canvas.style.height = `${tile.height}px`;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
}

function PdfPageTile({
  page,
  tile,
  scaleBucket,
  rotation,
  isPreviewReady,
  renderGeneration,
  devicePixelRatio,
}: {
  page: PdfPageInfo;
  tile: TileInfo;
  scaleBucket: number;
  rotation: number;
  isPreviewReady: boolean;
  renderGeneration: number;
  devicePixelRatio: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const latestGenerationRef = useRef(renderGeneration);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    latestGenerationRef.current = renderGeneration;
  }, [renderGeneration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { root: null, rootMargin: `${TILE_SIZE}px` },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let isCancelled = false;
    const generation = renderGeneration;
    const metrics = getTileRenderMetrics(tile, scaleBucket, devicePixelRatio);
    const key = getTileKey({
      documentId: page.pdfId,
      pageNumber: page.pageNumber,
      tileX: tile.tileX,
      tileY: tile.tileY,
      scaleBucket,
      rotation,
      devicePixelRatio: metrics.devicePixelRatio,
    });

    const cached = tileCache.get(key);
    if (cached && canvasRef.current) {
      drawBitmapToCanvas(canvasRef.current, cached, tile);
      setIsRendered(true);
      return;
    }

    setIsRendered(false);

    void (async () => {
      try {
        const pdfPage = await page.document.getPage(page.pageNumber);
        if (isCancelled || generation !== latestGenerationRef.current) return;

        const renderScale = BASE_SCALE * metrics.outputScale;
        const viewport = pdfPage.getViewport({ scale: renderScale, rotation });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.ceil(tile.width * metrics.outputScale);
        canvas.height = Math.ceil(tile.height * metrics.outputScale);
        context.save();
        context.translate(
          -tile.left * metrics.outputScale,
          -tile.top * metrics.outputScale,
        );

        const task = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = task;
        await task.promise;
        context.restore();
        renderTaskRef.current = null;

        if (isCancelled || generation !== latestGenerationRef.current) return;

        const bitmap = await createImageBitmap(canvas);
        const bytes = bitmap.width * bitmap.height * 4;
        tileCache.set(key, bitmap, bytes);

        if (canvasRef.current) {
          drawBitmapToCanvas(canvasRef.current, bitmap, tile);
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering PDF tile:", err);
        }
      }
    })();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [
    devicePixelRatio,
    isVisible,
    page,
    renderGeneration,
    rotation,
    scaleBucket,
    tile,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute transition-opacity duration-200",
        isRendered
          ? "opacity-100"
          : isPreviewReady
            ? "opacity-0"
            : "opacity-30",
      )}
      style={{
        left: tile.left,
        top: tile.top,
        width: tile.width,
        height: tile.height,
      }}
    />
  );
}

export function PdfTile({
  page,
  onDimensionsChange,
  renderSchedule,
}: PdfTileProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRenderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const previewGenerationRef = useRef(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [displayDimensions, setDisplayDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [rotation, setRotation] = useState(0);

  const tiles = useMemo(() => {
    const cols = Math.ceil(displayDimensions.width / TILE_SIZE);
    const rows = Math.ceil(displayDimensions.height / TILE_SIZE);
    return Array.from({ length: cols * rows }, (_, index) => {
      const tileX = index % cols;
      const tileY = Math.floor(index / cols);
      const left = tileX * TILE_SIZE;
      const top = tileY * TILE_SIZE;
      return {
        tileX,
        tileY,
        left,
        top,
        width: Math.min(TILE_SIZE, displayDimensions.width - left),
        height: Math.min(TILE_SIZE, displayDimensions.height - top),
      };
    }).filter((tile) => tile.width > 0 && tile.height > 0);
  }, [displayDimensions.height, displayDimensions.width]);

  const renderPreview = useCallback(async () => {
    const previewGeneration = previewGenerationRef.current + 1;
    previewGenerationRef.current = previewGeneration;

    try {
      const pdfPage = await page.document.getPage(page.pageNumber);
      if (previewGeneration !== previewGenerationRef.current) return;

      const displayViewport = pdfPage.getViewport({ scale: BASE_SCALE });
      setRotation(displayViewport.rotation);
      const nextDisplayDimensions = {
        width: displayViewport.width,
        height: displayViewport.height,
      };
      setDisplayDimensions(nextDisplayDimensions);
      onDimensionsChange?.(nextDisplayDimensions);

      const canvas = previewCanvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const previewViewport = pdfPage.getViewport({
        scale: BASE_SCALE * PREVIEW_SCALE,
      });
      canvas.width = Math.floor(previewViewport.width);
      canvas.height = Math.floor(previewViewport.height);
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      const task = pdfPage.render({
        canvas,
        canvasContext: context,
        viewport: previewViewport,
      });
      previewRenderTaskRef.current = task;
      await task.promise;
      previewRenderTaskRef.current = null;
      if (previewGeneration !== previewGenerationRef.current) return;
      setIsPreviewReady(true);
    } catch (err: any) {
      if (err.name !== "RenderingCancelledException")
        console.error("Error rendering page preview:", err);
    }
  }, [page, onDimensionsChange]);

  useEffect(() => {
    setIsPreviewReady(false);
    void renderPreview();
    return () => {
      previewGenerationRef.current += 1;
      previewRenderTaskRef.current?.cancel();
      previewRenderTaskRef.current = null;
    };
  }, [renderPreview]);

  const scaleBucket = renderSchedule.zoomBucket;

  useEffect(() => {
    tileCache.evictOversized(scaleBucket + 1);
  }, [scaleBucket]);

  return (
    <div
      className="relative group bg-card border border-border shadow-sm transition-all hover:border-primary/50 hover:shadow-primary/10 overflow-hidden"
      style={{
        width: displayDimensions.width || 600,
        height: displayDimensions.height || 800,
      }}
    >
      {!isPreviewReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
        </div>
      )}
      <canvas
        ref={previewCanvasRef}
        className={cn(
          "absolute inset-0 block transition-opacity duration-300",
          isPreviewReady ? "opacity-100" : "opacity-0",
        )}
      />
      {tiles.map((tile) => (
        <PdfPageTile
          key={`${tile.tileX}-${tile.tileY}`}
          page={page}
          tile={tile}
          scaleBucket={scaleBucket}
          rotation={rotation}
          isPreviewReady={isPreviewReady}
          renderGeneration={renderSchedule.generation}
          devicePixelRatio={renderSchedule.devicePixelRatio}
        />
      ))}
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
