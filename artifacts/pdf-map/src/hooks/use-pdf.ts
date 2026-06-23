import { useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

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

async function createStablePdfId(file: File, arrayBuffer: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const contentHash = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${file.name}-${file.size}-${file.lastModified}-${contentHash}`;
}

export function usePdfLoader() {
  const [documents, setDocuments] = useState<PdfDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdfs = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const newDocs: PdfDocumentInfo[] = [];
      for (const file of files) {
        if (file.type !== "application/pdf") continue;
        const arrayBuffer = await file.arrayBuffer();
        const id = await createStablePdfId(file, arrayBuffer);
        const document = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        newDocs.push({
          id,
          name: file.name,
          document,
          numPages: document.numPages,
        });
      }
      setDocuments((prev) => [...prev, ...newDocs]);
    } catch (err: any) {
      setError(err.message || "Failed to load PDFs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPdfs = useCallback(() => {
    setDocuments([]);
  }, []);

  const allPages: PdfPageInfo[] = documents.flatMap((doc) =>
    Array.from({ length: doc.numPages }, (_, i) => ({
      pdfId: doc.id,
      pdfName: doc.name,
      pageNumber: i + 1,
      document: doc.document,
    }))
  );

  return { documents, allPages, loadPdfs, clearPdfs, isLoading, error };
}
