import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.tiff,.docx,.xlsx,.csv";

interface UploadCardProps {
  onFileSelected?: (file: File) => void;
}

export function UploadCard({ onFileSelected }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const selected = files?.[0];
      if (!selected) return;
      setFile(selected);
      onFileSelected?.(selected);
    },
    [onFileSelected]
  );

  return (
    <div
      id="upload"
      className={cn(
        "glass-panel-light w-full max-w-md rounded-3xl p-6 shadow-glass transition-colors sm:p-8",
        isDragging && "border-savings-400 bg-savings-50/40"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-mist-200 px-6 py-10 text-center transition-colors hover:border-trust-500 hover:bg-trust-500/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900/5">
            <UploadCloud className="h-6 w-6 text-ink-900" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-ink-900">
            Drag & drop your document
          </p>
          <p className="text-xs text-mist-500">
            or tap to browse — PDF, JPG, PNG, DOCX, XLSX
          </p>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-mist-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-trust-600" />
            <span className="truncate text-sm font-medium text-ink-900">
              {file.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="shrink-0 rounded-full p-1 text-mist-400 hover:bg-mist-100 hover:text-ink-900"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-mist-500">
        <Lock className="h-3 w-3 text-savings-500" />
        <span>Analyzed privately · automatically deleted · ~60 second audit</span>
      </div>
    </div>
  );
}
