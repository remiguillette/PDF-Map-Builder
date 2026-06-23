import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfToolbar } from "./pdf-toolbar";
import { CanvasPage } from "./canvas-page";
import { GridBackground } from "./grid-background";
import { useCanvasPositions } from "@/hooks/use-canvas-positions";
import {
  DEFAULT_PAGE_BOUNDS,
  createPageSpatialIndex,
  getVisibleCanvasRect,
  type CanvasTransform,
  type PageLayout,
  type ViewportSize,
} from "./viewport-virtualization";
import { PdfRenderScheduler } from "./pdf-render-scheduler";

interface PdfMapProps {
  pages: PdfPageInfo[];
  documents: PdfDocumentInfo[];
  fileCount: number;
}

const CANVAS_WIDTH = 8000;
const CANVAS_HEIGHT = 6000;
const PAGE_START_X = 80;
const PAGE_START_Y = 80;
const DEFAULT_PAGE_POSITION = { x: PAGE_START_X, y: PAGE_START_Y };

const INITIAL_TRANSFORM: CanvasTransform = {
  scale: 0.35,
  positionX: 0,
  positionY: 0,
};

export function PdfMap({
  pages,
  documents: _documents,
  fileCount,
}: PdfMapProps) {
  const pageIds = useMemo(
    () => pages.map((p) => `${p.pdfId}-${p.pageNumber}`),
    [pages],
  );
  const { positions, updatePosition } = useCanvasPositions(pageIds);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renderSchedulerRef = useRef(new PdfRenderScheduler());
  const transformRef = useRef<CanvasTransform>(INITIAL_TRANSFORM);
  const [transform, setTransform] =
    useState<CanvasTransform>(INITIAL_TRANSFORM);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [pageSizes, setPageSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const getScale = useCallback(() => transformRef.current.scale, []);

  const updateTransform = useCallback(
    (state: { scale: number; positionX: number; positionY: number }) => {
      const nextTransform = {
        scale: state.scale,
        positionX: state.positionX,
        positionY: state.positionY,
      };

      transformRef.current = nextTransform;
      setTransform((current) => {
        if (
          current.scale === nextTransform.scale &&
          current.positionX === nextTransform.positionX &&
          current.positionY === nextTransform.positionY
        ) {
          return current;
        }
        return nextTransform;
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

  const visibleRect = useMemo(
    () => getVisibleCanvasRect(viewportSize, transform),
    [viewportSize, transform],
  );

  const pageLayouts = useMemo<PageLayout[]>(
    () =>
      pages.map((page) => {
        const id = `${page.pdfId}-${page.pageNumber}`;
        const position = positions[id] ?? DEFAULT_PAGE_POSITION;
        const size = pageSizes[id] ?? DEFAULT_PAGE_BOUNDS;

        return {
          id,
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };
      }),
    [pages, pageSizes, positions],
  );

  const pagesById = useMemo(
    () =>
      new Map<string, PdfPageInfo>(
        pages.map(
          (page) => [`${page.pdfId}-${page.pageNumber}`, page] as const,
        ),
      ),
    [pages],
  );

  const pageLayoutById = useMemo(
    () => new Map(pageLayouts.map((layout) => [layout.id, layout] as const)),
    [pageLayouts],
  );

  const pageSpatialIndex = useMemo(
    () => createPageSpatialIndex(pageLayouts),
    [pageLayouts],
  );

  const visiblePageIds = useMemo(
    () => pageSpatialIndex.query(visibleRect),
    [pageSpatialIndex, visibleRect],
  );

  const renderSchedule = useMemo(() => {
    const visiblePages = visiblePageIds
      .map((id) => {
        const page = pagesById.get(id);
        const layout = pageLayoutById.get(id);
        if (!page || !layout) return null;

        return {
          ...layout,
          documentId: page.pdfId,
          pageNumber: page.pageNumber,
        };
      })
      .filter((page): page is NonNullable<typeof page> => page !== null);

    return renderSchedulerRef.current.schedule({
      viewport: visibleRect,
      zoom: transform.scale,
      devicePixelRatio: Math.max(1, Math.min(window.devicePixelRatio || 1, 4)),
      pages: visiblePages,
    });
  }, [pageLayoutById, pagesById, transform.scale, visiblePageIds, visibleRect]);

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
            {visiblePageIds.map((id) => {
              const page = pagesById.get(id);
              const layout = pageLayoutById.get(id);
              if (!page || !layout) return null;

              return (
                <CanvasPage
                  key={id}
                  page={page}
                  position={{ x: layout.x, y: layout.y }}
                  onPositionChange={updatePosition}
                  onSizeChange={handlePageSizeChange}
                  getScale={getScale}
                  renderSchedule={renderSchedule}
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
