import { useRef } from "react";
import { usePdfLoader } from "@/hooks/use-pdf";
import { PdfUploader } from "@/components/pdf-uploader";
import { PdfMap } from "@/components/pdf-map";

export default function Home() {
  const { allPages, documents, loadPdfs, isLoading } = usePdfLoader();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const files = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      loadPdfs(files);
    }
  };

  if (allPages.length === 0) {
    return <PdfUploader onUpload={loadPdfs} isLoading={isLoading} />;
  }

  return (
    <div className="relative h-screen w-full bg-background">
      <PdfMap
        pages={allPages}
        documents={documents}
        fileCount={documents.length}
        onUploadClick={handleUploadClick}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
