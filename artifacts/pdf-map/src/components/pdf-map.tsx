import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfToolbar } from "./pdf-toolbar";
import { CanvasPage } from "./canvas-page";
import { GridBackground } from "./grid-background";
import { useCanvasPositions } from "@/hooks/use-canvas-positions";
import {
  DEFAULT_PAGE_BOUNDS,
  getVisibleCanvasRect,
  intersectsCanvasRect,
  type CanvasTransform,
  type ViewportSize,
} from "./viewport-virtualization";

interface PdfMapProps {
  pages: PdfPageInfo[];
  documents: PdfDocumentInfo[];
  fileCount: number;
}

const CANVAS_WIDTH = 8000;
const CANVAS_HEIGHT = 6000;
const PAGE_START_X = 80;
const PAGE_START_Y = 80;
const ZOOM_IDLE_EVENT = "pdf-map:zoom-idle";
const ZOOM_IDLE_DELAY_MS = 250;

const INITIAL_TRANSFORM: CanvasTransform = {
  scale: 0.35,
  positionX: 0,
  positionY: 0,
};

export function PdfMap({ pages, documents, fileCount }: PdfMapProps) {
  const pageIds = useMemo(
    () => pages.map((p) => `${p.pdfId}-${p.pageNumber}`),
    [pages],
  );
  const { positions, updatePosition } = useCanvasPositions(pageIds);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transform, setTransform] =
    useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [pageSizes, setPageSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const scheduleZoomIdle = useCallback((scale: number) => {
    if (zoomIdleTimerRef.current) {
      clearTimeout(zoomIdleTimerRef.current);
    }

    zoomIdleTimerRef.current = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(ZOOM_IDLE_EVENT, { detail: { scale } }),
      );
      zoomIdleTimerRef.current = null;
    }, ZOOM_IDLE_DELAY_MS);
  }, []);

  const updateTransform = useCallback(
    (state: { scale: number; positionX: number; positionY: number }) => {
      setTransform({
        scale: state.scale,
        positionX: state.positionX,
        positionY: state.positionY,
      });
    },
    [],
  );

  const handlePageSizeChange = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setPageSizes((current) => {
        const existing = current[id];
        if (existing?.width === size.width && existing.height === size.height) {
          return current;
        }
        return { ...current, [id]: size };
      });
    },
    [],
  );

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateSize = () => {
      setViewportSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (zoomIdleTimerRef.current) {
        clearTimeout(zoomIdleTimerRef.current);
      }
    };
  }, []);

  const visibleRect = useMemo(
    () => getVisibleCanvasRect(viewportSize, transform),
    [viewportSize, transform],
  );

  const visiblePageIds = useMemo(() => {
    const ids = new Set<string>();

    for (const page of pages) {
      const id = `${page.pdfId}-${page.pageNumber}`;
      const position = positions[id] ?? { x: PAGE_START_X, y: PAGE_START_Y };
      const size = pageSizes[id] ?? DEFAULT_PAGE_BOUNDS;

      if (
        intersectsCanvasRect(
          {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
          },
          visibleRect,
        )
      ) {
        ids.add(id);
      }
    }

    return ids;
  }, [pages, pageSizes, positions, visibleRect]);

  return (
    <div
      ref={wrapperRef}
      className="h-screen w-full bg-background overflow-hidden select-none relative"
    >
      <TransformWrapper
        initialScale={INITIAL_TRANSFORM.scale}
        minScale={0.05}
        maxScale={4}
        centerOnInit={false}
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
        onInit={(ref) => updateTransform(ref.state)}
        onTransform={(ref) => updateTransform(ref.state)}
        onZoom={(ref) => scheduleZoomIdle(ref.state.scale)}
      >
        <GridBackground show={true} />

        <TransformComponent wrapperClass="!w-full !h-full">
          <div
            style={{
              position: "relative",
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            }}
          >
            {pages.map((page) => {
              const id = `${page.pdfId}-${page.pageNumber}`;
              const size = pageSizes[id] ?? DEFAULT_PAGE_BOUNDS;
              return (
                <CanvasPage
                  key={id}
                  page={page}
                  position={
                    positions[id] ?? { x: PAGE_START_X, y: PAGE_START_Y }
                  }
                  onPositionChange={updatePosition}
                  shouldRenderTile={visiblePageIds.has(id)}
                  placeholderSize={size}
                  onSizeChange={handlePageSizeChange}
                />
              );
            })}
          </div>
        </TransformComponent>

        <PdfToolbar pageCount={pages.length} fileCount={fileCount} />
      </TransformWrapper>
    </div>
  );
}
