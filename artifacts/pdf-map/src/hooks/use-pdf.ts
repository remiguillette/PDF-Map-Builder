import { useState, useCallback, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PreloadedPdf } from "@/pdf-registry";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).href;

export type PdfDocumentInfo = {
  id: string;
  name: string;
  document: pdfjsLib.PDFDocumentProxy;
  numPages: number;
};

export type PdfPageMetadata = {
  width: number;
  height: number;
  rotation: number;
};

export type PdfPageInfo = {
  pdfId: string;
  documentId: string;
  pdfName: string;
  pageNumber: number;
  document: pdfjsLib.PDFDocumentProxy;
  width: number | null;
  height: number | null;
  rotation: number | null;
};

type DestroyablePdfDocument = pdfjsLib.PDFDocumentProxy & {
  destroy: () => Promise<void>;
};

type DestroyablePdfLoadingTask = pdfjsLib.PDFDocumentLoadingTask & {
  destroy: () => Promise<void>;
};

const PDF_RANGE_CHUNK_SIZE = 1024 * 1024;

function destroyDocuments(documentsToDestroy: PdfDocumentInfo[]) {
  for (const { document } of documentsToDestroy) {
    void (document as DestroyablePdfDocument).destroy();
  }
}

export function usePdfLoader() {
  const [documents, setDocuments] = useState<PdfDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageMetadata, setPageMetadata] = useState<
    Record<string, PdfPageMetadata>
  >({});
  const loadingTasksRef = useRef<Set<DestroyablePdfLoadingTask>>(new Set());
  const loadGenerationRef = useRef(0);

  const cancelLoadingTasks = useCallback(() => {
    for (const task of loadingTasksRef.current) {
      void task.destroy();
    }
    loadingTasksRef.current.clear();
  }, []);

  const loadFromUrls = useCallback(
    async (pdfs: PreloadedPdf[]) => {
      const loadGeneration = loadGenerationRef.current + 1;
      loadGenerationRef.current = loadGeneration;
      cancelLoadingTasks();
      setIsLoading(true);
      setError(null);
      setPageMetadata({});

      const newDocs: PdfDocumentInfo[] = [];
      try {
        for (const pdf of pdfs) {
          const loadingTask = pdfjsLib.getDocument({
            url: pdf.path,
            rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
            disableAutoFetch: true,
            disableStream: false,
          }) as DestroyablePdfLoadingTask;

          loadingTasksRef.current.add(loadingTask);
          const document = await loadingTask.promise.finally(() => {
            loadingTasksRef.current.delete(loadingTask);
          });

          if (loadGenerationRef.current !== loadGeneration) {
            void (document as DestroyablePdfDocument).destroy();
            continue;
          }

          newDocs.push({
            id: pdf.id,
            name: pdf.name,
            document,
            numPages: document.numPages,
          });
        }

        if (loadGenerationRef.current !== loadGeneration) {
          destroyDocuments(newDocs);
          return;
        }

        setDocuments((previousDocs) => {
          destroyDocuments(previousDocs);
          return newDocs;
        });
      } catch (err: any) {
        if (loadGenerationRef.current !== loadGeneration) {
          destroyDocuments(newDocs);
          return;
        }

        destroyDocuments(newDocs);
        setError(err.message || "Failed to load PDFs");
      } finally {
        if (loadGenerationRef.current === loadGeneration) {
          setIsLoading(false);
        }
      }
    },
    [cancelLoadingTasks],
  );

  const clearPdfs = useCallback(() => {
    loadGenerationRef.current += 1;
    cancelLoadingTasks();
    setDocuments((previousDocs) => {
      destroyDocuments(previousDocs);
      return [];
    });
    setIsLoading(false);
    setPageMetadata({});
    setError(null);
  }, [cancelLoadingTasks]);

  useEffect(() => {
    const metadataGeneration = loadGenerationRef.current;
    let isCancelled = false;

    async function loadPageMetadata() {
      for (const doc of documents) {
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
          if (isCancelled || loadGenerationRef.current !== metadataGeneration) {
            return;
          }

          const page = await doc.document.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          const id = `${doc.id}-${pageNumber}`;

          if (isCancelled || loadGenerationRef.current !== metadataGeneration) {
            page.cleanup();
            return;
          }

          setPageMetadata((current) => {
            const existing = current[id];
            if (
              existing?.width === viewport.width &&
              existing.height === viewport.height &&
              existing.rotation === viewport.rotation
            ) {
              return current;
            }

            return {
              ...current,
              [id]: {
                width: viewport.width,
                height: viewport.height,
                rotation: viewport.rotation,
              },
            };
          });
          page.cleanup();
        }
      }
    }

    void loadPageMetadata().catch((err: any) => {
      if (!isCancelled && loadGenerationRef.current === metadataGeneration) {
        setError(err.message || "Failed to load PDF page metadata");
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [documents]);

  const allPages: PdfPageInfo[] = documents.flatMap((doc) =>
    Array.from({ length: doc.numPages }, (_, i) => {
      const pageNumber = i + 1;
      const metadata = pageMetadata[`${doc.id}-${pageNumber}`];

      return {
        pdfId: doc.id,
        documentId: doc.id,
        pdfName: doc.name,
        pageNumber,
        document: doc.document,
        width: metadata?.width ?? null,
        height: metadata?.height ?? null,
        rotation: metadata?.rotation ?? null,
      };
    }),
  );

  return { documents, allPages, loadFromUrls, clearPdfs, isLoading, error };
}
