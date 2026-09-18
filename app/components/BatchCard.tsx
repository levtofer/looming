"use client";

import { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  AlertTriangle,
  Trash2,
  Check,
  Copy,
  Archive,
  AlertCircle,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import { getPublicUrl } from "@/lib/batches";
import { isImage, getFileGlyph, formatBytes } from "@/lib/fileDisplay";
import { downloadBatchAsZip } from "@/lib/zipDownload";

interface BatchCardProps {
  batch: Batch;
  isOwner?: boolean;
  onDeleteComplete?: () => void;
}

const OWNED_SLUGS_KEY = "looming_owned_slugs";

// Reusable Win95 border styling tokens =3
const inset =
  "border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff]";
const raised =
  "border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#ffffff] active:border-b-[#ffffff]";

// Mobile gets a taller tap target (min 36px, WCAG-ish), desktop keeps the
// original tight Win95 padding — bump on the smallest breakpoint only uwu~
const actionBtn = `px-2 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 ${raised}`;

function readOwnedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(OWNED_SLUGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("⚠️ owned_slugs in localStorage was corrupted, resetting >w<");
    localStorage.removeItem(OWNED_SLUGS_KEY);
    return [];
  }
}

function formatRemainingTime(ms: number): { label: string; urgency: number } {
  if (ms <= 0) return { label: "Expired ⏳", urgency: 1 };

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const maxWindow = 24 * 60 * 60 * 1000;
  const urgency = Math.min(1, Math.max(0, 1 - ms / maxWindow));

  if (totalMinutes < 5) {
    const s = totalSeconds % 60;
    return {
      label: `${totalMinutes}m ${s.toString().padStart(2, "0")}s`,
      urgency,
    };
  }

  if (totalHours < 1) {
    return {
      label: `${totalMinutes}m left`,
      urgency,
    };
  }

  if (totalDays < 1) {
    const m = totalMinutes % 60;
    return {
      label: `${totalHours}h ${m.toString().padStart(2, "0")}m`,
      urgency,
    };
  }

  const h = totalHours % 24;
  return {
    label: `${totalDays}d ${h}h left`,
    urgency: 0,
  };
}

export default function BatchCard({
  batch,
  isOwner = false,
  onDeleteComplete,
}: BatchCardProps) {
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState({
    label: "Calculating...",
    urgency: 0,
  });

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const targetTime = new Date(batch.expires_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = targetTime - now;
      setTimeLeftStr(formatRemainingTime(difference));
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [batch.expires_at]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const { label, urgency } = timeLeftStr;
  const isExpired = label.startsWith("Expired");
  const isUrgent = urgency > 0.7;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${batch.slug}`
      : `/${batch.slug}`;

  function flashError(message: string) {
    setActionError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setActionError(null), 4000);
  }

  async function handleCopyLink() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      flashError("couldn't copy — copy the link manually");
    }
  }

  async function handleZipDownload() {
    setZipping(true);
    try {
      await downloadBatchAsZip(batch.slug, batch.files);
    } catch (err) {
      console.error("Zip download failed:", err);
      flashError("zip download failed, try again");
    } finally {
      setZipping(false);
    }
  }

  async function handleDeleteThread() {
    if (!confirm("Are you sure you want to sever this thread permanently? (´W`)"))
      return;
    setDeleting(true);
    try {
      // 1. Collect all storage paths for this batch =3!
      const storagePaths = batch.files.map((file) => file.storage_path);

      // 2. Delete files from Supabase Storage bucket first (replace 'files' with your actual bucket name)
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("looming-files") // 👈 Replace with your actual bucket name if different!
          .remove(storagePaths);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
          flashError("thread deleted, but some files may remain in storage");
        }
      }

      // 3. Delete the batch row from the database >w<
      const { error: dbError } = await supabase
        .from("batches")
        .delete()
        .eq("slug", batch.slug);

      if (dbError) throw dbError;

      // 4. Clear local storage reference
      const currentSlugs = readOwnedSlugs();
      localStorage.setItem(
        OWNED_SLUGS_KEY,
        JSON.stringify(currentSlugs.filter((s) => s !== batch.slug)),
      );

      if (onDeleteComplete) onDeleteComplete();
    } catch (err) {
      flashError("failed to delete thread safely");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`bg-[#c0c0c0] ${raised} w-full font-mono text-xs text-black`}
      role="region"
      aria-label={`Batch ${batch.slug}`}
    >
      {/* Title bar strip */}
      <div
        className="px-2 py-1 flex items-center justify-between text-white font-bold select-none"
        style={{
          background: isExpired
            ? "#808080"
            : isUrgent
              ? "linear-gradient(to right, #a02c2c, #d9534f)"
              : "linear-gradient(to right, #000080, #1084d0)",
        }}
      >
        <span className="truncate flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5 inline-block shrink-0" />
          /{batch.slug}
        </span>
        {/* aria-live so screen readers pick up the expiry state changing
            without needing focus on it — matters most for the "expired"
            flip, which can happen while someone's mid-download qwq */}
        <span
          className="text-[10px] whitespace-nowrap ml-2 flex items-center gap-1"
          aria-live="polite"
        >
          {isExpired ? (
            <>
              <AlertTriangle className="w-3 h-3 inline-block shrink-0" />
              expired
            </>
          ) : (
            label
          )}
        </span>
      </div>

      <div className="p-3">
        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full justify-start overflow-x-auto no-scrollbar mb-3">
          {isOwner && (
            <button
              onClick={handleDeleteThread}
              disabled={deleting}
              style={{ touchAction: "manipulation" }}
              className={`${actionBtn} bg-[#c0c0c0] text-[#800000] font-bold disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5`}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              {deleting ? "shredding…" : "delete"}
            </button>
          )}
          <button
            onClick={handleCopyLink}
            disabled={isExpired}
            style={{ touchAction: "manipulation" }}
            className={`${actionBtn} bg-[#c0c0c0] text-black font-bold disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-green-700" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0" />
            )}
            {copied ? "copied" : "copy link"}
          </button>
          {batch.files.length > 1 && (
            <button
              onClick={handleZipDownload}
              disabled={zipping || isExpired}
              style={{ touchAction: "manipulation" }}
              className={`${actionBtn} bg-[#c0c0c0] text-[#000080] font-bold disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5`}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" />
              {zipping ? "zipping…" : "download all (.zip)"}
            </button>
          )}
        </div>

        {actionError && (
          <p
            className="text-[#800000] font-bold mb-3 -mt-1 flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {actionError}
          </p>
        )}

        {/* File grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 justify-start items-stretch">
          {batch.files.map((file) => (
            <FileTile key={file.id} file={file} disabled={isExpired} onError={flashError} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FileTile({
  file,
  disabled = false,
  onError,
}: {
  file: Batch["files"][number];
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  const url = getPublicUrl(file.storage_path);
  const showImage = isImage(file.mime_type);

  // Resolve icon using correct BatchFile property names =3!
  const FileIcon = getFileGlyph(file.mime_type, file.filename);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    if (disabled) return;

    // Try the lightweight path first: a plain anchor with `download` set.
    // No fetch, no blob held in memory — much friendlier to mobile data and
    // battery than pulling the whole file through JS first. Browsers only
    // honor `download` for same-origin (or CORS-permitted) URLs though, so
    // this can silently no-op cross-origin — that's what the fetch fallback
    // below still covers uwu~
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Direct download failed, falling back to fetch:", err);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (fallbackErr) {
        console.error("Fallback download failed:", fallbackErr);
        onError(`couldn't download ${file.filename} — try again`);
        window.open(url, "_blank");
      }
    }
  }

  return (
    <div
      className={`w-full flex flex-col gap-2 p-2 bg-[#c0c0c0] ${raised} justify-between`}
    >
      <div>
        <div
          className={`aspect-square w-full ${inset} bg-white flex items-center justify-center overflow-hidden mb-2 select-none`}
        >
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={file.filename}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <FileIcon className="w-8 h-8 text-[#000080]" />
          )}
        </div>

        <div className="min-w-0 px-0.5">
          <p
            className="font-medium break-all line-clamp-1 text-black"
            title={file.filename}
          >
            {file.filename}
          </p>
          <p className="text-[10px] text-[#404040] mt-0.5">
            {formatBytes(file.size)}
          </p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={disabled}
        style={{ touchAction: "manipulation" }}
        className={`w-full text-center ${actionBtn} bg-[#c0c0c0] text-black font-bold mt-1 disabled:opacity-40 flex items-center justify-center gap-1.5`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        download
      </button>
    </div>
  );
}