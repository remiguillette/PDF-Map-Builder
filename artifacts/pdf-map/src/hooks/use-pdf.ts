import { useState, useCallback } from "react";
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

export function usePdfLoader() {
  const [documents, setDocuments] = useState<PdfDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromUrls = useCallback(async (pdfs: PreloadedPdf[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const newDocs: PdfDocumentInfo[] = [];
      for (const pdf of pdfs) {
        const response = await fetch(pdf.path);
        if (!response.ok) throw new Error(`Failed to fetch ${pdf.name}: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const document = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        newDocs.push({
          id: pdf.id,
          name: pdf.name,
          document,
          numPages: document.numPages,
        });
      }
      setDocuments(newDocs);
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

  return { documents, allPages, loadFromUrls, clearPdfs, isLoading, error };
}
