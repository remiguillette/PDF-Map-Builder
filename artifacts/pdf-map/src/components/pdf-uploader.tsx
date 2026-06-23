import { useCallback, useState } from "react";
import { UploadCloud, FileType } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfUploaderProps {
  onUpload: (files: File[]) => void;
  isLoading?: boolean;
}

export function PdfUploader({ onUpload, isLoading }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      if (selectedFiles.length === 0) {
        setMessage("Select at least one PDF file to upload.");
        return;
      }

      const acceptedFiles = selectedFiles.filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"),
      );
      const rejectedCount = selectedFiles.length - acceptedFiles.length;

      if (acceptedFiles.length === 0) {
        setMessage(
          rejectedCount === 1
            ? "That file is not a PDF. Please choose a PDF file."
            : "None of those files are PDFs. Please choose PDF files.",
        );
        return;
      }

      setMessage(
        rejectedCount > 0
          ? `${rejectedCount} non-PDF ${
              rejectedCount === 1 ? "file was" : "files were"
            } skipped.`
          : null,
      );
      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(Array.from(e.target.files ?? []));
      e.target.value = "";
    },
    [handleFiles],
  );

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-6">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative flex h-[400px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-card/80",
        )}
      >
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-background p-4 shadow-sm ring-1 ring-border group-hover:ring-primary/50 transition-all">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <UploadCloud className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-medium tracking-tight text-foreground">
              {isLoading ? "Processing documents..." : "Upload PDFs"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your PDF files here, or click to browse
            </p>
            {message && (
              <p className="text-sm font-medium text-destructive">{message}</p>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-background/50 px-3 py-1.5 rounded-md">
            <FileType className="h-4 w-4" />
            <span>Supports multiple files</span>
          </div>
        </div>
      </label>
    </div>
  );
}
