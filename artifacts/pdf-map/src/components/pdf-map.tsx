import { PdfPageInfo } from "@/hooks/use-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PdfTile } from "./pdf-tile";
import { PdfToolbar } from "./pdf-toolbar";

interface PdfMapProps {
  pages: PdfPageInfo[];
  columns: number;
  setColumns: (cols: number) => void;
  fileCount: number;
  onUploadClick: () => void;
}

export function PdfMap({ pages, columns, setColumns, fileCount, onUploadClick }: PdfMapProps) {
  return (
    <div className="h-screen w-full bg-background overflow-hidden select-none">
      <TransformWrapper
        initialScale={0.5}
        minScale={0.05}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: false }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="p-[10vh]"
        >
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
        </TransformComponent>
        
        {/* Toolbar rendered inside TransformWrapper to access useControls */}
        <PdfToolbar 
          columns={columns}
          setColumns={setColumns}
          pageCount={pages.length}
          fileCount={fileCount}
          onUploadClick={onUploadClick}
        />
      </TransformWrapper>
    </div>
  );
}
