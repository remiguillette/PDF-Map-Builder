import { useCallback, useEffect, useState } from "react";
import { RotateCcw, FileText } from "lucide-react";
import { usePdfLoader } from "@/hooks/use-pdf";
import { PdfMap } from "@/components/pdf-map";
import { PdfUploader } from "@/components/pdf-uploader";
import { Button } from "@/components/ui/button";
import preloadedPdfs from "@/pdf-registry";

export default function Home() {
  const { allPages, documents, loadFromUrls, loadFromFiles, isLoading, error } =
    usePdfLoader();
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    loadFromUrls(preloadedPdfs);
  }, [loadFromUrls]);

  const handleUpload = useCallback(
    (files: File[]) => {
      setIsReplacing(false);
      void loadFromFiles(files);
    },
    [loadFromFiles],
  );

  const hasLoadedDocuments = documents.length > 0;
  const shouldShowUploader = !hasLoadedDocuments || isReplacing;

  if (shouldShowUploader) {
    return (
      <div className="relative h-screen w-full bg-background">
        {isReplacing && hasLoadedDocuments && (
          <Button
            type="button"
            variant="outline"
            className="fixed right-6 top-6 z-10"
            onClick={() => setIsReplacing(false)}
          >
            Keep current PDFs
          </Button>
        )}
        <PdfUploader onUpload={handleUpload} isLoading={isLoading} />
        {error && (
          <p className="fixed bottom-6 left-1/2 max-w-xl -translate-x-1/2 rounded-md border border-destructive/30 bg-card px-4 py-2 text-center text-sm text-destructive shadow-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (isLoading || allPages.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-card p-5 shadow-sm ring-1 ring-border">
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isLoading
                ? "Loading documents…"
                : error
                  ? "Failed to load"
                  : "No documents"}
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-background">
      <Button
        type="button"
        variant="outline"
        className="fixed right-6 top-6 z-50 gap-2 bg-card/80 backdrop-blur-md"
        onClick={() => setIsReplacing(true)}
      >
        <RotateCcw className="h-4 w-4" />
        Replace PDFs
      </Button>
      <PdfMap
        pages={allPages}
        documents={documents}
        fileCount={documents.length}
      />
    </div>
  );
}
