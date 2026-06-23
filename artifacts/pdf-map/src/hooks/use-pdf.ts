import { useState, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PreloadedPdf } from "@/pdf-registry";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export type PdfDocumentInfo = {
  id: string;
  name: string;
  document: pdfjsLib.PDFDocumentProxy;
  numPages: number;
};

export type PdfPageInfo = {
  pdfId: string;
  pdfName: string;
  pageNumber: number;
  document: pdfjsLib.PDFDocumentProxy;
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
  const loadingTasksRef = useRef<Set<DestroyablePdfLoadingTask>>(new Set());
  const loadGenerationRef = useRef(0);

  const cancelLoadingTasks = useCallback(() => {
    for (const task of loadingTasksRef.current) {
      void task.destroy();
    }
    loadingTasksRef.current.clear();
  }, []);

  const loadFromUrls = useCallback(async (pdfs: PreloadedPdf[]) => {
    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;
    cancelLoadingTasks();
    setIsLoading(true);
    setError(null);

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
  }, [cancelLoadingTasks]);

  const clearPdfs = useCallback(() => {
    loadGenerationRef.current += 1;
    cancelLoadingTasks();
    setDocuments((previousDocs) => {
      destroyDocuments(previousDocs);
      return [];
    });
    setIsLoading(false);
    setError(null);
  }, [cancelLoadingTasks]);

  const allPages: PdfPageInfo[] = documents.flatMap((doc) =>
    Array.from({ length: doc.numPages }, (_, i) => ({
      pdfId: doc.id,
      pdfName: doc.name,
      pageNumber: i + 1,
      document: doc.document,
    }))
  );

  return { documents, allPages, loadFromUrls, clearPdfs, isLoading, error };
}
