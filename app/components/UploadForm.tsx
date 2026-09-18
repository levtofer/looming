"use client";

import { getFileGlyph, formatBytes } from "@/lib/fileDisplay";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FolderPlus,
  Plus,
  AlertTriangle,
  Loader2,
  Upload,
  FileText,
  Clipboard,
} from "lucide-react";
import {
  uploadBatch,
  getOversizedFiles,
  exceedsSoftWarning,
} from "@/lib/upload";

export interface UploadFormRef {
  addFiles: (files: FileList | File[]) => void;
  openPicker: () => void;
}

interface UploadFormProps {
  onUploadComplete: (slug: string) => void;
}

interface StagedFile {
  id: string;
  file: File;
}

const MIN_SLUG_LENGTH = 5;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getFilesFromClipboard(e: ClipboardEvent): Promise<File[]> {
  const files: File[] = [];
  const items = e.clipboardData?.items;
  if (!items) return files;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const blob = item.getAsFile();
      if (!blob) continue;

      const isImg = blob.type.startsWith("image/");
      const needsName =
        !blob.name || blob.name === "image.png" || blob.name === "blob";

      if (isImg && needsName) {
        const ext = blob.type.split("/")[1] || "png";
        const renamedFile = new File(
          [blob],
          `pasted-image-${Date.now()}.${ext}`,
          {
            type: blob.type,
            lastModified: Date.now(),
          }
        );
        files.push(renamedFile);
      } else {
        files.push(blob);
      }
    }
  }

  return files;
}

const inset =
  "border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff]";
const raised =
  "border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#ffffff] active:border-b-[#ffffff]";

const UploadForm = forwardRef<UploadFormRef, UploadFormProps>(
  ({ onUploadComplete }, ref) => {
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
    const [expiryDays, setExpiryDays] = useState(1);
    const [customSlug, setCustomSlug] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    const addFiles = useCallback((newFiles: FileList | File[]) => {
      const wrapped = Array.from(newFiles).map((file) => ({
        id: makeId(),
        file,
      }));
      setStagedFiles((prev) => [...prev, ...wrapped]);
      setError(null);
    }, []);

    const openFilePicker = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    // Expose methods to parent ref (page.tsx) >w<
    useImperativeHandle(
      ref,
      () => ({
        addFiles,
        openPicker: openFilePicker,
      }),
      [addFiles, openFilePicker]
    );

    const removeFile = useCallback((id: string) => {
      setStagedFiles((prev) => prev.filter((sf) => sf.id !== id));
    }, []);

    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

    useEffect(() => {
      const currentIds = new Set(stagedFiles.map((sf) => sf.id));

      setImageUrls((prev) => {
        const next = { ...prev };
        let changed = false;

        for (const sf of stagedFiles) {
          if (!next[sf.id] && sf.file.type.startsWith("image/")) {
            next[sf.id] = URL.createObjectURL(sf.file);
            changed = true;
          }
        }

        for (const id of Object.keys(next)) {
          if (!currentIds.has(id)) {
            URL.revokeObjectURL(next[id]);
            delete next[id];
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, [stagedFiles]);

    useEffect(() => {
      return () => {
        Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
      };
    }, []);

    useEffect(() => {
      return () => {
        if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      };
    }, []);

    function showSnackbar(message: string) {
      setSnackbar(message);
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = setTimeout(() => setSnackbar(null), 4000);
    }

    // Handle Clipboard Paste Event
    useEffect(() => {
      async function handlePaste(e: ClipboardEvent) {
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            (active as HTMLElement).isContentEditable)
        ) {
          return;
        }

        const pastedFiles = await getFilesFromClipboard(e);
        if (pastedFiles.length > 0) {
          e.preventDefault();
          addFiles(pastedFiles);
          showSnackbar(`Pasted ${pastedFiles.length} file(s)! =3`);
        }
      }

      window.addEventListener("paste", handlePaste);
      return () => {
        window.removeEventListener("paste", handlePaste);
      };
    }, [addFiles]);

    function handleDrop(e: React.DragEvent) {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    }

    function handleDropzoneKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFilePicker();
      }
    }

    const slugError = useMemo(() => {
      const trimmed = customSlug.trim();
      if (trimmed.length === 0) return null;
      if (trimmed.length < MIN_SLUG_LENGTH) {
        return `slug needs at least ${MIN_SLUG_LENGTH} letters`;
      }
      if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
        return "slug can only use letters, numbers, and dashes";
      }
      return null;
    }, [customSlug]);

    async function handleSubmit() {
      setError(null);

      if (stagedFiles.length === 0) {
        setError("Add at least one file first.");
        return;
      }

      if (slugError) {
        setError(slugError);
        return;
      }

      const rawFiles = stagedFiles.map((sf) => sf.file);

      const oversized = getOversizedFiles(rawFiles);
      if (oversized.length > 0) {
        setError(`Too big (50MB max): ${oversized.join(", ")}`);
        return;
      }

      if (exceedsSoftWarning(rawFiles)) {
        showSnackbar(
          "Heads up — this batch is over 200MB total. Uploading anyway…",
        );
      }

      setIsUploading(true);
      try {
        const result = await uploadBatch(
          rawFiles,
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
      <div className="relative font-mono text-xs text-black">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {stagedFiles.length === 0 ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop files here, paste from clipboard, or press enter to browse"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={openFilePicker}
            onKeyDown={handleDropzoneKeyDown}
            className={`cursor-pointer ${inset} p-8 text-center select-none focus:outline focus:outline-1 focus:outline-dotted focus:outline-black`}
            style={{
              background: isDragging ? "#000080" : "#ffffff",
              color: isDragging ? "#ffffff" : "#000000",
            }}
          >
            <p className="font-bold flex items-center justify-center gap-1.5">
              <FolderPlus className="w-4 h-4 inline-block text-[#FFA800] shrink-0" />
              Drop files here, paste (Ctrl+V), or click to browse
            </p>
            <p className="text-[10px] mt-1 text-[#404040]">
              {isDragging ? "release to drop! =3" : "Up to 50MB per file"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between border-b-2 border-dotted border-[#808080] pb-1 mb-1">
              <h3 className="font-bold text-[#000080] uppercase tracking-wider">
                Staged Files ({stagedFiles.length})
              </h3>
              <button
                onClick={openFilePicker}
                className={`${raised} bg-[#c0c0c0] px-2 py-0.5 text-black font-bold flex items-center gap-1`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-green-700" /> Add Files
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 justify-start items-stretch">
              {stagedFiles.map(({ id, file }) => {
                const isImg = file.type.startsWith("image/");
                const localUrl = imageUrls[id];

                return (
                  <div
                    key={id}
                    className={`w-full sm:w-auto flex flex-col gap-2 p-2 bg-[#c0c0c0] ${raised} justify-between`}
                  >
                    <div>
                      <div
                        className={`aspect-square w-full ${inset} bg-white flex items-center justify-center overflow-hidden mb-2 select-none`}
                      >
                        {isImg && localUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={localUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-[#000080]" />
                        )}
                      </div>

                      <div className="min-w-0 px-0.5">
                        <p
                          className="font-medium break-all line-clamp-1 text-black"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[#404040] mt-0.5">
                          {formatBytes?.(file.size) ||
                            `${(file.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFile(id)}
                      className={`w-full text-center py-1 ${raised} bg-[#c0c0c0] text-[#800000] font-bold mt-1`}
                    >
                      remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stagedFiles.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t-2 border-dotted border-[#808080] pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <div>
                <label className="block font-bold text-[#000080] mb-1">
                  expires in
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className={`w-full bg-white ${inset} text-black px-2 py-1.5 outline-none`}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d} day{d > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#000080] mb-1">
                  custom slug (optional)
                </label>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="min 5 letters"
                  className={`w-full bg-white ${inset} text-black px-2 py-1.5 placeholder:text-[#808080] outline-none`}
                />
                {slugError && (
                  <p className="text-[10px] text-[#800000] font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#800000]" />{" "}
                    {slugError}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isUploading || !!slugError}
              className={`w-full sm:w-auto sm:self-end px-5 py-1.5 ${raised} bg-[#c0c0c0] text-black font-bold disabled:opacity-50 flex items-center justify-center gap-1.5`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />{" "}
                  uploading…
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 shrink-0 text-[#000080]" />{" "}
                  upload thread
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-[#800000] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#800000]" />{" "}
            {error}
          </p>
        )}

        {snackbar && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#c0c0c0] ${raised} text-black shadow-[3px_3px_0px_#000000] z-50`}
          >
            {snackbar}
          </div>
        )}
      </div>
    );
  }
);

UploadForm.displayName = "UploadForm";

export default UploadForm;