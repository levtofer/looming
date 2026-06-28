"use client";

import { getFileGlyph, formatBytes } from '@/lib/fileDisplay'
import { useState, useRef, useCallback } from "react";
import {
  uploadBatch,
  getOversizedFiles,
  exceedsSoftWarning,
} from "@/lib/upload";

interface UploadFormProps {
  onUploadComplete: (slug: string) => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [expiryDays, setExpiryDays] = useState(1);
  const [customSlug, setCustomSlug] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setStagedFiles((prev) => [...prev, ...Array.from(newFiles)]);
    setError(null);
  }, []);

  function removeFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    setError(null);

    if (stagedFiles.length === 0) {
      setError("Add at least one file first.");
      return;
    }

    const oversized = getOversizedFiles(stagedFiles);
    if (oversized.length > 0) {
      setError(`Too big (50MB max): ${oversized.join(", ")}`);
      return;
    }

    if (exceedsSoftWarning(stagedFiles)) {
      setSnackbar(
        "Heads up — this batch is over 200MB total. Uploading anyway…",
      );
      setTimeout(() => setSnackbar(null), 4000);
    }

    setIsUploading(true);
    try {
      const result = await uploadBatch(
        stagedFiles,
        expiryDays,
        customSlug.trim() || null,
      );
      setStagedFiles([]);
      setCustomSlug("");
      onUploadComplete(result.slug);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed, try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative">
      {/* Hidden file input used by both layouts */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
      {/* 🔄 THE TOGGLE MAGIC SWITCH: Show dropzone ONLY if 0 files are staged! uwu~ */}
      {stagedFiles.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors"
          style={{
            borderColor: isDragging ? "#6C7BFF" : "#2A2C35",
            background: isDragging ? "rgba(108,123,255,0.06)" : "transparent",
          }}
        >
          <p className="text-[#EDEAE3] font-medium">
            Drop files here, or click to browse
          </p>
          <p className="text-sm text-[#8A8D98] mt-1">Up to 50MB per file</p>
        </div>
      ) : (
        /* Show the list layout instead when files count > 0! */
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between border-b border-[#2A2C35] pb-2 mb-2">
            <h3 className="text-xs font-mono uppercase text-[#8A8D98]">
              Staged Files ({stagedFiles.length})
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-mono px-2 py-1 rounded-md bg-[#23242C] text-[#6C7BFF] hover:bg-[#2A2C35] transition-colors"
            >
              + Add Files
            </button>
          </div>

          {/* 💻 THE PREVIEW MATRIX: Columns stack/stretch on mobile, grids up on desktop! uwu~ */}
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 justify-start items-stretch">
            {stagedFiles.map((file, i) => {
              // 🔮 Detect type and build a temporary url for image tags
              const isImg = file.type.startsWith("image/");
              const localUrl = isImg ? URL.createObjectURL(file) : "";

              return (
                <div
                  key={i}
                  className="w-full sm:w-auto flex flex-col gap-2 p-3 rounded-md bg-[#14151A] border border-[#2A2C35] justify-between transition-transform duration-200"
                >
                  <div>
                    {/* 📷 Square image preview frame box */}
                    <div className="aspect-square w-full rounded-md bg-[#1B1C22] flex items-center justify-center overflow-hidden mb-2 select-none">
                      {isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={localUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onLoad={() => isImg && URL.revokeObjectURL(localUrl)} // Clean memory cache up after load! =3
                        />
                      ) : (
                        <span className="text-3xl text-[#6C7BFF]">
                          {/* Fallback to your file system icon type helpers */}
                          {getFileGlyph?.(file.type, file.name) || "📄"}
                        </span>
                      )}
                    </div>

                    {/* Title Metadata info lines */}
                    <div className="min-w-0 px-0.5">
                      <p
                        className="text-xs text-[#EDEAE3] font-medium break-all line-clamp-1"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px] font-mono text-[#8A8D98] mt-0.5">
                        {formatBytes?.(file.size) ||
                          `${(file.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>

                  {/* Remove action deck trigger line */}
                  <button
                    onClick={() => removeFile(i)}
                    className="w-full text-xs font-mono text-center py-2 rounded-md bg-[#23242C] text-[#FF9F4A] border border-[#FF9F4A]/10 active:bg-[#2A2C35] transition-colors mt-1"
                  >
                    remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Settings Panel & Submit Actions (Only accessible when there are files!) */}
      {stagedFiles.length > 0 && (
        <div className="mt-5 flex flex-col gap-4 border-t border-[#2A2C35] pt-4 animate-fadeIn">
          {/* Responsive input cluster block */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <div>
              <label className="block text-xs font-mono text-[#8A8D98] mb-1">
                expires in
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full bg-[#1B1C22] border border-[#2A2C35] text-[#EDEAE3] text-sm rounded-md px-3 py-2.5 outline-none focus:border-[#6C7BFF]"
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {d} day{d > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-[#8A8D98] mb-1">
                custom slug (optional)
              </label>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="min 5 letters"
                className="w-full bg-[#1B1C22] border border-[#2A2C35] text-[#EDEAE3] text-sm rounded-md px-3 py-2.5 placeholder:text-[#8A8D98] outline-none focus:border-[#6C7BFF]"
              />
            </div>
          </div>

          {/* Big beefy submit button for mobile phones */}
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full sm:w-auto sm:self-end px-6 py-2.5 rounded-md bg-[#6C7BFF] text-[#14151A] font-semibold text-sm hover:opacity-90 active:opacity-75 disabled:opacity-50 transition-opacity"
          >
            {isUploading ? "uploading…" : "upload thread"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-[#FF9F4A] font-mono">{error}</p>
      )}
      {snackbar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-md bg-[#23242C] border border-[#2A2C35] text-sm text-[#EDEAE3] shadow-lg z-50">
          {snackbar}
        </div>
      )}
    </div>
  );
}
