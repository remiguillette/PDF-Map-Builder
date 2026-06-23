import { useCallback, useMemo } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfToolbar } from "./pdf-toolbar";
import { CanvasPage } from "./canvas-page";
import { GridBackground } from "./grid-background";
import { useCanvasPositions } from "@/hooks/use-canvas-positions";

export type ViewMode = "grid" | "canvas";

interface PdfMapProps {
  pages: PdfPageInfo[];
  documents: PdfDocumentInfo[];
  columns: number;
  setColumns: (cols: number) => void;
  fileCount: number;
  onUploadClick: () => void;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const CANVAS_WIDTH = 8000;
const CANVAS_HEIGHT = 6000;
const PAGE_GAP_X = 760;
const PAGE_GAP_Y = 1020;
const PAGE_START_X = 80;
const PAGE_START_Y = 80;

export function PdfMap({
  pages,
  documents,
  columns,
  setColumns,
  fileCount,
  onUploadClick,
  mode,
  setMode,
}: PdfMapProps) {
  const pageIds = useMemo(
    () => pages.map((p) => `${p.pdfId}-${p.pageNumber}`),
    [pages],
  );
  const { positions, updatePosition, updatePositions } =
    useCanvasPositions(pageIds);

  const arrangePages = useCallback(
    (columnCount = columns) => {
      const arrangedPositions = Object.fromEntries(
        pages.map((page, index) => {
          const id = `${page.pdfId}-${page.pageNumber}`;
          const col = index % columnCount;
          const row = Math.floor(index / columnCount);
          return [
            id,
            {
              x: PAGE_START_X + col * PAGE_GAP_X,
              y: PAGE_START_Y + row * PAGE_GAP_Y,
            },
          ];
        }),
      );

      updatePositions(arrangedPositions);
    },
    [columns, pages, updatePositions],
  );

  const handleArrangeColumns = useCallback(
    (columnCount: number) => {
      setColumns(columnCount);
      arrangePages(columnCount);
    },
    [arrangePages, setColumns],
  );

  return (
    <div className="h-screen w-full bg-background overflow-hidden select-none relative">
      <TransformWrapper
        initialScale={mode === "canvas" ? 0.35 : 0.5}
        minScale={0.05}
        maxScale={4}
        centerOnInit={mode === "grid"}
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
      >
        <GridBackground show={mode === "canvas"} />

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
              return (
                <CanvasPage
                  key={id}
                  page={page}
                  position={
                    positions[id] ?? { x: PAGE_START_X, y: PAGE_START_Y }
                  }
                  onPositionChange={updatePosition}
                />
              );
            })}
          </div>
        </TransformComponent>

        <PdfToolbar
          columns={columns}
          setColumns={handleArrangeColumns}
          pageCount={pages.length}
          fileCount={fileCount}
          onUploadClick={onUploadClick}
          mode={mode}
          setMode={setMode}
          onAutoArrange={() => arrangePages()}
        />
      </TransformWrapper>
    </div>
  );
}
