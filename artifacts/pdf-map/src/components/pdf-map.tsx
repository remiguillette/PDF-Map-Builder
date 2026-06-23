import { useMemo } from "react";
import { PdfPageInfo, PdfDocumentInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfToolbar } from "./pdf-toolbar";
import { CanvasPage } from "./canvas-page";
import { GridBackground } from "./grid-background";
import { useCanvasPositions } from "@/hooks/use-canvas-positions";

interface PdfMapProps {
  pages: PdfPageInfo[];
  documents: PdfDocumentInfo[];
  fileCount: number;
  onUploadClick: () => void;
}

const CANVAS_WIDTH = 8000;
const CANVAS_HEIGHT = 6000;
const PAGE_START_X = 80;
const PAGE_START_Y = 80;

export function PdfMap({
  pages,
  documents,
  fileCount,
  onUploadClick,
}: PdfMapProps) {
  const pageIds = useMemo(
    () => pages.map((p) => `${p.pdfId}-${p.pageNumber}`),
    [pages],
  );
  const { positions, updatePosition } = useCanvasPositions(pageIds);

  return (
    <div className="h-screen w-full bg-background overflow-hidden select-none relative">
      <TransformWrapper
        initialScale={0.35}
        minScale={0.05}
        maxScale={4}
        centerOnInit={false}
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
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
          pageCount={pages.length}
          fileCount={fileCount}
          onUploadClick={onUploadClick}
        />
      </TransformWrapper>
    </div>
  );
}
