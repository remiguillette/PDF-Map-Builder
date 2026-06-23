import { useMemo } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfTile } from "./pdf-tile";
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
    [pages]
  );
  const { positions, updatePosition } = useCanvasPositions(pageIds);

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
        {mode === "canvas" && <GridBackground show={true} />}

        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass={mode === "grid" ? "p-[10vh]" : ""}
        >
          {mode === "grid" ? (
            <div
              className="grid gap-12 place-items-center"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {pages.map((page) => (
                <PdfTile
                  key={`${page.pdfId}-${page.pageNumber}`}
                  page={page}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                width: 8000,
                height: 6000,
              }}
            >
              {pages.map((page) => {
                const id = `${page.pdfId}-${page.pageNumber}`;
                return (
                  <CanvasPage
                    key={id}
                    page={page}
                    position={positions[id] ?? { x: 80, y: 80 }}
                    onPositionChange={updatePosition}
                  />
                );
              })}
            </div>
          )}
        </TransformComponent>

        <PdfToolbar
          columns={columns}
          setColumns={setColumns}
          pageCount={pages.length}
          fileCount={fileCount}
          onUploadClick={onUploadClick}
          mode={mode}
          setMode={setMode}
        />
      </TransformWrapper>
    </div>
  );
}
