import { useEffect } from "react";
import { usePdfLoader } from "@/hooks/use-pdf";
import { PdfMap } from "@/components/pdf-map";
import preloadedPdfs from "@/pdf-registry";
import { FileText } from "lucide-react";

export default function Home() {
  const { allPages, documents, loadFromUrls, isLoading, error } = usePdfLoader();

  useEffect(() => {
    loadFromUrls(preloadedPdfs);
  }, [loadFromUrls]);

  if (isLoading || allPages.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-card p-5 shadow-sm ring-1 ring-border">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? "Loading documents…" : error ? "Failed to load" : "No documents"}
            </p>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-background">
      <PdfMap
        pages={allPages}
        documents={documents}
        fileCount={documents.length}
      />
    </div>
  );
}
