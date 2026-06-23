import { useMemo } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfTile } from "./pdf-tile";
import { PdfToolbar } from "./pdf-toolbar";
import { CanvasDocument } from "./canvas-document";
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
  const docIds = useMemo(() => documents.map((d) => d.id), [documents]);
  const { positions, updatePosition } = useCanvasPositions(docIds);

  const pagesByDoc = useMemo(() => {
    const map: Record<string, PdfPageInfo[]> = {};
    for (const page of pages) {
      if (!map[page.pdfId]) map[page.pdfId] = [];
      map[page.pdfId].push(page);
    }
    return map;
  }, [pages]);

  return (
    <div className="h-screen w-full bg-background overflow-hidden select-none relative">
      <TransformWrapper
        key={mode}
        initialScale={mode === "canvas" ? 0.35 : 0.5}
        minScale={0.05}
        maxScale={4}
        centerOnInit={mode === "grid"}
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
      >
        {/* Dot grid background — canvas mode only */}
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
              {documents.map((doc) => (
                <CanvasDocument
                  key={doc.id}
                  doc={doc}
                  pages={pagesByDoc[doc.id] ?? []}
                  position={positions[doc.id] ?? { x: 80, y: 80 }}
                  onPositionChange={updatePosition}
                  isEditMode={true}
                />
              ))}
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
